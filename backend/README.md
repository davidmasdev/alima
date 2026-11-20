# Alima backend

The Alima REST API. It handles users and authentication, nutrition profiles, daily meal logs, meal templates,
progress, product scanning, and AI recommendations and analysis.

Built with FastAPI, SQLAlchemy, PostgreSQL and Alembic.

## Structure

- `app/main.py`: creates the FastAPI app and mounts the routers under `/api`.
- `app/api`: endpoints grouped by feature.
- `app/services`: business logic: nutrition calculations, AI, email and food import.
- `app/models`: SQLAlchemy models.
- `app/schemas`: Pydantic request and response models.
- `app/core`: configuration, JWT and security helpers.
- `app/db`: declarative base and database session.
- `alembic`: migrations.
- `scripts`: initial food data and Open Food Facts import.
- `tests`: unit and service tests.

## Local setup

You need Python 3.10 or newer and PostgreSQL with an empty database, for example `alima`.

```bash
cp .env.example .env
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
alembic upgrade head
```

Load some basic foods to try the app:

```bash
python scripts/seed_foods.py
```

You can also import products from Open Food Facts:

```bash
python scripts/import_openfoodfacts.py --limit 1000 --page-size 25
```

If the import is slow or fails because the service is busy, lower the limit or filter by store or brand:

```bash
python scripts/import_openfoodfacts.py --stores mercadona,aldi,lidl --limit 500
python scripts/import_openfoodfacts.py --brands hacendado,milbona --limit 500
```

## Running

```bash
fastapi dev app/main.py
```

The API is served at `http://localhost:8000/api`, and the interactive docs at `http://localhost:8000/docs`. To use
it from Expo locally, check these variables:

```env
BACKEND_CORS_ORIGINS=http://localhost:8081,http://localhost:19006
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

## Useful commands

```bash
pytest
pytest --cov=app
alembic upgrade head
alembic revision --autogenerate -m "description"
```

## Integrations

The Gemini, Google OAuth and SMTP variables are listed in `.env.example`. If they are empty, most of the backend
still works, but those integrations can't be tested end to end.

Open Food Facts data is reused under its licence; keep the attribution if you use the imported catalogue.
