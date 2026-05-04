from dataclasses import dataclass
from datetime import datetime, timezone
from time import sleep

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.alimento import Alimento
from app.services.daily_log import _first_csv_value, _read_number


IMPORT_FIELDS = ",".join(
    [
        "code",
        "product_name",
        "brands",
        "stores",
        "nutriments",
        "nutrition_data_per",
    ]
)

DEFAULT_STORES = [
    "mercadona",
    "aldi",
    "lidl",
    "carrefour",
    "dia",
    "eroski",
    "hiperber",
]

DEFAULT_BRANDS = [
    "hacendado",
    "bosque verde",
    "deliplus",
    "milbona",
    "alipende",
    "el corte ingles",
    "eroski",
    "carrefour",
    "dia",
]


@dataclass(frozen=True)
class FoodImportResult:
    created: int
    updated: int
    skipped: int
    pages_processed: int
    failed_pages: int = 0


def _as_product_list(payload: dict[str, object]) -> list[dict[str, object]]:
    products = payload.get("products")
    if not isinstance(products, list):
        return []
    return [item for item in products if isinstance(item, dict)]


def _extract_food(product: dict[str, object]) -> Alimento | None:
    code = str(product.get("code") or "").strip()
    name = str(product.get("product_name") or "").strip()
    nutriments = product.get("nutriments")
    if not code or not name or not isinstance(nutriments, dict):
        return None

    calories = _read_number(nutriments.get("energy-kcal_100g") or nutriments.get("energy-kcal"))
    proteins = _read_number(nutriments.get("proteins_100g"))
    carbs = _read_number(nutriments.get("carbohydrates_100g"))
    fats = _read_number(nutriments.get("fat_100g"))
    if calories is None or proteins is None or carbs is None or fats is None:
        return None

    brand = _first_csv_value(product.get("brands"))
    store = _first_csv_value(product.get("stores"))
    display_name = f"{brand} {name}".strip() if brand else name
    unit = "ml" if str(product.get("nutrition_data_per") or "").lower() == "serving" else "g"

    return Alimento(
        nombre=display_name[:180],
        calorias=calories,
        proteinas=proteins,
        carbohidratos=carbs,
        grasas=fats,
        unidad_base=unit,
        codigo_qr=code[:255],
        marca=brand,
        supermercado=store,
        fuente="open_food_facts",
        ultima_sincronizacion=datetime.now(timezone.utc),
    )


def _upsert_food(db: Session, food: Alimento) -> str:
    existing = db.scalar(select(Alimento).where(Alimento.codigo_qr == food.codigo_qr))
    if existing is None:
        db.add(food)
        return "created"

    existing.nombre = food.nombre
    existing.calorias = food.calorias
    existing.proteinas = food.proteinas
    existing.carbohidratos = food.carbohidratos
    existing.grasas = food.grasas
    existing.unidad_base = food.unidad_base
    existing.marca = food.marca
    existing.supermercado = food.supermercado
    existing.fuente = food.fuente
    existing.ultima_sincronizacion = food.ultima_sincronizacion
    return "updated"


def fetch_open_food_facts_page(
    *,
    country: str,
    stores: list[str],
    brands: list[str],
    page: int,
    page_size: int,
) -> dict[str, object]:
    settings = get_settings()
    params: dict[str, object] = {
        "countries_tags_en": country,
        "fields": IMPORT_FIELDS,
        "page": page,
        "page_size": page_size,
        "action": "process",
        "json": 1,
    }
    if stores:
        params["stores_tags"] = ",".join(stores)
    if brands:
        params["brands_tags"] = ",".join(brands)

    url = f"{settings.open_food_facts_base_url.rstrip('/')}/api/v2/search"
    last_error: httpx.HTTPError | None = None
    for attempt in range(3):
        try:
            response = httpx.get(
                url,
                params=params,
                headers={"User-Agent": settings.open_food_facts_user_agent},
                timeout=30,
            )
            response.raise_for_status()
            break
        except httpx.HTTPError as error:
            last_error = error
            if attempt == 2:
                raise
            sleep(settings.open_food_facts_import_delay_seconds * (attempt + 1))
    else:
        if last_error:
            raise last_error
        return {}

    payload = response.json()
    return payload if isinstance(payload, dict) else {}


def _build_filter_groups(
    stores: list[str],
    brands: list[str],
) -> list[tuple[list[str], list[str]]]:
    if stores and brands:
        return [([store], [brand]) for store in stores for brand in brands]
    if stores:
        return [([store], []) for store in stores]
    if brands:
        return [([], [brand]) for brand in brands]
    return [([], [])]


def import_open_food_facts_foods(
    db: Session,
    *,
    country: str = "spain",
    stores: list[str] | None = None,
    brands: list[str] | None = None,
    limit: int = 1000,
    page_size: int = 100,
    dry_run: bool = False,
) -> FoodImportResult:
    settings = get_settings()
    selected_stores = stores if stores is not None else ([] if brands else DEFAULT_STORES)
    selected_brands = brands if brands is not None else []
    target = max(limit, 0)
    per_page = max(min(page_size, 50), 1)

    created = 0
    updated = 0
    skipped = 0
    processed = 0
    pages_processed = 0
    failed_pages = 0

    for group_stores, group_brands in _build_filter_groups(selected_stores, selected_brands):
        page = 1
        while processed < target:
            try:
                payload = fetch_open_food_facts_page(
                    country=country,
                    stores=group_stores,
                    brands=group_brands,
                    page=page,
                    page_size=min(per_page, target - processed),
                )
            except httpx.HTTPError:
                failed_pages += 1
                break

            products = _as_product_list(payload)
            if not products:
                break

            for product in products:
                food = _extract_food(product)
                if food is None:
                    skipped += 1
                else:
                    result = _upsert_food(db, food)
                    if result == "created":
                        created += 1
                    else:
                        updated += 1
                processed += 1

            if not dry_run:
                db.commit()
            else:
                db.rollback()

            pages_processed += 1
            page += 1
            if processed < target:
                sleep(settings.open_food_facts_import_delay_seconds)

        if processed >= target:
            break

    return FoodImportResult(
        created=created,
        updated=updated,
        skipped=skipped,
        pages_processed=pages_processed,
        failed_pages=failed_pages,
    )
