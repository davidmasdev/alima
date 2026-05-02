from datetime import date

from pydantic import BaseModel, Field


class WeightUpsertRequest(BaseModel):
    fecha: date | None = None
    peso: float = Field(gt=0, le=500)


class ProgressDayResponse(BaseModel):
    fecha: date
    calorias: float
    objetivo_calorias: float | None
    registrado: bool
    cumplido: bool | None


class WeightPointResponse(BaseModel):
    fecha: date
    peso: float


class ProgressSummaryResponse(BaseModel):
    rango: str
    fecha_inicio: date | None
    fecha_fin: date | None
    dias_registrados: int
    dias_cumplidos: int
    calorias_promedio: float
    racha_actual: int


class ProgressResponse(BaseModel):
    range: str
    objetivo_calorias: float | None
    summary: ProgressSummaryResponse
    days: list[ProgressDayResponse]
    calories_series: list[ProgressDayResponse]
    weight_series: list[WeightPointResponse]
