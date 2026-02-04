"""Shared pytest fixtures for the ML service tests."""

import os
import sys
import types
from pathlib import Path

# Ensure required environment variables exist before importing application modules.
DEFAULT_ENV_VARS = {
    "SUPABASE_URL": "http://localhost",
    "SUPABASE_ANON_KEY": "test-key",
    "SUPABASE_SERVICE_ROLE_KEY": "service-key",
    "POSTGRES_URL": "postgresql://user:pass@localhost:5432/postgres",
}

for key, value in DEFAULT_ENV_VARS.items():
    os.environ.setdefault(key, value)


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def _ensure_stub_module(name: str, class_name: str):
    """Create a lightweight stub module if the dependency is missing."""

    if name in sys.modules:
        return

    module = types.ModuleType(name)

    class _Stub:  # type: ignore
        def __init__(self, *_, **__):
            raise RuntimeError(
                f"Stub for {name}.{class_name} was used. Install the real dependency for production use."
            )

    setattr(module, class_name, _Stub)
    sys.modules[name] = module


_ensure_stub_module("bertopic", "BERTopic")
_ensure_stub_module("sentence_transformers", "SentenceTransformer")


def _ensure_pandas_stub():
    if "pandas" in sys.modules:
        return

    module = types.ModuleType("pandas")

    def _read_sql_query(*_, **__):  # pragma: no cover - stub for offline tests
        raise RuntimeError("pandas is required for database queries in production")

    class _DataFrame(list):
        pass

    module.read_sql_query = _read_sql_query
    module.DataFrame = _DataFrame
    sys.modules["pandas"] = module


def _ensure_pydantic_settings_stub():
    if "pydantic_settings" in sys.modules:
        return

    module = types.ModuleType("pydantic_settings")

    class BaseSettings:  # type: ignore
        def __init__(self, **values):
            annotations = getattr(self.__class__, "__annotations__", {})
            for field in annotations:
                env_key = field.upper()
                if field in values:
                    value = values[field]
                elif env_key in os.environ:
                    value = os.environ[env_key]
                else:
                    value = getattr(self.__class__, field, None)
                setattr(self, field, value)

    module.BaseSettings = BaseSettings
    sys.modules["pydantic_settings"] = module


_ensure_pandas_stub()
_ensure_pydantic_settings_stub()


def _ensure_sklearn_stub():
    if "sklearn.feature_extraction.text" in sys.modules:
        return

    sklearn_module = types.ModuleType("sklearn")
    feature_extraction = types.ModuleType("sklearn.feature_extraction")
    text_module = types.ModuleType("sklearn.feature_extraction.text")
    text_module.ENGLISH_STOP_WORDS = {"a", "the", "and", "is", "in"}

    sys.modules["sklearn"] = sklearn_module
    sys.modules["sklearn.feature_extraction"] = feature_extraction
    sys.modules["sklearn.feature_extraction.text"] = text_module


_ensure_sklearn_stub()


def _ensure_psycopg_stub():
    if "psycopg2" in sys.modules:
        return

    module = types.ModuleType("psycopg2")
    pool_module = types.ModuleType("psycopg2.pool")

    class ThreadedConnectionPool:  # type: ignore
        def __init__(self, *_, **__):
            raise RuntimeError("Database access is not available in test stubs")

        def closeall(self):
            pass

    pool_module.ThreadedConnectionPool = ThreadedConnectionPool
    module.pool = pool_module
    sys.modules["psycopg2"] = module
    sys.modules["psycopg2.pool"] = pool_module


_ensure_psycopg_stub()


def _ensure_jsonlogger_stub():
    if "pythonjsonlogger" in sys.modules:
        return

    module = types.ModuleType("pythonjsonlogger")

    class _JsonLogger:  # type: ignore
        def __init__(self, *_, **__):
            pass

        def format(self, record):
            return getattr(record, "msg", "")

    module.jsonlogger = types.SimpleNamespace(JsonFormatter=_JsonLogger)
    sys.modules["pythonjsonlogger"] = module


_ensure_jsonlogger_stub()
