"""Configuration management for ML service."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Service Configuration
    app_name: str = "Urban Manual ML Service"
    app_version: str = "1.0.0"
    log_level: str = "INFO"

    # Supabase Configuration
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # PostgreSQL Direct Connection
    postgres_url: str

    # ML Model Configuration
    lightfm_epochs: int = 50
    lightfm_threads: int = 4
    prophet_seasonality_mode: str = "multiplicative"
    cache_ttl_hours: int = 24
    anomaly_traffic_lookback_days: int = 30
    anomaly_sentiment_lookback_days: int = 45
    anomaly_city_lookback_days: int = 30
    anomaly_traffic_contamination: float = 0.1
    anomaly_city_contamination: float = 0.1

    # Performance
    max_requests_per_minute: int = 60

    # Topic modeling / NLP configuration
    topic_min_documents_city: int = 20
    topic_min_documents_destination: int = 5
    topic_text_lookback_days: int = 365
    topic_preprocess_batch_size: int = 500

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
