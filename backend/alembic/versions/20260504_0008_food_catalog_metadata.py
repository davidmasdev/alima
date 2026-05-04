"""Add food catalog metadata.

Revision ID: 20260504_0008
Revises: 20260503_0007
Create Date: 2026-05-04 10:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260504_0008"
down_revision: Union[str, None] = "20260503_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("alimentos", sa.Column("marca", sa.String(length=120), nullable=True))
    op.add_column("alimentos", sa.Column("supermercado", sa.String(length=120), nullable=True))
    op.add_column("alimentos", sa.Column("fuente", sa.String(length=80), nullable=True))
    op.add_column(
        "alimentos",
        sa.Column("ultima_sincronizacion", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f("ix_alimentos_marca"), "alimentos", ["marca"], unique=False)
    op.create_index(
        op.f("ix_alimentos_supermercado"),
        "alimentos",
        ["supermercado"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_alimentos_supermercado"), table_name="alimentos")
    op.drop_index(op.f("ix_alimentos_marca"), table_name="alimentos")
    op.drop_column("alimentos", "ultima_sincronizacion")
    op.drop_column("alimentos", "fuente")
    op.drop_column("alimentos", "supermercado")
    op.drop_column("alimentos", "marca")
