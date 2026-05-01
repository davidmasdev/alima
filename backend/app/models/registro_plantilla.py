from uuid import UUID

from sqlalchemy import Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class RegistroPlantilla(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "registros_plantilla"

    plantilla_id: Mapped[UUID] = mapped_column(
        ForeignKey("plantillas.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    alimento_id: Mapped[UUID] = mapped_column(
        ForeignKey("alimentos.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    cantidad: Mapped[float] = mapped_column(Float, nullable=False)

    plantilla: Mapped["Plantilla"] = relationship("Plantilla", back_populates="registros")
    alimento: Mapped["Alimento"] = relationship(
        "Alimento",
        back_populates="registros_plantilla",
    )
