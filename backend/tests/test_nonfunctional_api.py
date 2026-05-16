from time import perf_counter

from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint_responds_under_two_seconds() -> None:
    client = TestClient(app)
    durations: list[float] = []

    for _ in range(50):
        start = perf_counter()
        response = client.get("/health")
        durations.append(perf_counter() - start)

        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    assert max(durations) < 2
