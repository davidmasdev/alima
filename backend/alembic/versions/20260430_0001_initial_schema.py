"""Initial schema.

Revision ID: 20260430_0001
Revises:
Create Date: 2026-04-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260430_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


uuid_type = postgresql.UUID(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "usuarios",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("nombre", sa.String(length=120), nullable=True),
        sa.Column("contrasena_hash", sa.String(length=255), nullable=False),
        sa.Column("fecha_nacimiento", sa.Date(), nullable=True),
        sa.Column("validada", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_usuarios_email"), "usuarios", ["email"], unique=True)

    op.create_table(
        "alimentos",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("nombre", sa.String(length=180), nullable=False),
        sa.Column("calorias", sa.Float(), nullable=False),
        sa.Column("proteinas", sa.Float(), nullable=False),
        sa.Column("carbohidratos", sa.Float(), nullable=False),
        sa.Column("grasas", sa.Float(), nullable=False),
        sa.Column("codigo_qr", sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("codigo_qr"),
    )
    op.create_index(op.f("ix_alimentos_nombre"), "alimentos", ["nombre"], unique=False)

    op.create_table(
        "perfiles_nutricionales",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("usuario_id", uuid_type, nullable=False),
        sa.Column("peso", sa.Float(), nullable=False),
        sa.Column("altura", sa.Integer(), nullable=False),
        sa.Column("sexo", sa.String(length=40), nullable=False),
        sa.Column("nivel_actividad", sa.String(length=60), nullable=False),
        sa.Column("objetivo", sa.String(length=60), nullable=False),
        sa.Column("calorias_diarias", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_perfiles_nutricionales_usuario_id"),
        "perfiles_nutricionales",
        ["usuario_id"],
        unique=True,
    )

    op.create_table(
        "comidas",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("usuario_id", uuid_type, nullable=False),
        sa.Column("tipo", sa.String(length=60), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_comidas_fecha"), "comidas", ["fecha"], unique=False)
    op.create_index(op.f("ix_comidas_usuario_id"), "comidas", ["usuario_id"], unique=False)

    op.create_table(
        "plantillas",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("usuario_id", uuid_type, nullable=False),
        sa.Column("nombre", sa.String(length=160), nullable=False),
        sa.Column("calorias", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_plantillas_usuario_id"),
        "plantillas",
        ["usuario_id"],
        unique=False,
    )

    op.create_table(
        "analisis",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("usuario_id", uuid_type, nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("puntuacion", sa.Float(), nullable=False),
        sa.Column("estado_proteinas", sa.String(length=80), nullable=False),
        sa.Column("estado_carbohidratos", sa.String(length=80), nullable=False),
        sa.Column("estado_grasas", sa.String(length=80), nullable=False),
        sa.Column("estado_micronutrientes", sa.String(length=80), nullable=False),
        sa.Column("consejo", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_analisis_fecha"), "analisis", ["fecha"], unique=False)
    op.create_index(op.f("ix_analisis_usuario_id"), "analisis", ["usuario_id"], unique=False)

    op.create_table(
        "registros",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("comida_id", uuid_type, nullable=False),
        sa.Column("alimento_id", uuid_type, nullable=False),
        sa.Column("cantidad", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["alimento_id"], ["alimentos.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["comida_id"], ["comidas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_registros_alimento_id"), "registros", ["alimento_id"], unique=False)
    op.create_index(op.f("ix_registros_comida_id"), "registros", ["comida_id"], unique=False)

    op.create_table(
        "registros_plantilla",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("plantilla_id", uuid_type, nullable=False),
        sa.Column("alimento_id", uuid_type, nullable=False),
        sa.Column("cantidad", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["alimento_id"], ["alimentos.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["plantilla_id"], ["plantillas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_registros_plantilla_alimento_id"),
        "registros_plantilla",
        ["alimento_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_registros_plantilla_plantilla_id"),
        "registros_plantilla",
        ["plantilla_id"],
        unique=False,
    )

    op.create_table(
        "recomendaciones",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("usuario_id", uuid_type, nullable=False),
        sa.Column("comida_id", uuid_type, nullable=True),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("resultado", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["comida_id"], ["comidas.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_recomendaciones_comida_id"),
        "recomendaciones",
        ["comida_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_recomendaciones_fecha"),
        "recomendaciones",
        ["fecha"],
        unique=False,
    )
    op.create_index(
        op.f("ix_recomendaciones_usuario_id"),
        "recomendaciones",
        ["usuario_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_recomendaciones_usuario_id"), table_name="recomendaciones")
    op.drop_index(op.f("ix_recomendaciones_fecha"), table_name="recomendaciones")
    op.drop_index(op.f("ix_recomendaciones_comida_id"), table_name="recomendaciones")
    op.drop_table("recomendaciones")
    op.drop_index(op.f("ix_registros_plantilla_plantilla_id"), table_name="registros_plantilla")
    op.drop_index(op.f("ix_registros_plantilla_alimento_id"), table_name="registros_plantilla")
    op.drop_table("registros_plantilla")
    op.drop_index(op.f("ix_registros_comida_id"), table_name="registros")
    op.drop_index(op.f("ix_registros_alimento_id"), table_name="registros")
    op.drop_table("registros")
    op.drop_index(op.f("ix_analisis_usuario_id"), table_name="analisis")
    op.drop_index(op.f("ix_analisis_fecha"), table_name="analisis")
    op.drop_table("analisis")
    op.drop_index(op.f("ix_plantillas_usuario_id"), table_name="plantillas")
    op.drop_table("plantillas")
    op.drop_index(op.f("ix_comidas_usuario_id"), table_name="comidas")
    op.drop_index(op.f("ix_comidas_fecha"), table_name="comidas")
    op.drop_table("comidas")
    op.drop_index(
        op.f("ix_perfiles_nutricionales_usuario_id"),
        table_name="perfiles_nutricionales",
    )
    op.drop_table("perfiles_nutricionales")
    op.drop_index(op.f("ix_alimentos_nombre"), table_name="alimentos")
    op.drop_table("alimentos")
    op.drop_index(op.f("ix_usuarios_email"), table_name="usuarios")
    op.drop_table("usuarios")
