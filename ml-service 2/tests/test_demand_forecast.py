import pandas as pd
from datetime import timedelta

from app.models.demand_forecast import DemandForecastModel


def _build_sample_ts(start="2023-12-01", end="2024-01-31"):
    date_range = pd.date_range(start=start, end=end, freq="D")
    return pd.DataFrame({
        "ds": date_range,
        "y": range(len(date_range))
    })


def test_holiday_frame_includes_major_travel_days():
    model = DemandForecastModel()
    holidays = model._build_holiday_frame(_build_sample_ts())

    assert holidays is not None
    assert not holidays.empty
    assert "new_years_day" in holidays["holiday"].values


def test_relative_holiday_offsets_are_respected():
    model = DemandForecastModel()
    holidays = model._build_holiday_frame(_build_sample_ts())
    thanksgiving = holidays[holidays["holiday"] == "thanksgiving"].iloc[0]
    black_friday = holidays[holidays["holiday"] == "black_friday"].iloc[0]

    assert black_friday["ds"] - thanksgiving["ds"] == timedelta(days=1)
