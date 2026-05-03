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
    tipos_comida: Mapped[list["TipoComidaUsuario"]] = relationship(
        "TipoComidaUsuario",
        back_populates="usuario",
        cascade="all, delete-orphan",
        order_by="TipoComidaUsuario.orden",
    )
    registros_peso: Mapped[list["RegistroPeso"]] = relationship(
        "RegistroPeso",
        back_populates="usuario",
        cascade="all, delete-orphan",
    )
    email_verification_tokens: Mapped[list["EmailVerificationToken"]] = relationship(
        "EmailVerificationToken",
        back_populates="usuario",
        cascade="all, delete-orphan",
    )
    password_reset_tokens: Mapped[list["PasswordResetToken"]] = relationship(
        "PasswordResetToken",
        back_populates="usuario",
        cascade="all, delete-orphan",
    )
