from uuid import uuid4

import httpx

from app.models.alimento import Alimento
from app.services import food_importer


class FakeImportSession:
    def __init__(self, existing_food: Alimento | None = None) -> None:
        self.existing_food = existing_food
        self.added: list[Alimento] = []
        self.commits = 0
        self.rollbacks = 0

    def scalar(self, statement: object) -> Alimento | None:
        return self.existing_food

    def add(self, item: Alimento) -> None:
        item.id = uuid4()
        self.added.append(item)

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


def test_import_open_food_facts_creates_complete_food(
    monkeypatch,
) -> None:
    db = FakeImportSession()
    monkeypatch.setattr(food_importer, "sleep", lambda seconds: None)
    monkeypatch.setattr(
        food_importer,
        "fetch_open_food_facts_page",
        lambda **kwargs: {
            "products": [
                {
                    "code": "8480000000001",
                    "product_name": "Arroz redondo",
                    "brands": "Hacendado",
                    "stores": "Mercadona",
                    "nutriments": {
                        "energy-kcal_100g": 350,
                        "proteins_100g": 7,
                        "carbohydrates_100g": 78,
                        "fat_100g": 1,
                    },
                }
            ]
        },
    )

    result = food_importer.import_open_food_facts_foods(db, limit=1)

    assert result.created == 1
    assert result.updated == 0
    assert result.skipped == 0
    assert db.commits == 1
    assert db.added[0].nombre == "Hacendado Arroz redondo"
    assert db.added[0].marca == "Hacendado"
    assert db.added[0].supermercado == "Mercadona"


def test_import_open_food_facts_updates_existing_food(monkeypatch) -> None:
    existing = Alimento(
        nombre="Antiguo",
        calorias=1,
        proteinas=1,
        carbohidratos=1,
        grasas=1,
        unidad_base="g",
        codigo_qr="8480000000001",
    )
    db = FakeImportSession(existing_food=existing)
    monkeypatch.setattr(food_importer, "sleep", lambda seconds: None)
    monkeypatch.setattr(
        food_importer,
        "fetch_open_food_facts_page",
        lambda **kwargs: {
            "products": [
                {
                    "code": "8480000000001",
                    "product_name": "Yogur natural",
                    "brands": "Milbona",
                    "stores": "Lidl",
                    "nutriments": {
                        "energy-kcal_100g": "63",
                        "proteins_100g": "5.3",
                        "carbohydrates_100g": "7",
                        "fat_100g": "1.6",
                    },
                }
            ]
        },
    )

    result = food_importer.import_open_food_facts_foods(db, limit=1)

    assert result.created == 0
    assert result.updated == 1
    assert db.added == []
    assert existing.nombre == "Milbona Yogur natural"
    assert existing.calorias == 63
    assert existing.marca == "Milbona"


def test_import_open_food_facts_skips_incomplete_food(monkeypatch) -> None:
    db = FakeImportSession()
    monkeypatch.setattr(food_importer, "sleep", lambda seconds: None)
    monkeypatch.setattr(
        food_importer,
        "fetch_open_food_facts_page",
        lambda **kwargs: {
            "products": [
                {
                    "code": "8480000000001",
                    "product_name": "Sin macros",
                    "brands": "Marca",
                    "nutriments": {},
                }
            ]
        },
    )

    result = food_importer.import_open_food_facts_foods(db, limit=1)

    assert result.created == 0
    assert result.updated == 0
    assert result.skipped == 1
    assert db.added == []


def test_import_open_food_facts_continues_after_failed_filter(monkeypatch) -> None:
    db = FakeImportSession()
    calls = 0

    def fake_fetch(**kwargs):
        nonlocal calls
        calls += 1
        if calls == 1:
            request = httpx.Request("GET", "https://world.openfoodfacts.org/cgi/search.pl")
            response = httpx.Response(503, request=request)
            raise httpx.HTTPStatusError("Service unavailable", request=request, response=response)
        return {
            "products": [
                {
                    "code": "8480000000002",
                    "product_name": "Leche entera",
                    "brands": "Hacendado",
                    "stores": "Mercadona",
                    "nutriments": {
                        "energy-kcal_100g": 61,
                        "proteins_100g": 3.2,
                        "carbohydrates_100g": 4.8,
                        "fat_100g": 3.3,
                    },
                }
            ]
        }

    monkeypatch.setattr(food_importer, "sleep", lambda seconds: None)
    monkeypatch.setattr(food_importer, "fetch_open_food_facts_page", fake_fetch)

    result = food_importer.import_open_food_facts_foods(
        db,
        stores=["aldi", "mercadona"],
        limit=1,
    )

    assert result.created == 1
    assert result.failed_pages == 1
    assert calls == 2
