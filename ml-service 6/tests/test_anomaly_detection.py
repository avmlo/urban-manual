"""Unit tests for anomaly detection endpoints."""

import os
from datetime import datetime, timedelta
from typing import List

import pytest

# Ensure required environment variables exist before importing settings
os.environ.setdefault("supabase_url", "https://example.supabase.co")
os.environ.setdefault("supabase_anon_key", "test")
os.environ.setdefault("supabase_service_role_key", "test")
os.environ.setdefault("postgres_url", "postgres://user:pass@localhost:5432/db")

from app.models.anomaly_detection import AnomalyDetectionModel  # noqa: E402


def _build_daily_records(days: int, base_value: float, spike_index: int, spike_multiplier: float, keys: List[str]):
    start_date = datetime.utcnow().date() - timedelta(days=days - 1)
    records = []
    for i in range(days):
        day = datetime.combine(start_date + timedelta(days=i), datetime.min.time())
        multiplier = spike_multiplier if i == spike_index else 1.0
        record = {'date': day}
        for key in keys:
            record[key] = base_value * multiplier
        records.append(record)
    return records


def test_detect_traffic_anomalies_detects_spike(monkeypatch):
    model = AnomalyDetectionModel()
    metrics = _build_daily_records(
        days=14,
        base_value=100.0,
        spike_index=10,
        spike_multiplier=6.0,
        keys=['views', 'saves', 'clicks', 'visits']
    )

    monkeypatch.setattr(model, '_fetch_traffic_metrics', lambda destination_id, days: metrics)

    result = model.detect_traffic_anomalies(destination_id=1, days=14, contamination=0.15)

    assert result['anomaly_count'] >= 1
    assert any(a['metrics']['views'] == pytest.approx(600.0) for a in result['anomalies'])


def test_detect_sentiment_anomalies_detects_drop(monkeypatch):
    model = AnomalyDetectionModel()
    history = _build_daily_records(
        days=14,
        base_value=0.4,
        spike_index=7,
        spike_multiplier=-3.0,
        keys=['sentiment_score']
    )

    monkeypatch.setattr(model, '_fetch_sentiment_history', lambda destination_id, days: history)

    result = model.detect_sentiment_anomalies(destination_id=5, days=14)

    assert result['anomaly_count'] >= 1
    assert any(a['sentiment_score'] < 0 for a in result['anomalies'])


def test_detect_city_anomalies_detects_citywide_surge(monkeypatch):
    model = AnomalyDetectionModel()
    metrics = _build_daily_records(
        days=20,
        base_value=1000.0,
        spike_index=5,
        spike_multiplier=4.0,
        keys=['total_views', 'total_saves', 'total_visits']
    )

    monkeypatch.setattr(model, '_fetch_city_metrics', lambda city, days: metrics)

    result = model.detect_city_anomalies(city="Tokyo", days=20, contamination=0.2)

    assert result['anomaly_count'] >= 1
    assert any(a['metrics']['total_views'] == pytest.approx(4000.0) for a in result['anomalies'])
