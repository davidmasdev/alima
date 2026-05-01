from uuid import UUID

from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class PerfilNutricional(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "perfiles_nutricionales"

    usuario_id: Mapped[UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    peso: Mapped[float] = mapped_column(Float, nullable=False)
    altura: Mapped[int] = mapped_column(Integer, nullable=False)
    sexo: Mapped[str] = mapped_column(String(40), nullable=False)
    nivel_actividad: Mapped[str] = mapped_column(String(60), nullable=False)
    objetivo: Mapped[str] = mapped_column(String(60), nullable=False)
    calorias_diarias: Mapped[float] = mapped_column(Float, nullable=False)

    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="perfil_nutricional")
