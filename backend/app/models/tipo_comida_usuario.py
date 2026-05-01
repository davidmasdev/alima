from uuid import UUID

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class TipoComidaUsuario(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "tipos_comida_usuario"
    __table_args__ = (
        UniqueConstraint("usuario_id", "nombre", name="uq_tipos_comida_usuario_nombre"),
    )

    usuario_id: Mapped[UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    nombre: Mapped[str] = mapped_column(String(60), nullable=False)
    orden: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="tipos_comida")
