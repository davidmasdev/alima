from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field


class FoodResponse(BaseModel):
    id: UUID
    nombre: str
    calorias: float
    proteinas: float
    carbohidratos: float
    grasas: float
    unidad_base: str
    codigo_qr: str | None


class MealTypeResponse(BaseModel):
    id: UUID
    nombre: str
    orden: int


class MealTypeUpdateRequest(BaseModel):
    nombres: list[str] = Field(min_length=1, max_length=8)


class DailyEntryCreateRequest(BaseModel):
    fecha: date
    tipo: str = Field(min_length=1, max_length=60)
    alimento_id: UUID
    cantidad: float = Field(gt=0, le=10000)
    unidad: str = Field(pattern="^(g|ml)$")


class DailyEntryResponse(BaseModel):
    id: UUID
    alimento_id: UUID
    alimento_nombre: str
    cantidad: float
    unidad: str
    calorias: float
    proteinas: float
    carbohidratos: float
    grasas: float


class MealLogResponse(BaseModel):
    tipo: str
    calorias: float
    proteinas: float
    carbohidratos: float
    grasas: float
    entries: list[DailyEntryResponse]


class DailyTotalsResponse(BaseModel):
    calorias: float
    proteinas: float
    carbohidratos: float
    grasas: float


class DailyLogResponse(BaseModel):
    fecha: date
    meal_types: list[str]
    totals: DailyTotalsResponse
    meals: list[MealLogResponse]

