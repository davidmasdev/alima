"""Add password reset tokens.

Revision ID: 20260503_0006
Revises: 20260503_0005
Create Date: 2026-05-03 11:40:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260503_0006"
down_revision: Union[str, None] = "20260503_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "password_reset_tokens",
        sa.Column("usuario_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_password_reset_tokens_token_hash"),
        "password_reset_tokens",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        op.f("ix_password_reset_tokens_usuario_id"),
        "password_reset_tokens",
        ["usuario_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_password_reset_tokens_usuario_id"),
        table_name="password_reset_tokens",
    )
    op.drop_index(
        op.f("ix_password_reset_tokens_token_hash"),
        table_name="password_reset_tokens",
    )
    op.drop_table("password_reset_tokens")
