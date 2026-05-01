from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TemplateItemPayload(BaseModel):
    alimento_id: UUID
    cantidad: float = Field(gt=0, le=10000)
    unidad: str = Field(pattern="^(g|ml)$")


class TemplateCreateRequest(BaseModel):
    nombre: str = Field(min_length=1, max_length=160)
    items: list[TemplateItemPayload] = Field(min_length=1, max_length=50)


class TemplateUpdateRequest(TemplateCreateRequest):
    pass


class TemplateItemResponse(BaseModel):
    id: UUID
    alimento_id: UUID
    alimento_nombre: str
    cantidad: float
    unidad: str
    calorias: float
    proteinas: float
    carbohidratos: float
    grasas: float


class TemplateResponse(BaseModel):
    id: UUID
    nombre: str
    calorias: float
    proteinas: float
    carbohidratos: float
    grasas: float
    ultimo_uso: datetime | None
    items: list[TemplateItemResponse]
