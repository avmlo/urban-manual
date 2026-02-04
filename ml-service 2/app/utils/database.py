"""Database connection utilities for Supabase PostgreSQL."""

import psycopg2
from psycopg2 import pool
from contextlib import contextmanager
from typing import Generator
import os
from urllib.parse import urlparse

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

# Connection pool
_connection_pool = None


def init_db_pool(minconn: int = 1, maxconn: int = 10):
    """
    Initialize database connection pool.

    Args:
        minconn: Minimum number of connections
        maxconn: Maximum number of connections
    """
    global _connection_pool

    if _connection_pool is None:
        try:
            # Parse PostgreSQL URL
            db_url = settings.postgres_url
            parsed = urlparse(db_url)

            _connection_pool = psycopg2.pool.ThreadedConnectionPool(
                minconn,
                maxconn,
                user=parsed.username,
                password=parsed.password,
                host=parsed.hostname,
                port=parsed.port or 5432,
                database=parsed.path[1:] if parsed.path else 'postgres',
                sslmode='require'
            )
            logger.info("Database connection pool initialized")
        except Exception as e:
            logger.error(f"Failed to initialize database pool: {e}")
            raise


def get_db_pool():
    """Get the database connection pool."""
    if _connection_pool is None:
        init_db_pool()
    return _connection_pool


@contextmanager
def get_db_connection() -> Generator:
    """
    Context manager for database connections.

    Yields:
        psycopg2 connection object

    Example:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM destinations")
                results = cur.fetchall()
    """
    pool = get_db_pool()
    conn = None

    try:
        conn = pool.getconn()
        yield conn
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        if conn:
            pool.putconn(conn)


def close_db_pool():
    """Close all database connections in the pool."""
    global _connection_pool
    if _connection_pool:
        _connection_pool.closeall()
        _connection_pool = None
        logger.info("Database connection pool closed")
