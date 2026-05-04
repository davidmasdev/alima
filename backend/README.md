# Alima Backend

FastAPI backend for the Alima nutrition app.

## Local setup

1. Create a PostgreSQL database named `alima`.
2. Copy `.env.example` to `.env` and adjust credentials.
3. Install dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"
```

4. Apply migrations:

```bash
alembic upgrade head
```

5. Seed common foods for local testing:

```bash
python scripts/seed_foods.py
```

6. Optionally import supermarket products from Open Food Facts:

```bash
python scripts/import_openfoodfacts.py --limit 1000 --page-size 25
```

You can narrow the import by store or brand:

```bash
python scripts/import_openfoodfacts.py --stores mercadona,aldi,lidl --limit 500
python scripts/import_openfoodfacts.py --brands hacendado,milbona --limit 500
```

By default the importer targets Spanish supermarket store tags. Brand filters are optional
because combining store and brand filters narrows the result set.
The script queries the Open Food Facts v2 search API one store or brand at a time and
retries temporary errors, but 503 responses can still happen during high load. In that
case, rerun it with a smaller `--page-size` or a narrower `--stores` value.

Open Food Facts data is reused under the Open Database License. Keep attribution in
project documentation or the product UI when using this catalog.

7. Start the API:

```bash
fastapi dev app/main.py
```

The API is exposed under `/api`.

For local frontend integration, set `BACKEND_CORS_ORIGINS` to the Expo origin and set
`EXPO_PUBLIC_API_URL` in the frontend to the backend API URL, for example:

```bash
BACKEND_CORS_ORIGINS=http://localhost:8081,http://localhost:19006
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```
