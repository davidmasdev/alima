from datetime import date
from uuid import UUID

from sqlalchemy import Date, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class RegistroPeso(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "registros_peso"
    __table_args__ = (
        UniqueConstraint("usuario_id", "fecha", name="uq_registros_peso_usuario_fecha"),
    )

    usuario_id: Mapped[UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    fecha: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    peso: Mapped[float] = mapped_column(Float, nullable=False)

    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="registros_peso")
