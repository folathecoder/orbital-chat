from __future__ import annotations

import json
from collections.abc import AsyncIterator
from datetime import datetime

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from takehome.db.models import Message
from takehome.db.session import get_session
from takehome.services.conversation import get_conversation, update_conversation
from takehome.services.document import get_documents_for_conversation
from takehome.services.llm import chat_with_documents, count_sources_cited, generate_suggestions, generate_title, parse_citations

logger = structlog.get_logger()

router = APIRouter(tags=["messages"])


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    sources_cited: int
    citations: list[dict] = []
    feedback: str | None = None
    feedback_comment: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=50000)


class FeedbackUpdate(BaseModel):
    feedback: str | None = Field(None, pattern=r"^(up|down)$")
    comment: str | None = Field(None, max_length=2000)


@router.get(
    "/api/conversations/{conversation_id}/messages",
    response_model=list[MessageOut],
)
async def list_messages(
    conversation_id: str,
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
) -> list[MessageOut]:
    """List messages in a conversation, ordered by creation time."""
    conversation = await get_conversation(session, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(stmt)
    messages = list(result.scalars().all())

    return [
        MessageOut(
            id=m.id,
            conversation_id=m.conversation_id,
            role=m.role,
            content=m.content,
            sources_cited=m.sources_cited,
            citations=m.citations or [],
            feedback=m.feedback,
            feedback_comment=m.feedback_comment,
            created_at=m.created_at,
        )
        for m in messages
    ]


@router.post("/api/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    body: MessageCreate,
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    """Send a user message and stream back the AI response via SSE."""
    conversation = await get_conversation(session, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=body.content,
    )
    session.add(user_message)
    conversation.updated_at = func.now()
    await session.commit()
    await session.refresh(user_message)

    logger.info("User message saved", conversation_id=conversation_id, message_id=user_message.id)

    # Load all documents for the conversation and build combined context
    documents = await get_documents_for_conversation(session, conversation_id)
    document_text: str | None = None
    if documents:
        doc_parts: list[str] = []
        for doc in documents:
            if doc.extracted_text:
                doc_parts.append(
                    f'<document filename="{doc.filename}">\n{doc.extracted_text}\n</document>'
                )
        if doc_parts:
            document_text = "<documents>\n" + "\n\n".join(doc_parts) + "\n</documents>"

    # Load conversation history
    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .where(Message.id != user_message.id)
        .order_by(Message.created_at.asc())
    )
    result = await session.execute(stmt)
    history_messages = list(result.scalars().all())

    conversation_history: list[dict[str, str]] = [
        {"role": m.role, "content": m.content} for m in history_messages
    ]

    user_msg_count = sum(1 for m in history_messages if m.role == "user")
    is_first_message = user_msg_count == 0

    async def event_stream() -> AsyncIterator[str]:
        full_response = ""

        try:
            async for chunk in chat_with_documents(
                user_message=body.content,
                document_text=document_text,
                conversation_history=conversation_history,
            ):
                full_response += chunk
                event_data = json.dumps({"type": "content", "content": chunk})
                yield f"data: {event_data}\n\n"

        except Exception:
            logger.exception(
                "Error during LLM streaming",
                conversation_id=conversation_id,
            )
            error_msg = "I'm sorry, an error occurred while generating a response. Please try again."
            full_response = error_msg
            event_data = json.dumps({"type": "content", "content": error_msg})
            yield f"data: {event_data}\n\n"

        clean_content, citations = parse_citations(full_response, documents)
        sources = count_sources_cited(clean_content)

        from takehome.db.session import async_session as session_factory

        async with session_factory() as save_session:
            assistant_message = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=clean_content,
                sources_cited=sources,
                citations=citations,
            )
            save_session.add(assistant_message)
            await save_session.commit()
            await save_session.refresh(assistant_message)

            if is_first_message:
                try:
                    title = await generate_title(body.content)
                    await update_conversation(save_session, conversation_id, title)
                    logger.info(
                        "Auto-generated conversation title",
                        conversation_id=conversation_id,
                        title=title,
                    )
                except Exception:
                    logger.exception(
                        "Failed to generate title",
                        conversation_id=conversation_id,
                    )

            message_data = json.dumps(
                {
                    "type": "message",
                    "message": {
                        "id": assistant_message.id,
                        "conversation_id": assistant_message.conversation_id,
                        "role": assistant_message.role,
                        "content": assistant_message.content,
                        "sources_cited": assistant_message.sources_cited,
                        "citations": assistant_message.citations or [],
                        "created_at": assistant_message.created_at.isoformat(),
                    },
                }
            )
            yield f"data: {message_data}\n\n"

            done_data = json.dumps(
                {
                    "type": "done",
                    "sources_cited": sources,
                    "message_id": assistant_message.id,
                }
            )
            yield f"data: {done_data}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.patch("/api/messages/{message_id}/feedback", response_model=MessageOut)
async def update_feedback(
    message_id: str,
    body: FeedbackUpdate,
    session: AsyncSession = Depends(get_session),
) -> MessageOut:
    """Update feedback on a message."""
    stmt = select(Message).where(Message.id == message_id)
    result = await session.execute(stmt)
    message = result.scalar_one_or_none()
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")

    message.feedback = body.feedback
    if body.feedback == "down" and body.comment:
        message.feedback_comment = body.comment
    elif body.feedback != "down":
        message.feedback_comment = None

    await session.commit()
    await session.refresh(message)

    return MessageOut(
        id=message.id,
        conversation_id=message.conversation_id,
        role=message.role,
        content=message.content,
        sources_cited=message.sources_cited,
        citations=message.citations or [],
        feedback=message.feedback,
        feedback_comment=message.feedback_comment,
        created_at=message.created_at,
    )


@router.post("/api/conversations/{conversation_id}/suggestions")
async def get_suggestions(
    conversation_id: str,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Generate suggested prompts based on uploaded documents."""
    conversation = await get_conversation(session, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    documents = await get_documents_for_conversation(session, conversation_id)
    suggestions = await generate_suggestions(documents)
    return {"suggestions": suggestions}
