from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field


class RecommendedFood(BaseModel):
    nombre: str
    cantidad: float = Field(gt=0)
    unidad: str = Field(pattern="^(g|ml)$")
    calorias: float = Field(ge=0)
    proteinas: float = Field(ge=0)
    carbohidratos: float = Field(ge=0)
    grasas: float = Field(ge=0)


class RecommendationContent(BaseModel):
    nombre: str
    alimentos: list[RecommendedFood] = Field(min_length=1)
    calorias: float = Field(ge=0)
    proteinas: float = Field(ge=0)
    carbohidratos: float = Field(ge=0)
    grasas: float = Field(ge=0)
    explicacion: str


class RecommendationRequest(BaseModel):
    fecha: date
    prompt: str | None = Field(default=None, max_length=500)


class RecommendationApplyRequest(BaseModel):
    fecha: date
    tipo: str = Field(min_length=1, max_length=60)


class RecommendationResponse(BaseModel):
    id: UUID
    fecha: date
    prompt: str
    resultado: str
    contenido: RecommendationContent
    calorias_restantes: float
    proteinas_restantes: float
    carbohidratos_restantes: float
    grasas_restantes: float
