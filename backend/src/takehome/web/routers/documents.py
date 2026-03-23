from __future__ import annotations

import os
from datetime import datetime

import structlog
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import FileResponse

from takehome.config import settings
from takehome.db.session import get_session
from takehome.services.conversation import get_conversation
from takehome.services.document import (
    delete_document,
    get_document,
    get_documents_for_conversation,
    upload_document,
)

logger = structlog.get_logger()

router = APIRouter(tags=["documents"])


class DocumentOut(BaseModel):
    id: str
    conversation_id: str
    filename: str
    page_count: int
    has_text: bool
    uploaded_at: datetime

    model_config = {"from_attributes": True}


@router.post(
    "/api/conversations/{conversation_id}/documents",
    response_model=DocumentOut,
    status_code=201,
)
async def upload_document_endpoint(
    conversation_id: str,
    file: UploadFile,
    session: AsyncSession = Depends(get_session),
) -> DocumentOut:
    """Upload a PDF document to a conversation."""
    conversation = await get_conversation(session, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    try:
        document = await upload_document(session, conversation_id, file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    logger.info(
        "Document uploaded",
        conversation_id=conversation_id,
        document_id=document.id,
        filename=document.filename,
    )

    return DocumentOut(
        id=document.id,
        conversation_id=document.conversation_id,
        filename=document.filename,
        page_count=document.page_count,
        has_text=document.extracted_text is not None and len(document.extracted_text) > 0,
        uploaded_at=document.uploaded_at,
    )


@router.get(
    "/api/conversations/{conversation_id}/documents",
    response_model=list[DocumentOut],
)
async def list_documents_endpoint(
    conversation_id: str,
    session: AsyncSession = Depends(get_session),
) -> list[DocumentOut]:
    """List all documents for a conversation."""
    conversation = await get_conversation(session, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    documents = await get_documents_for_conversation(session, conversation_id)
    return [
        DocumentOut(
            id=doc.id,
            conversation_id=doc.conversation_id,
            filename=doc.filename,
            page_count=doc.page_count,
            has_text=doc.extracted_text is not None and len(doc.extracted_text) > 0,
            uploaded_at=doc.uploaded_at,
        )
        for doc in documents
    ]


@router.delete("/api/documents/{document_id}", status_code=204)
async def delete_document_endpoint(
    document_id: str,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete a document and its file from disk."""
    deleted = await delete_document(session, document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")


@router.get("/api/documents/{document_id}/content")
async def serve_document_file(
    document_id: str,
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Serve the raw PDF file for download/viewing."""
    document = await get_document(session, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    uploads_dir = os.path.realpath(settings.upload_dir)
    real_path = os.path.realpath(document.file_path)
    if not real_path.startswith(uploads_dir + os.sep):
        raise HTTPException(status_code=403, detail="Access denied")

    if not os.path.exists(real_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=real_path,
        filename=document.filename,
        media_type="application/pdf",
    )
