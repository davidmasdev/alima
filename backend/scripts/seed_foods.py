from app.db.session import SessionLocal
from app.services.seed_foods import seed_foods


def main() -> None:
    with SessionLocal() as db:
        created = seed_foods(db)
    print(f"Seeded {created} foods")


if __name__ == "__main__":
    main()
