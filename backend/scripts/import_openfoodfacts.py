import argparse

from app.db.session import SessionLocal
from app.services.food_importer import import_open_food_facts_foods


def _csv(value: str | None) -> list[str] | None:
    if value is None:
        return None
    return [item.strip() for item in value.split(",") if item.strip()]


def main() -> None:
    parser = argparse.ArgumentParser(description="Import foods from Open Food Facts")
    parser.add_argument("--country", default="spain")
    parser.add_argument("--stores", default=None, help="Comma-separated store tags")
    parser.add_argument("--brands", default=None, help="Comma-separated brand tags")
    parser.add_argument("--limit", type=int, default=1000)
    parser.add_argument("--page-size", type=int, default=100)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    with SessionLocal() as db:
        result = import_open_food_facts_foods(
            db,
            country=args.country,
            stores=_csv(args.stores),
            brands=_csv(args.brands),
            limit=args.limit,
            page_size=args.page_size,
            dry_run=args.dry_run,
        )

    print(
        "Imported Open Food Facts foods: "
        f"created={result.created}, "
        f"updated={result.updated}, "
        f"skipped={result.skipped}, "
        f"pages={result.pages_processed}, "
        f"failed_pages={result.failed_pages}"
    )


if __name__ == "__main__":
    main()
