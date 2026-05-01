"""Meal template units and usage date.

Revision ID: 20260501_0003
Revises: 20260501_0002
Create Date: 2026-05-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260501_0003"
down_revision: str | None = "20260501_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "registros_plantilla",
        sa.Column("unidad", sa.String(length=10), server_default="g", nullable=False),
    )
    op.add_column(
        "plantillas",
        sa.Column("ultimo_uso", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("plantillas", "ultimo_uso")
    op.drop_column("registros_plantilla", "unidad")
