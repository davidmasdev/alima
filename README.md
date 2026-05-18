# Alima

Alima es una aplicación móvil de seguimiento nutricional desarrollada como TFG. Permite registrar comidas, consultar el progreso, guardar plantillas, escanear productos por código de barras y generar recomendaciones o análisis con IA.

El proyecto está dividido en dos partes:

- `backend`: API REST con FastAPI, PostgreSQL y SQLAlchemy.
- `frontend`: aplicación móvil con Expo y React Native.

## Estructura general

```text
backend/
  app/        Código principal de la API
  alembic/    Migraciones de base de datos
  scripts/    Scripts de carga e importación de alimentos
  tests/      Pruebas del backend

frontend/
  app/        Pantallas y navegación con Expo Router
  components/ Componentes reutilizables
  services/   Comunicación con la API
  types/      Tipos compartidos del frontend
  __tests__/  Pruebas del frontend
```

## Puesta en marcha

Primero hay que levantar el backend. Necesita una base de datos PostgreSQL y un fichero `backend/.env`, que se puede crear copiando `backend/.env.example`.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"
alembic upgrade head
python scripts/seed_foods.py
fastapi dev app/main.py
```

Después se arranca el frontend. También tiene su propio `.env`, basado en `frontend/.env.example`.

```bash
cd frontend
npm install
npm run start
```

Para conectar ambos en local, el frontend debe apuntar a la API:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

## Comandos útiles

Backend:

```bash
pytest
pytest --cov=app
alembic upgrade head
python scripts/import_openfoodfacts.py --limit 1000 --page-size 25
```

Frontend:

```bash
npm run start
npm run android
npm run ios
npm run web
npm run test
npm run lint
```

## Notas

Las claves de Gemini, Google OAuth y SMTP no son necesarias para revisar toda la estructura, pero sí para probar esas integraciones completas. La importación de alimentos usa Open Food Facts, por lo que depende de su disponibilidad y conviene usar límites bajos durante pruebas locales.
