from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.alimento import Alimento
from app.models.comida import Comida
from app.models.perfil_nutricional import PerfilNutricional
from app.models.registro import Registro
from app.models.registro_peso import RegistroPeso
from app.models.tipo_comida_usuario import TipoComidaUsuario
from app.models.usuario import Usuario


DEMO_EMAIL = "demo@alima.com"
LEGACY_DEMO_EMAIL = "demo@alima.local"
DEMO_PASSWORD = "Demo12345"
DEMO_NAME = "Usuario Demo"


@dataclass(frozen=True)
class FoodSeed:
    nombre: str
    calorias: float
    proteinas: float
    carbohidratos: float
    grasas: float
    marca: str | None = None
    supermercado: str | None = None


@dataclass(frozen=True)
class EntrySeed:
    meal_type: str
    food_name: str
    quantity: float


FOODS = [
    FoodSeed("Yogur griego natural 0%", 59, 10.3, 3.6, 0.4, "Hacendado", "Mercadona"),
    FoodSeed("Copos de avena", 370, 13.5, 58.7, 7.0, "Bruggen", "Aldi"),
    FoodSeed("Platano", 89, 1.1, 22.8, 0.3),
    FoodSeed("Cafe con leche semidesnatada", 38, 2.6, 4.7, 1.2),
    FoodSeed("Pan integral", 247, 9.0, 41.0, 4.2, "Hacendado", "Mercadona"),
    FoodSeed("Pavo en lonchas", 98, 19.0, 2.0, 1.8, "El Pozo", "Carrefour"),
    FoodSeed("Aceite de oliva virgen extra", 884, 0.0, 0.0, 100.0, "Carbonell", "Carrefour"),
    FoodSeed("Pechuga de pollo", 165, 31.0, 0.0, 3.6),
    FoodSeed("Arroz integral cocido", 111, 2.6, 23.0, 0.9),
    FoodSeed("Pasta integral cocida", 124, 5.3, 26.0, 0.8),
    FoodSeed("Lentejas cocidas", 116, 9.0, 20.0, 0.4),
    FoodSeed("Garbanzos cocidos", 164, 8.9, 27.4, 2.6),
    FoodSeed("Salmon fresco", 208, 20.0, 0.0, 13.0),
    FoodSeed("Merluza", 82, 18.0, 0.0, 1.0),
    FoodSeed("Huevo", 155, 13.0, 1.1, 11.0),
    FoodSeed("Claras de huevo", 52, 11.0, 0.7, 0.2),
    FoodSeed("Brocoli", 34, 2.8, 6.6, 0.4),
    FoodSeed("Ensalada mixta", 25, 1.4, 4.0, 0.2),
    FoodSeed("Tomate", 18, 0.9, 3.9, 0.2),
    FoodSeed("Manzana", 52, 0.3, 13.8, 0.2),
    FoodSeed("Kiwi", 61, 1.1, 14.7, 0.5),
    FoodSeed("Almendras naturales", 579, 21.2, 21.6, 49.9),
    FoodSeed("Queso fresco batido 0%", 46, 8.0, 3.5, 0.2, "Hacendado", "Mercadona"),
    FoodSeed("Patata cocida", 87, 1.9, 20.1, 0.1),
    FoodSeed("Atun al natural", 116, 26.0, 0.0, 1.0, "Calvo", "Dia"),
    FoodSeed("Tortilla integral", 310, 8.0, 52.0, 7.5),
    FoodSeed("Aguacate", 160, 2.0, 8.5, 14.7),
    FoodSeed("Chocolate negro 85%", 584, 12.0, 19.0, 46.0, "Moser Roth", "Aldi"),
]


DAY_PATTERNS: list[list[EntrySeed]] = [
    [
        EntrySeed("Desayuno", "Yogur griego natural 0%", 250),
        EntrySeed("Desayuno", "Copos de avena", 45),
        EntrySeed("Desayuno", "Platano", 120),
        EntrySeed("Comida", "Pechuga de pollo", 170),
        EntrySeed("Comida", "Arroz integral cocido", 220),
        EntrySeed("Comida", "Brocoli", 180),
        EntrySeed("Comida", "Aceite de oliva virgen extra", 8),
        EntrySeed("Merienda", "Manzana", 180),
        EntrySeed("Merienda", "Almendras naturales", 18),
        EntrySeed("Cena", "Merluza", 180),
        EntrySeed("Cena", "Patata cocida", 240),
        EntrySeed("Cena", "Ensalada mixta", 180),
    ],
    [
        EntrySeed("Desayuno", "Pan integral", 80),
        EntrySeed("Desayuno", "Pavo en lonchas", 70),
        EntrySeed("Desayuno", "Cafe con leche semidesnatada", 220),
        EntrySeed("Comida", "Lentejas cocidas", 300),
        EntrySeed("Comida", "Huevo", 100),
        EntrySeed("Comida", "Ensalada mixta", 160),
        EntrySeed("Merienda", "Queso fresco batido 0%", 220),
        EntrySeed("Merienda", "Kiwi", 120),
        EntrySeed("Cena", "Salmon fresco", 150),
        EntrySeed("Cena", "Brocoli", 200),
        EntrySeed("Cena", "Patata cocida", 180),
    ],
    [
        EntrySeed("Desayuno", "Claras de huevo", 220),
        EntrySeed("Desayuno", "Huevo", 60),
        EntrySeed("Desayuno", "Pan integral", 60),
        EntrySeed("Comida", "Pasta integral cocida", 260),
        EntrySeed("Comida", "Atun al natural", 120),
        EntrySeed("Comida", "Tomate", 160),
        EntrySeed("Comida", "Aceite de oliva virgen extra", 10),
        EntrySeed("Merienda", "Yogur griego natural 0%", 200),
        EntrySeed("Merienda", "Chocolate negro 85%", 12),
        EntrySeed("Cena", "Tortilla integral", 90),
        EntrySeed("Cena", "Pavo en lonchas", 90),
        EntrySeed("Cena", "Aguacate", 70),
    ],
    [
        EntrySeed("Desayuno", "Yogur griego natural 0%", 220),
        EntrySeed("Desayuno", "Copos de avena", 35),
        EntrySeed("Desayuno", "Kiwi", 110),
        EntrySeed("Comida", "Garbanzos cocidos", 260),
        EntrySeed("Comida", "Pechuga de pollo", 140),
        EntrySeed("Comida", "Ensalada mixta", 180),
        EntrySeed("Merienda", "Manzana", 160),
        EntrySeed("Merienda", "Queso fresco batido 0%", 180),
        EntrySeed("Cena", "Merluza", 200),
        EntrySeed("Cena", "Brocoli", 220),
        EntrySeed("Cena", "Aceite de oliva virgen extra", 8),
    ],
]

