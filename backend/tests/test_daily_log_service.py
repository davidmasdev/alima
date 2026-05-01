from uuid import uuid4

from app.models.alimento import Alimento
from app.models.registro import Registro
from app.services.daily_log import calculate_entry


def test_calculate_entry_scales_nutrients_by_quantity() -> None:
    food = Alimento(
        nombre="Arroz blanco",
        calorias=130,
        proteinas=2.7,
        carbohidratos=28,
        grasas=0.3,
        unidad_base="g",
    )
    food.id = uuid4()
    entry = Registro(alimento=food, cantidad=195, unidad="g")
    entry.id = uuid4()

    response = calculate_entry(food, entry)

    assert response.calorias == 253.5
    assert response.proteinas == 5.27
    assert response.carbohidratos == 54.6
    assert response.grasas == 0.58

