"""Drop unique constraint on documents.conversation_id to support multi-document conversations

Revision ID: 003_multi_document
Revises: 002_add_indexes
Create Date: 2026-03-20 00:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "003_multi_document"
down_revision: str | None = "002_add_indexes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index("ix_documents_conversation_id", table_name="documents")
    op.create_index("ix_documents_conversation_id", "documents", ["conversation_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_documents_conversation_id", table_name="documents")
    op.create_index("ix_documents_conversation_id", "documents", ["conversation_id"], unique=True)
