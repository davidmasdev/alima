from datetime import datetime

from sqlalchemy import DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class Alimento(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "alimentos"

    nombre: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    calorias: Mapped[float] = mapped_column(Float, nullable=False)
    proteinas: Mapped[float] = mapped_column(Float, nullable=False)
    carbohidratos: Mapped[float] = mapped_column(Float, nullable=False)
    grasas: Mapped[float] = mapped_column(Float, nullable=False)
    unidad_base: Mapped[str] = mapped_column(String(10), nullable=False, default="g")
    codigo_qr: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    marca: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    supermercado: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    fuente: Mapped[str | None] = mapped_column(String(80), nullable=True)
    ultima_sincronizacion: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    registros: Mapped[list["Registro"]] = relationship("Registro", back_populates="alimento")
    registros_plantilla: Mapped[list["RegistroPlantilla"]] = relationship(
        "RegistroPlantilla",
        back_populates="alimento",
    )