SKIPPED_DAY_OFFSETS = {5, 12, 19}


def get_or_create_demo_user(db: Session) -> Usuario:
    user = db.scalar(select(Usuario).where(Usuario.email == DEMO_EMAIL))
    if user is None:
        user = db.scalar(select(Usuario).where(Usuario.email == LEGACY_DEMO_EMAIL))
    if user is None:
        user = Usuario(
            email=DEMO_EMAIL,
            nombre=DEMO_NAME,
            contrasena_hash=hash_password(DEMO_PASSWORD),
            fecha_nacimiento=date(1998, 5, 12),
            validada=True,
        )
        db.add(user)
        db.flush()
    else:
        user.email = DEMO_EMAIL
        user.nombre = DEMO_NAME
        user.contrasena_hash = hash_password(DEMO_PASSWORD)
        user.fecha_nacimiento = date(1998, 5, 12)
        user.validada = True
    return user


def clear_demo_data(db: Session, user: Usuario) -> None:
    for meal in list(user.comidas):
        db.delete(meal)
    for weight in list(user.registros_peso):
        db.delete(weight)
    for meal_type in list(user.tipos_comida):
        db.delete(meal_type)
    if user.perfil_nutricional is not None:
        db.delete(user.perfil_nutricional)
    db.flush()


def seed_foods(db: Session) -> dict[str, Alimento]:
    foods_by_name: dict[str, Alimento] = {}
    for seed in FOODS:
        food = db.scalar(
            select(Alimento).where(
                Alimento.nombre == seed.nombre,
                Alimento.fuente == "demo",
            )
        )
        if food is None:
            food = db.scalar(select(Alimento).where(Alimento.nombre == seed.nombre))
        if food is None:
            food = Alimento(
                nombre=seed.nombre,
                calorias=seed.calorias,
                proteinas=seed.proteinas,
                carbohidratos=seed.carbohidratos,
                grasas=seed.grasas,
                unidad_base="g",
                marca=seed.marca,
                supermercado=seed.supermercado,
                fuente="demo",
            )
            db.add(food)
            db.flush()
        foods_by_name[seed.nombre] = food
    return foods_by_name


def seed_profile_and_meal_types(db: Session, user: Usuario) -> None:
    db.add(
        PerfilNutricional(
            usuario=user,
            peso=88.6,
            altura=176,
            sexo="male",
            nivel_actividad="moderate",
            objetivo="lose",
            calorias_diarias=1700,
        )
    )
    for index, name in enumerate(["Desayuno", "Comida", "Merienda", "Cena"]):
        db.add(TipoComidaUsuario(usuario=user, nombre=name, orden=index))


def seed_meals(db: Session, user: Usuario, foods_by_name: dict[str, Alimento]) -> int:
    created_entries = 0
    today = date.today()
    for offset in range(0, 28):
        if offset in SKIPPED_DAY_OFFSETS:
            continue
        target_date = today - timedelta(days=offset)
        pattern = DAY_PATTERNS[offset % len(DAY_PATTERNS)]
        meals_by_type: dict[str, Comida] = {}
        for entry_seed in pattern:
            meal = meals_by_type.get(entry_seed.meal_type)
            if meal is None:
                meal = Comida(usuario=user, fecha=target_date, tipo=entry_seed.meal_type)
                db.add(meal)
                db.flush()
                meals_by_type[entry_seed.meal_type] = meal
            db.add(
                Registro(
                    comida=meal,
                    alimento=foods_by_name[entry_seed.food_name],
                    cantidad=entry_seed.quantity,
                    unidad="g",
                )
            )
            created_entries += 1
    return created_entries


def seed_weight_history(db: Session, user: Usuario) -> int:
    today = date.today()
    weights = [
        (42, 96.8),
        (35, 95.4),
        (28, 94.0),
        (21, 92.2),
        (14, 90.5),
        (7, 88.9),
        (4, 88.1),
        (2, 87.4),
        (0, 86.8),
    ]
    for offset, weight in weights:
        db.add(RegistroPeso(usuario=user, fecha=today - timedelta(days=offset), peso=weight))
    return len(weights)


def main() -> None:
    with SessionLocal() as db:
        user = get_or_create_demo_user(db)
        clear_demo_data(db, user)
        foods_by_name = seed_foods(db)
        seed_profile_and_meal_types(db, user)
        entry_count = seed_meals(db, user, foods_by_name)
        weight_count = seed_weight_history(db, user)
        db.commit()

    print("Demo user ready")
    print(f"Email: {DEMO_EMAIL}")
    print(f"Password: {DEMO_PASSWORD}")
    print(f"Meal entries: {entry_count}")
    print(f"Weight records: {weight_count}")


if __name__ == "__main__":
    main()
