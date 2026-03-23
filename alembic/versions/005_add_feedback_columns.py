"""Add feedback and feedback_comment columns to messages table

Revision ID: 005_add_feedback
Revises: 004_add_citations
Create Date: 2026-03-21 00:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "005_add_feedback"
down_revision: str | None = "004_add_citations"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("feedback", sa.String(), nullable=True))
    op.add_column("messages", sa.Column("feedback_comment", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("messages", "feedback_comment")
    op.drop_column("messages", "feedback")
