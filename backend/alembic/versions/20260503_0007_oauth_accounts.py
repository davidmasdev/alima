"""Add OAuth accounts.

Revision ID: 20260503_0007
Revises: 20260503_0006
Create Date: 2026-05-03 12:15:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260503_0007"
down_revision: Union[str, None] = "20260503_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "oauth_accounts",
        sa.Column("usuario_id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(length=40), nullable=False),
        sa.Column("provider_user_id", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "provider_user_id", name="uq_oauth_provider_user"),
    )
    op.create_index(
        op.f("ix_oauth_accounts_usuario_id"),
        "oauth_accounts",
        ["usuario_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_oauth_accounts_usuario_id"), table_name="oauth_accounts")
    op.drop_table("oauth_accounts")
