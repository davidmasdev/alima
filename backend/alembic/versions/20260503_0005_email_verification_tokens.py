"""Add email verification tokens.

Revision ID: 20260503_0005
Revises: 20260502_0004
Create Date: 2026-05-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260503_0005"
down_revision: str | None = "20260502_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


uuid_type = postgresql.UUID(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "email_verification_tokens",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("usuario_id", uuid_type, nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_email_verification_tokens_token_hash"),
        "email_verification_tokens",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        op.f("ix_email_verification_tokens_usuario_id"),
        "email_verification_tokens",
        ["usuario_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_email_verification_tokens_usuario_id"),
        table_name="email_verification_tokens",
    )
    op.drop_index(
        op.f("ix_email_verification_tokens_token_hash"),
        table_name="email_verification_tokens",
    )
    op.drop_table("email_verification_tokens")
