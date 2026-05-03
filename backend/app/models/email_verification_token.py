from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class EmailVerificationToken(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "email_verification_tokens"

    usuario_id: Mapped[UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="email_verification_tokens")
