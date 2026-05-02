"""Progress weight history.

Revision ID: 20260502_0004
Revises: 20260501_0003
Create Date: 2026-05-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260502_0004"
down_revision: str | None = "20260501_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

uuid_type = postgresql.UUID(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "registros_peso",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("usuario_id", uuid_type, nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("peso", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("usuario_id", "fecha", name="uq_registros_peso_usuario_fecha"),
    )
    op.create_index(op.f("ix_registros_peso_fecha"), "registros_peso", ["fecha"], unique=False)
    op.create_index(
        op.f("ix_registros_peso_usuario_id"),
        "registros_peso",
        ["usuario_id"],
        unique=False,
    )

def downgrade() -> None:
    op.drop_index(op.f("ix_registros_peso_usuario_id"), table_name="registros_peso")
    op.drop_index(op.f("ix_registros_peso_fecha"), table_name="registros_peso")
    op.drop_table("registros_peso")
