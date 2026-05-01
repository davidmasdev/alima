from uuid import UUID

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class Registro(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "registros"

    comida_id: Mapped[UUID] = mapped_column(
        ForeignKey("comidas.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    alimento_id: Mapped[UUID] = mapped_column(
        ForeignKey("alimentos.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    cantidad: Mapped[float] = mapped_column(Float, nullable=False)
    unidad: Mapped[str] = mapped_column(String(10), nullable=False, default="g")

    comida: Mapped["Comida"] = relationship("Comida", back_populates="registros")
    alimento: Mapped["Alimento"] = relationship("Alimento", back_populates="registros")
