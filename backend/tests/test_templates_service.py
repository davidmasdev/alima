from uuid import uuid4

from app.models.alimento import Alimento
from app.models.plantilla import Plantilla
from app.models.registro_plantilla import RegistroPlantilla
from app.services.templates import _template_to_response


def test_template_response_sums_item_nutrients() -> None:
    food = Alimento(
        nombre="Avena",
        calorias=380,
        proteinas=13,
        carbohidratos=67,
        grasas=7,
        unidad_base="g",
    )
    food.id = uuid4()
    template = Plantilla(usuario_id=uuid4(), nombre="Desayuno", calorias=0)
    template.id = uuid4()
    item = RegistroPlantilla(
        plantilla=template,
        alimento=food,
        cantidad=50,
        unidad="g",
    )
    item.id = uuid4()
    item.alimento_id = food.id
    template.registros = [item]

    response = _template_to_response(template)

    assert response.calorias == 190
    assert response.proteinas == 6.5
    assert response.carbohidratos == 33.5
    assert response.grasas == 3.5
    assert response.items[0].alimento_nombre == "Avena"
