import os
import sys
import json
from pathlib import Path

import pytest

try:
    from fastapi.testclient import TestClient
except ModuleNotFoundError:  # pragma: no cover - dependency not available in CI image
    pytest.skip("fastapi is required for sequence endpoint tests", allow_module_level=True)

# Ensure required environment variables exist before importing the app
os.environ.setdefault("SUPABASE_URL", "http://localhost")
os.environ.setdefault("SUPABASE_ANON_KEY", "test")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test")
os.environ.setdefault("POSTGRES_URL", "postgres://user:pass@localhost:5432/db")

APP_DIR = Path(__file__).resolve().parents[1] / "app"
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

from app.main import app  # noqa: E402
from app.models import sequence_models  # noqa: E402


@pytest.fixture
def analyzer(tmp_path):
    instance = sequence_models.BrowsingPatternAnalyzer()
    instance.model_state_path = tmp_path / "sequence_model_state.json"
    sequence_models._browsing_analyzer_instance = instance
    return instance


@pytest.fixture
def client(analyzer):
    with TestClient(app) as test_client:
        yield test_client


def test_analyze_session_with_empty_actions(client):
    payload = {"user_id": "user-1", "session_actions": []}
    response = client.post("/api/sequence/analyze-session", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["session_length"] == 0
    assert data["patterns"]["most_common_action"] is None
    assert data["predictions"] == []


def test_analyze_session_with_actions(client):
    payload = {
        "user_id": "user-2",
        "session_actions": [
            {"action": "view", "ts": "2024-01-01T00:00:00Z"},
            {"action": "view", "ts": "2024-01-01T00:05:00Z"},
            {"action": "save", "ts": "2024-01-01T00:07:00Z"},
        ],
    }
    response = client.post("/api/sequence/analyze-session", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["session_length"] == 3
    assert data["patterns"]["most_common_action"] == "view"
    assert data["patterns"]["action_transitions"]["view -> save"] == 1


def test_train_sequence_model_with_no_sequences(client, monkeypatch):
    def fake_fetch(self, days):
        assert days == 30
        return []

    monkeypatch.setattr(
        sequence_models.BrowsingPatternAnalyzer,
        "_fetch_browsing_sequences",
        fake_fetch,
    )

    response = client.post("/api/sequence/train")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "no_data"
    assert data["metadata"]["sequence_count"] == 0
    assert data["metadata"]["context_count"] == 0
    assert data["metadata"]["model_path"] is None


def test_train_sequence_model_with_sequences(client, monkeypatch, analyzer):
    sequences = [
        ["view", "view", "click", "save"],
        ["view", "click", "click"],
    ]

    def fake_fetch(self, days):
        assert days == 14
        return sequences

    monkeypatch.setattr(
        sequence_models.BrowsingPatternAnalyzer,
        "_fetch_browsing_sequences",
        fake_fetch,
    )

    response = client.post("/api/sequence/train", params={"days": 14})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "trained"
    assert data["metadata"]["sequence_count"] == len(sequences)
    assert data["metadata"]["context_count"] > 0
    model_path = data["metadata"]["model_path"]
    assert model_path
    persisted = Path(model_path)
    assert persisted.exists()
    saved_state = json.loads(persisted.read_text())
    assert saved_state["metadata"]["sequence_count"] == len(sequences)
    assert len(saved_state["transition_matrix"]) == data["metadata"]["context_count"]
