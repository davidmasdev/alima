from fastapi import APIRouter

from app.api import analysis
from app.api import auth
from app.api import daily_log
from app.api import foods
from app.api import meal_types
from app.api import profile
from app.api import progress
from app.api import recommendations
from app.api import templates


api_router = APIRouter()
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(daily_log.router, prefix="/daily-log", tags=["daily-log"])
api_router.include_router(foods.router, prefix="/foods", tags=["foods"])
api_router.include_router(meal_types.router, prefix="/meal-types", tags=["meal-types"])
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])
api_router.include_router(progress.router, prefix="/progress", tags=["progress"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations"])
api_router.include_router(templates.router, prefix="/templates", tags=["templates"])
