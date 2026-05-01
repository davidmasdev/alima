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

5. Start the API:

```bash
fastapi dev app/main.py
```

The API is exposed under `/api`.
