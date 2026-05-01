from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.alimento import Alimento


SEED_FOODS = [
    {"nombre": "Arroz blanco", "calorias": 130, "proteinas": 2.7, "carbohidratos": 28.0, "grasas": 0.3},
    {"nombre": "Arroz basmati", "calorias": 121, "proteinas": 3.5, "carbohidratos": 25.0, "grasas": 0.4},
    {"nombre": "Arroz integral", "calorias": 111, "proteinas": 2.6, "carbohidratos": 23.0, "grasas": 0.9},
    {"nombre": "Pan blanco", "calorias": 265, "proteinas": 9.0, "carbohidratos": 49.0, "grasas": 3.2},
    {"nombre": "Queso semicurado", "calorias": 390, "proteinas": 25.0, "carbohidratos": 1.5, "grasas": 32.0},
    {"nombre": "Leche entera", "calorias": 61, "proteinas": 3.2, "carbohidratos": 4.8, "grasas": 3.3, "unidad_base": "ml"},
    {"nombre": "Pechuga de pollo", "calorias": 165, "proteinas": 31.0, "carbohidratos": 0.0, "grasas": 3.6},
    {"nombre": "Huevo", "calorias": 155, "proteinas": 13.0, "carbohidratos": 1.1, "grasas": 11.0},
    {"nombre": "Aceite de oliva", "calorias": 884, "proteinas": 0.0, "carbohidratos": 0.0, "grasas": 100.0, "unidad_base": "ml"},
    {"nombre": "Manzana", "calorias": 52, "proteinas": 0.3, "carbohidratos": 14.0, "grasas": 0.2},
    {"nombre": "Plátano", "calorias": 89, "proteinas": 1.1, "carbohidratos": 23.0, "grasas": 0.3},
    {"nombre": "Yogur natural", "calorias": 63, "proteinas": 5.3, "carbohidratos": 7.0, "grasas": 1.6},
]


def seed_foods(db: Session) -> int:
    created = 0
    for item in SEED_FOODS:
        exists = db.scalar(select(Alimento).where(Alimento.nombre == item["nombre"]))
        if exists:
            continue
        db.add(
            Alimento(
                nombre=str(item["nombre"]),
                calorias=float(item["calorias"]),
                proteinas=float(item["proteinas"]),
                carbohidratos=float(item["carbohidratos"]),
                grasas=float(item["grasas"]),
                unidad_base=str(item.get("unidad_base", "g")),
            )
        )
        created += 1
    db.commit()
    return created

