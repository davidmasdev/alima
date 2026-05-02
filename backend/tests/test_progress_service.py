from datetime import date

from app.services.progress import build_days, calculate_compliance, calculate_streak


def test_calculate_compliance_uses_ten_percent_margin() -> None:
    assert calculate_compliance(1900, 2000, True) is True
    assert calculate_compliance(2200, 2000, True) is True
    assert calculate_compliance(1799, 2000, True) is False
    assert calculate_compliance(2201, 2000, True) is False
    assert calculate_compliance(0, 2000, False) is None


def test_build_days_marks_registered_and_empty_days() -> None:
    days = build_days(
        {date(2026, 5, 1): 1900},
        date(2026, 5, 1),
        date(2026, 5, 2),
        2000,
    )

    assert len(days) == 2
    assert days[0].registrado is True
    assert days[0].cumplido is True
    assert days[1].registrado is False
    assert days[1].cumplido is None


def test_calculate_streak_counts_completed_days_from_end() -> None:
    days = build_days(
        {
            date(2026, 5, 1): 2500,
            date(2026, 5, 2): 2000,
            date(2026, 5, 3): 1900,
        },
        date(2026, 5, 1),
        date(2026, 5, 3),
        2000,
    )

    assert calculate_streak(days) == 2
