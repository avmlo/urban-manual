"""Tests for the sentiment analysis model."""

import os
import sys
from pathlib import Path
from dataclasses import dataclass
import types

# Ensure ml-service/app is importable
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

if "transformers" not in sys.modules:  # pragma: no cover - test shim
    transformers_stub = types.ModuleType("transformers")
    transformers_stub.pipeline = lambda *args, **kwargs: None
    sys.modules["transformers"] = transformers_stub

if "numpy" not in sys.modules:  # pragma: no cover - test shim
    numpy_stub = types.ModuleType("numpy")

    def _mean(values):
        return sum(values) / len(values) if values else 0.0

    numpy_stub.mean = _mean
    sys.modules["numpy"] = numpy_stub

if "pydantic_settings" not in sys.modules:  # pragma: no cover - test shim
    pydantic_stub = types.ModuleType("pydantic_settings")

    class BaseSettings:  # type: ignore
        def __init__(self, **kwargs):
            annotations = getattr(self, "__annotations__", {})
            for field in annotations:
                env_key = field.upper()
                if field in kwargs:
                    value = kwargs[field]
                elif env_key in os.environ:
                    value = os.environ[env_key]
                elif hasattr(self.__class__, field):
                    value = getattr(self.__class__, field)
                else:
                    value = None
                setattr(self, field, value)

    pydantic_stub.BaseSettings = BaseSettings
    sys.modules["pydantic_settings"] = pydantic_stub

if "psycopg2" not in sys.modules:  # pragma: no cover - test shim
    psycopg_stub = types.ModuleType("psycopg2")

    class _ThreadedConnectionPool:  # pragma: no cover - helper
        def __init__(self, *args, **kwargs):
            pass

        def getconn(self):
            raise RuntimeError("Database access not available in tests")

        def putconn(self, conn):
            return None

        def closeall(self):
            return None

    psycopg_stub.pool = types.SimpleNamespace(ThreadedConnectionPool=_ThreadedConnectionPool)
    sys.modules["psycopg2"] = psycopg_stub

if "pythonjsonlogger" not in sys.modules:  # pragma: no cover - test shim
    json_logger_stub = types.ModuleType("pythonjsonlogger")

    class _JsonFormatter:  # pragma: no cover - helper
        def __init__(self, *args, **kwargs):
            pass

        def format(self, record):
            return record.getMessage() if hasattr(record, "getMessage") else str(record)

    json_logger_stub.jsonlogger = types.SimpleNamespace(JsonFormatter=_JsonFormatter)
    sys.modules["pythonjsonlogger"] = json_logger_stub

if "pandas" not in sys.modules:  # pragma: no cover - test shim
    pandas_stub = types.ModuleType("pandas")

    class _StubDataFrame(list):  # pragma: no cover - helper
        def __init__(self, data=None, columns=None):
            super().__init__(data or [])
            self.columns = columns or []

        @property
        def empty(self):
            return len(self) == 0

    def _read_sql_query(*args, **kwargs):
        raise RuntimeError("Database access not available in tests")

    pandas_stub.DataFrame = _StubDataFrame
    pandas_stub.read_sql_query = _read_sql_query
    sys.modules["pandas"] = pandas_stub

# Provide dummy environment configuration for pydantic settings
os.environ.setdefault("SUPABASE_URL", "http://localhost")
os.environ.setdefault("SUPABASE_ANON_KEY", "test")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test")
os.environ.setdefault("POSTGRES_URL", "postgres://user:pass@localhost:5432/postgres")

from app.models.sentiment import SentimentAnalysisModel
from app.utils.data_fetcher import DataFetcher


@dataclass
class FakeSeries:
    values: list

    def tolist(self):  # pragma: no cover - helper
        return list(self.values)


class FakeDataFrame:
    def __init__(self, rows):
        self._rows = rows

    @property
    def empty(self):  # pragma: no cover - helper
        return len(self._rows) == 0

    def __len__(self):
        return len(self._rows)

    def __getitem__(self, key):  # pragma: no cover - helper
        return FakeSeries([row.get(key) for row in self._rows])


def test_fetch_destination_texts_cleaning_and_limits(monkeypatch):
    """_fetch_destination_texts should clean, deduplicate, and paginate text."""

    monkeypatch.setattr(SentimentAnalysisModel, "_load_model", lambda self: None)
    model = SentimentAnalysisModel()
    model.TEXT_PAGE_SIZE = 2
    model.MAX_TEXTS = 3

    page_size = model.TEXT_PAGE_SIZE

    page_one = FakeDataFrame([
        {
            "text": "### **Incredible** stay! <br> Loved it.",
            "source": "saved_places",
        },
        {
            "text": "Visit [site](https://example.com) ASAP _now_",
            "source": "visited_places",
        },
    ])

    long_text = "a" * 800
    page_two = FakeDataFrame([
        {
            "text": "### **Incredible** stay! <br> Loved it.",
            "source": "reviews",
        },
        {
            "text": long_text,
            "source": "reviews",
        },
    ])

    empty_page = FakeDataFrame([])

    def fake_fetch(destination_id, days, limit, offset):  # pragma: no cover - helper
        if offset == 0:
            return page_one
        if offset == page_size:
            return page_two
        return empty_page

    monkeypatch.setattr(DataFetcher, "fetch_destination_texts", staticmethod(fake_fetch))

    cleaned = model._fetch_destination_texts(destination_id=1, days=30)

    assert len(cleaned) == 3  # Duplicate entries removed
    assert cleaned[0] == "Incredible stay! Loved it."
    assert cleaned[1] == "Visit site ASAP now"
    assert len(cleaned[2]) == model.TEXT_MAX_LENGTH
    assert all("http" not in text for text in cleaned)


def test_analyze_destination_sentiment_counts(monkeypatch):
    """Analyze sentiment should differ when destination has no text."""

    monkeypatch.setattr(SentimentAnalysisModel, "_load_model", lambda self: None)
    model = SentimentAnalysisModel()

    class DummyAnalyzer:
        def __call__(self, texts, batch_size=32, truncation=True):  # pragma: no cover - helper
            return [
                {
                    "label": "POSITIVE" if "love" in text else "NEGATIVE",
                    "score": 0.9 if "love" in text else 0.6,
                }
                for text in texts
            ]

    model.analyzer = DummyAnalyzer()

    def fake_fetch(self, destination_id, days):  # pragma: no cover - helper
        if destination_id == 1:
            return ["I love this place", "Not my favorite"]
        return []

    monkeypatch.setattr(SentimentAnalysisModel, "_fetch_destination_texts", fake_fetch)

    populated = model.analyze_destination_sentiment(destination_id=1)
    empty = model.analyze_destination_sentiment(destination_id=2)

    assert populated["positive_count"] == 1
    assert populated["negative_count"] == 1
    assert populated["total_reviews"] == 2
    assert empty["total_reviews"] == 0
    assert empty["positive_count"] == 0
