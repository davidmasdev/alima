from datetime import date
from sqlalchemy import Boolean, Date, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class Usuario(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "usuarios"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    nombre: Mapped[str | None] = mapped_column(String(120), nullable=True)
    contrasena_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    fecha_nacimiento: Mapped[date | None] = mapped_column(Date, nullable=True)
    validada: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    perfil_nutricional: Mapped["PerfilNutricional | None"] = relationship(
        "PerfilNutricional",
        back_populates="usuario",
        cascade="all, delete-orphan",
        uselist=False,
    )
    comidas: Mapped[list["Comida"]] = relationship(
        "Comida",
        back_populates="usuario",
        cascade="all, delete-orphan",
    )
    plantillas: Mapped[list["Plantilla"]] = relationship(
        "Plantilla",
        back_populates="usuario",
        cascade="all, delete-orphan",
    )
    analisis: Mapped[list["Analisis"]] = relationship(
        "Analisis",
        back_populates="usuario",
        cascade="all, delete-orphan",
    )
    recomendaciones: Mapped[list["Recomendacion"]] = relationship(
        "Recomendacion",
        back_populates="usuario",
        cascade="all, delete-orphan",
    )
