from datetime import date
from uuid import UUID

from sqlalchemy import Date, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class Analisis(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "analisis"

    usuario_id: Mapped[UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    fecha: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    puntuacion: Mapped[float] = mapped_column(Float, nullable=False)
    estado_proteinas: Mapped[str] = mapped_column(String(80), nullable=False)
    estado_carbohidratos: Mapped[str] = mapped_column(String(80), nullable=False)
    estado_grasas: Mapped[str] = mapped_column(String(80), nullable=False)
    estado_micronutrientes: Mapped[str] = mapped_column(String(80), nullable=False)
    consejo: Mapped[str] = mapped_column(Text, nullable=False)

    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="analisis")
