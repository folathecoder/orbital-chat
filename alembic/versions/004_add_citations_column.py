"""Add citations JSON column to messages table

Revision ID: 004_add_citations
Revises: 003_multi_document
Create Date: 2026-03-20 00:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "004_add_citations"
down_revision: str | None = "003_multi_document"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("citations", sa.JSON(), nullable=True, server_default="[]"))


def downgrade() -> None:
    op.drop_column("messages", "citations")
