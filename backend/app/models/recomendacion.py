from datetime import date
from uuid import UUID

from sqlalchemy import Date, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class Recomendacion(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "recomendaciones"

    usuario_id: Mapped[UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    comida_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("comidas.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    fecha: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    resultado: Mapped[str] = mapped_column(Text, nullable=False)

    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="recomendaciones")
    comida: Mapped["Comida | None"] = relationship("Comida", back_populates="recomendaciones")
