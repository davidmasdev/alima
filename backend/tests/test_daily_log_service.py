from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.alimento import Alimento
from app.models.registro import Registro
from app.models.tipo_comida_usuario import TipoComidaUsuario
from app.models.usuario import Usuario
from app.schemas.daily_log import FoodScanRequest
from app.services import daily_log
from app.services.daily_log import calculate_entry


class FakeSession:
    def __init__(self, existing_food: Alimento | None = None) -> None:
        self.existing_food = existing_food
        self.added: list[object] = []
        self.committed = False

    def scalar(self, statement: object) -> object | None:
        return self.existing_food

    def add(self, item: object) -> None:
        self.added.append(item)

    def commit(self) -> None:
        self.committed = True

    def refresh(self, item: object) -> None:
        item.id = uuid4()


def test_calculate_entry_scales_nutrients_by_quantity() -> None:
    food = Alimento(
        nombre="Arroz blanco",
        calorias=130,
        proteinas=2.7,
        carbohidratos=28,
        grasas=0.3,
        unidad_base="g",
    )
    food.id = uuid4()
    entry = Registro(alimento=food, cantidad=195, unidad="g")
    entry.id = uuid4()

    response = calculate_entry(food, entry)

    assert response.calorias == 253.5
    assert response.proteinas == 5.27
    assert response.carbohidratos == 54.6
    assert response.grasas == 0.58


class FakeMealTypeSession:
    def __init__(self) -> None:
        self.added: list[TipoComidaUsuario] = []
        self.deleted: list[TipoComidaUsuario] = []
        self.committed = False
        self.flushed = False

    def delete(self, item: TipoComidaUsuario) -> None:
        self.deleted.append(item)

    def flush(self) -> None:
        self.flushed = True

    def add(self, item: TipoComidaUsuario) -> None:
        item.id = uuid4()
        self.added.append(item)

    def commit(self) -> None:
        self.committed = True

    def refresh(self, user: Usuario) -> None:
        user.tipos_comida = self.added


def make_user_with_meal_types(names: list[str] | None = None) -> Usuario:
    user = Usuario(email="user@example.com", contrasena_hash="hash")
    user.id = uuid4()
    user.tipos_comida = []
    for index, name in enumerate(names or []):
        meal_type = TipoComidaUsuario(usuario=user, nombre=name, orden=index)
        meal_type.id = uuid4()
        user.tipos_comida.append(meal_type)
    return user


def test_replace_meal_types_accepts_single_meal_type() -> None:
    db = FakeMealTypeSession()
    user = make_user_with_meal_types(["Desayuno", "Comida", "Cena"])

    response = daily_log.replace_meal_types(db, user, ["Comida"])

    assert db.committed is True
    assert [item.nombre for item in db.added] == ["Comida"]
    assert [item.nombre for item in response] == ["Comida"]


def test_replace_meal_types_accepts_more_than_three_meal_types() -> None:
    db = FakeMealTypeSession()
    user = make_user_with_meal_types(["Desayuno"])
    names = ["Desayuno", "Media mañana", "Comida", "Merienda", "Cena"]

    response = daily_log.replace_meal_types(db, user, names)

    assert [item.nombre for item in db.added] == names
    assert [item.orden for item in db.added] == [0, 1, 2, 3, 4]
    assert [item.nombre for item in response] == names


def test_scan_food_returns_existing_food_by_code() -> None:
    food = Alimento(
        nombre="Yogur marca",
        calorias=63,
        proteinas=5,
        carbohidratos=7,
        grasas=1.5,
        unidad_base="g",
        codigo_qr="1234567890123",
    )
    food.id = uuid4()
    db = FakeSession(existing_food=food)

    response = daily_log.scan_food(db, FoodScanRequest(code="1234567890123"))

    assert response.id == food.id
    assert response.nombre == "Yogur marca"
    assert db.added == []


def test_scan_food_creates_food_from_open_food_facts(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = FakeSession()
    monkeypatch.setattr(
        daily_log,
        "fetch_open_food_facts_product",
        lambda code: {
            "status": 1,
            "product": {
                "product_name": "Arroz preparado",
                "brands": "Marca",
                "nutriments": {
                    "energy-kcal_100g": 120,
                    "proteins_100g": 3,
                    "carbohydrates_100g": 24,
                    "fat_100g": 1.2,
                },
            },
        },
    )

    response = daily_log.scan_food(db, FoodScanRequest(code="1234567890123"))

    added_food = next(item for item in db.added if isinstance(item, Alimento))
    assert db.committed is True
    assert added_food.codigo_qr == "1234567890123"
    assert response.nombre == "Marca Arroz preparado"
    assert response.calorias == 120


def test_scan_food_rejects_unknown_code(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = FakeSession()
    monkeypatch.setattr(
        daily_log,
        "fetch_open_food_facts_product",
        lambda code: {"status": 0},
    )

    with pytest.raises(HTTPException) as error:
        daily_log.scan_food(db, FoodScanRequest(code="000"))

    assert error.value.status_code == 404


def test_scan_food_rejects_product_without_macros(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = FakeSession()
    monkeypatch.setattr(
        daily_log,
        "fetch_open_food_facts_product",
        lambda code: {
            "status": 1,
            "product": {"product_name": "Sin datos", "nutriments": {}},
        },
    )

    with pytest.raises(HTTPException) as error:
        daily_log.scan_food(db, FoodScanRequest(code="000"))

    assert error.value.status_code == 422
