from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class ProfileUpsertRequest(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)
    fecha_nacimiento: date
    sexo: str = Field(min_length=1, max_length=40)
    nivel_actividad: str = Field(min_length=1, max_length=60)
    objetivo: str = Field(min_length=1, max_length=60)
    peso: float = Field(gt=0, le=500)
    altura: int = Field(gt=0, le=300)


class ProfileResponse(BaseModel):
    email: str
    nombre: str | None
    fecha_nacimiento: date | None
    sexo: str | None
    nivel_actividad: str | None
    objetivo: str | None
    peso: float | None
    altura: int | None
    tmb: float | None
    get: float | None
    calorias_diarias: float | None

    model_config = ConfigDict(from_attributes=True)
