"""Add indexes on foreign keys and unique constraint on documents.conversation_id

Revision ID: 002_add_indexes
Revises: 001_initial
Create Date: 2026-03-20 00:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "002_add_indexes"
down_revision: str | None = "001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"])
    op.create_index("ix_documents_conversation_id", "documents", ["conversation_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_documents_conversation_id", table_name="documents")
    op.drop_index("ix_messages_conversation_id", table_name="messages")
