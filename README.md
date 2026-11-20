# Alima

A nutrition tracking mobile app, built as my bachelor's thesis in Computer Engineering at the University of
Alicante (graded 10/10). Users log their meals, follow their progress, save meal templates, scan products by barcode
and get meal suggestions and diet analysis from an LLM.

**Backend:** Python · FastAPI · PostgreSQL · SQLAlchemy · Alembic · pytest
**App:** TypeScript · React Native · Expo · Jest · React Native Testing Library
**Integrations:** Google Gemini · Google sign-in · Open Food Facts · SMTP

## Highlights

- **REST API** with 30 endpoints, 14 PostgreSQL tables and 8 Alembic migrations, split into routers, services and
  models.
- **Accounts:** sign-up with JWT and bcrypt, Google sign-in verified on the server, and email verification and
  password reset with hashed, single-use, expiring tokens.
- **AI:** Google Gemini analyses the user's diet and suggests meals. Responses are requested as JSON and validated
  against a schema before they reach the app, so the rest of the code never handles free-form model output.
- **Barcode lookup:** products are searched in the local database first and then in Open Food Facts. Import scripts
  can filter the catalogue by store and brand.
- **104 automated tests:** 52 with pytest for the backend and 52 with Jest for the app.

## Structure

```text
backend/
  app/        API code: routers, services, models, schemas, security
  alembic/    Database migrations
  scripts/    Food seeding and Open Food Facts import
  tests/      Backend tests

frontend/
  app/        Screens and navigation (Expo Router)
  components/ Reusable components
  services/   Typed API clients
  types/      Shared TypeScript types
  __tests__/  App tests
```

More detail in [`backend/README.md`](backend/README.md) and [`frontend/README.md`](frontend/README.md).

## Running it locally

Start the backend first. It needs PostgreSQL and a `backend/.env` file based on `backend/.env.example`.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
alembic upgrade head
python scripts/seed_foods.py
fastapi dev app/main.py
```

Then start the app. It has its own `.env`, based on `frontend/.env.example`, which must point to the API:

```bash
cd frontend
npm install
npm run start
```

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

## Tests and other commands

```bash
# backend
pytest
pytest --cov=app
python scripts/import_openfoodfacts.py --limit 1000 --page-size 25

# app
npm run test
npm run lint
npm run android   # or ios / web
```

The Gemini, Google OAuth and SMTP keys are only needed to try those integrations; the rest of the app works without
them. The food import depends on Open Food Facts being available, so keep the limits low when testing locally.
