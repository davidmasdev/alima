from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class Plantilla(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "plantillas"

    usuario_id: Mapped[UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    nombre: Mapped[str] = mapped_column(String(160), nullable=False)
    calorias: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    ultimo_uso: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="plantillas")
    registros: Mapped[list["RegistroPlantilla"]] = relationship(
        "RegistroPlantilla",
        back_populates="plantilla",
        cascade="all, delete-orphan",
    )
