from __future__ import annotations

import json
import re
from collections.abc import AsyncIterator

import structlog
from pydantic_ai import Agent

from takehome.config import settings  # noqa: F401 — triggers ANTHROPIC_API_KEY export

agent = Agent(
    "anthropic:claude-haiku-4-5-20251001",
    system_prompt=(
        "You are a helpful legal document assistant for commercial real estate lawyers. "
        "You help lawyers review and understand documents during due diligence.\n\n"
        "IMPORTANT INSTRUCTIONS:\n"
        "- Answer questions based on the document content provided.\n"
        "- When multiple documents are provided, clearly state which document you are referencing.\n"
        "- If the answer is not in the documents, say so clearly. Do not fabricate information.\n"
        "- Be concise and precise. Lawyers value accuracy over verbosity."
    ),
)

CITATION_INSTRUCTION = """
You MUST ground every factual claim in the uploaded documents.

For every factual statement, place a citation marker immediately after the claim: [^1] where the number is sequential starting from 1.

At the END of your entire response, include a Sources section in this exact format:

---SOURCES---
[^1] {document_name} | Page {page_number} | "{exact verbatim quoted text, max 40 words}"
[^2] {document_name} | Page {page_number} | "{exact verbatim quoted text}"
---END SOURCES---

Rules:
- Quoted text must be VERBATIM from the document. Do not paraphrase.
- page_number must be an integer matching the --- Page N --- markers in the document text.
- document_name must exactly match one of the document filenames provided.
- If a claim cannot be supported by a document, omit the claim entirely.
- If no documents are loaded, do not include a sources section.
"""


async def generate_title(user_message: str) -> str:
    """Generate a 3-5 word conversation title from the first user message."""
    result = await agent.run(
        f"Generate a concise 3-5 word title for a conversation that starts with: '{user_message}'. "
        "Return only the title, nothing else."
    )
    title = str(result.output).strip().strip('"').strip("'")
    if len(title) > 100:
        title = title[:97] + "..."
    return title


logger = structlog.get_logger()


async def generate_suggestions(documents: list) -> list[str]:
    """Generate suggested prompts based on uploaded documents."""
    if not documents:
        return []

    doc_parts: list[str] = []
    for doc in documents:
        if doc.extracted_text:
            doc_parts.append(
                f'<document filename="{doc.filename}">\n{doc.extracted_text}\n</document>'
            )

    if not doc_parts:
        return []

    context = "<documents>\n" + "\n\n".join(doc_parts) + "\n</documents>"

    try:
        result = await agent.run(
            f"Read these documents and suggest exactly 4 short action prompts a user would type.\n\n"
            f"{context}\n\n"
            "Rules:\n"
            "- Each prompt must be under 10 words\n"
            "- Use natural conversational language like: 'Summarise this lease', 'What are the key risks?', 'Compare the rent terms'\n"
            "- Be specific to the document types (e.g. mention 'lease', 'title report', 'assessment') but don't quote text\n"
            "- Make them actionable — things a user would actually type\n"
            "Return ONLY a JSON array of 4 strings. No markdown code blocks."
        )
        raw = str(result.output).strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        suggestions = json.loads(raw)
        if isinstance(suggestions, list):
            return [str(s) for s in suggestions[:4]]
    except Exception:
        logger.exception("Failed to generate suggestions")

    return []


async def chat_with_documents(
    user_message: str,
    document_text: str | None,
    conversation_history: list[dict[str, str]],
) -> AsyncIterator[str]:
    """Stream a response, yielding text chunks."""
    prompt_parts: list[str] = []

    if document_text:
        prompt_parts.append(
            "The following are the documents being discussed:\n\n" f"{document_text}\n"
        )
        prompt_parts.append(CITATION_INSTRUCTION)
    else:
        prompt_parts.append(
            "No documents have been uploaded yet. If the user asks about a document, "
            "let them know they need to upload one first.\n"
        )

    if conversation_history:
        prompt_parts.append("Previous conversation:\n")
        for msg in conversation_history:
            role = msg["role"]
            content = msg["content"]
            if role == "user":
                prompt_parts.append(f"User: {content}\n")
            elif role == "assistant":
                prompt_parts.append(f"Assistant: {content}\n")
        prompt_parts.append("\n")

    prompt_parts.append(f"User: {user_message}")

    full_prompt = "\n".join(prompt_parts)

    async with agent.run_stream(full_prompt) as result:
        async for text in result.stream_text(delta=True):
            yield text


def parse_citations(raw_response: str, documents: list) -> tuple[str, list[dict]]:
    """Parse citation markers and sources block from LLM response.

    Returns (clean_content, citations) where clean_content has the
    ---SOURCES--- block stripped and citations is a list of structured dicts.
    """
    citations: list[dict] = []
    parts = raw_response.split("---SOURCES---")
    clean_content = parts[0].strip()

    if len(parts) < 2:
        clean_content = re.sub(r"\[\^\d+\]", "", clean_content)
        return clean_content, citations

    sources_block = parts[1].split("---END SOURCES---")[0].strip()
    pattern = re.compile(
        r'\[\^(\d+)\]\s+(.+?)\s+\|\s+Page\s+(\d+)\s+\|\s+"(.+?)"',
        re.DOTALL,
    )

    doc_lookup = {doc.filename: doc for doc in documents}

    for match in pattern.finditer(sources_block):
        idx, doc_name, page_num, quoted_text = match.groups()
        doc_name = doc_name.strip()
        doc = doc_lookup.get(doc_name)
        citations.append(
            {
                "citation_index": int(idx),
                "document_id": str(doc.id) if doc else None,
                "document_name": doc_name,
                "page_number": int(page_num),
                "quoted_text": quoted_text.strip(),
            }
        )

    if not citations:
        clean_content = re.sub(r"\[\^\d+\]", "", clean_content)

    return clean_content, citations


def count_sources_cited(response: str) -> int:
    """Count citation markers [^N] in the response."""
    return len(re.findall(r"\[\^\d+\]", response))
