"""Daily food log units and meal types.

Revision ID: 20260501_0002
Revises: 20260430_0001
Create Date: 2026-05-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260501_0002"
down_revision: str | None = "20260430_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

uuid_type = postgresql.UUID(as_uuid=True)


def upgrade() -> None:
    op.add_column(
        "alimentos",
        sa.Column("unidad_base", sa.String(length=10), server_default="g", nullable=False),
    )
    op.add_column(
        "registros",
        sa.Column("unidad", sa.String(length=10), server_default="g", nullable=False),
    )
    op.create_table(
        "tipos_comida_usuario",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("usuario_id", uuid_type, nullable=False),
        sa.Column("nombre", sa.String(length=60), nullable=False),
        sa.Column("orden", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("usuario_id", "nombre", name="uq_tipos_comida_usuario_nombre"),
    )
    op.create_index(
        op.f("ix_tipos_comida_usuario_usuario_id"),
        "tipos_comida_usuario",
        ["usuario_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_tipos_comida_usuario_usuario_id"),
        table_name="tipos_comida_usuario",
    )
    op.drop_table("tipos_comida_usuario")
    op.drop_column("registros", "unidad")
    op.drop_column("alimentos", "unidad_base")
