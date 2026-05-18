# Backend de Alima

Este backend expone la API REST de Alima. Gestiona usuarios, autenticación, perfil nutricional, comidas diarias, plantillas, progreso, escaneo de productos, recomendaciones y análisis con IA.

Está hecho con FastAPI, SQLAlchemy, PostgreSQL y Alembic.

## Estructura

- `app/main.py`: crea la aplicación FastAPI y registra las rutas bajo `/api`.
- `app/api`: endpoints agrupados por funcionalidad.
- `app/services`: lógica de negocio, cálculos nutricionales, IA, emails e importación de alimentos.
- `app/models`: modelos SQLAlchemy.
- `app/schemas`: modelos Pydantic usados en peticiones y respuestas.
- `app/core`: configuración, JWT y utilidades de seguridad.
- `app/db`: base declarativa y sesión de base de datos.
- `alembic`: migraciones.
- `scripts`: carga inicial e importación desde Open Food Facts.
- `tests`: pruebas unitarias y de servicios.

## Configuración local

Hace falta tener PostgreSQL instalado y una base de datos, por ejemplo `alima`.

```bash
cp .env.example .env
```

En Windows, la instalación habitual es:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"
```

Después se aplican las migraciones:

```bash
alembic upgrade head
```

Para cargar alimentos básicos de prueba:

```bash
python scripts/seed_foods.py
```

También se pueden importar productos desde Open Food Facts:

```bash
python scripts/import_openfoodfacts.py --limit 1000 --page-size 25
```

Si la importación tarda o falla por carga del servicio, conviene bajar el límite o filtrar:

```bash
python scripts/import_openfoodfacts.py --stores mercadona,aldi,lidl --limit 500
python scripts/import_openfoodfacts.py --brands hacendado,milbona --limit 500
```

## Arranque

```bash
fastapi dev app/main.py
```

La API queda disponible en `http://localhost:8000/api`. Para usarla con Expo en local, revisa estas variables:

```env
BACKEND_CORS_ORIGINS=http://localhost:8081,http://localhost:19006
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

## Comandos útiles

```bash
pytest
pytest --cov=app
alembic upgrade head
alembic revision --autogenerate -m "descripción"
```

## Integraciones

Las variables de Gemini, Google OAuth y SMTP están en `.env.example`. Si están vacías, se puede seguir trabajando con la mayoría del backend, pero no se probarán esas integraciones completas.

Los datos de Open Food Facts se reutilizan bajo su licencia. Si se usa el catálogo importado en una entrega o producto, hay que mantener la atribución correspondiente.
