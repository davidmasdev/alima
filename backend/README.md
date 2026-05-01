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

6. Start the API:

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
