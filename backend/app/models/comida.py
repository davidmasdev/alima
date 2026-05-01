from datetime import date
from uuid import UUID

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class Comida(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "comidas"

    usuario_id: Mapped[UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    tipo: Mapped[str] = mapped_column(String(60), nullable=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="comidas")
    registros: Mapped[list["Registro"]] = relationship(
        "Registro",
        back_populates="comida",
        cascade="all, delete-orphan",
    )
    recomendaciones: Mapped[list["Recomendacion"]] = relationship(
        "Recomendacion",
        back_populates="comida",
    )
