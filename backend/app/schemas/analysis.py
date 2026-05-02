from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field


class AnalysisRequest(BaseModel):
    fecha: date = Field(default_factory=date.today)


class AnalysisContent(BaseModel):
    puntuacion: float = Field(ge=0, le=100)
    estado_proteinas: str = Field(max_length=80)
    estado_carbohidratos: str = Field(max_length=80)
    estado_grasas: str = Field(max_length=80)
    estado_micronutrientes: str = Field(max_length=80)
    consejo: str


class AnalysisResponse(BaseModel):
    id: UUID
    fecha: date
    puntuacion: float
    estado_proteinas: str
    estado_carbohidratos: str
    estado_grasas: str
    estado_micronutrientes: str
    consejo: str
    dias_analizados: int
