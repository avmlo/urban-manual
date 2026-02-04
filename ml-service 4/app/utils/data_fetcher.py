"""Data fetching utilities from Supabase."""

import pandas as pd
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta

from app.utils.database import get_db_connection
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DataFetcher:
    """Fetch and prepare data from Supabase for ML models."""

    @staticmethod
    def fetch_user_interactions() -> pd.DataFrame:
        """
        Fetch user-destination interactions from Supabase.

        Combines data from:
        - visited_places (weight: 3.0)
        - saved_places (weight: 2.0)
        - user_interactions where type='view' (weight: 1.0)

        Returns:
            DataFrame with columns: user_id, destination_id, interaction_weight, timestamp
        """
        logger.info("Fetching user interactions from Supabase")

        query = """
        WITH visited AS (
            SELECT
                vp.user_id,
                d.id as destination_id,
                3.0 as weight,
                vp.visited_at as timestamp,
                'visit' as interaction_type
            FROM visited_places vp
            JOIN destinations d ON d.slug = vp.destination_slug
            WHERE vp.visited_at >= NOW() - INTERVAL '6 months'
        ),
        saved AS (
            SELECT
                sp.user_id,
                d.id as destination_id,
                2.0 as weight,
                sp.saved_at as timestamp,
                'save' as interaction_type
            FROM saved_places sp
            JOIN destinations d ON d.slug = sp.destination_slug
            WHERE sp.saved_at >= NOW() - INTERVAL '6 months'
        ),
        views AS (
            SELECT
                ui.user_id,
                ui.destination_id,
                1.0 as weight,
                ui.created_at as timestamp,
                'view' as interaction_type
            FROM user_interactions ui
            WHERE ui.interaction_type = 'view'
            AND ui.created_at >= NOW() - INTERVAL '3 months'
        )
        SELECT
            user_id,
            destination_id,
            weight,
            timestamp,
            interaction_type
        FROM visited
        UNION ALL
        SELECT * FROM saved
        UNION ALL
        SELECT * FROM views
        ORDER BY timestamp DESC
        """

        try:
            with get_db_connection() as conn:
                df = pd.read_sql_query(query, conn)

            logger.info(f"Fetched {len(df)} interactions for {df['user_id'].nunique()} users")
            return df

        except Exception as e:
            logger.error(f"Error fetching user interactions: {e}")
            raise

    @staticmethod
    def fetch_user_features() -> pd.DataFrame:
        """
        Fetch user profile features.

        Returns:
            DataFrame with columns: user_id, favorite_cities, favorite_categories,
                                   price_preference, travel_style
        """
        logger.info("Fetching user features from Supabase")

        query = """
        SELECT
            user_id,
            favorite_cities,
            favorite_categories,
            price_preference,
            travel_style,
            interests
        FROM user_profiles
        WHERE user_id IS NOT NULL
        """

        try:
            with get_db_connection() as conn:
                df = pd.read_sql_query(query, conn)

            logger.info(f"Fetched features for {len(df)} users")
            return df

        except Exception as e:
            logger.error(f"Error fetching user features: {e}")
            raise

    @staticmethod
    def fetch_destination_features() -> pd.DataFrame:
        """
        Fetch destination features for item-based filtering.

        Returns:
            DataFrame with columns: id, city, category, michelin_stars,
                                   price_level, rating, tags
        """
        logger.info("Fetching destination features from Supabase")

        query = """
        SELECT
            id,
            slug,
            name,
            city,
            category,
            COALESCE(michelin_stars, 0) as michelin_stars,
            COALESCE(price_level, 2) as price_level,
            COALESCE(rating, 0) as rating,
            tags,
            crown
        FROM destinations
        WHERE id IS NOT NULL
        ORDER BY id
        """

        try:
            with get_db_connection() as conn:
                df = pd.read_sql_query(query, conn)

            logger.info(f"Fetched features for {len(df)} destinations")
            return df

        except Exception as e:
            logger.error(f"Error fetching destination features: {e}")
            raise

    @staticmethod
    def fetch_city_topic_texts(city: str, lookback_days: int = 365) -> pd.DataFrame:
        """Fetch descriptions, tags, and user notes for a city."""
        logger.info(f"Fetching topic texts for city {city} (last {lookback_days} days)")

        query = """
        WITH city_destinations AS (
            SELECT
                id,
                slug,
                city,
                content,
                tags,
                COALESCE(updated_at, created_at, NOW()) AS last_updated
            FROM destinations
            WHERE LOWER(city) = LOWER(%s)
        )
        SELECT text, source, ts
        FROM (
            SELECT
                content AS text,
                'destination_content' AS source,
                last_updated AS ts
            FROM city_destinations
            UNION ALL
            SELECT
                array_to_string(tags, ', ') AS text,
                'destination_tags' AS source,
                last_updated AS ts
            FROM city_destinations
            UNION ALL
            SELECT
                sp.notes AS text,
                'saved_note' AS source,
                sp.saved_at AS ts
            FROM saved_places sp
            JOIN destinations d ON d.slug = sp.destination_slug
            WHERE LOWER(d.city) = LOWER(%s)
              AND sp.saved_at >= NOW() - INTERVAL '1 day' * %s
            UNION ALL
            SELECT
                array_to_string(sp.tags, ', ') AS text,
                'saved_tags' AS source,
                sp.saved_at AS ts
            FROM saved_places sp
            JOIN destinations d ON d.slug = sp.destination_slug
            WHERE LOWER(d.city) = LOWER(%s)
              AND sp.saved_at >= NOW() - INTERVAL '1 day' * %s
            UNION ALL
            SELECT
                vp.notes AS text,
                'visited_note' AS source,
                vp.visited_at AS ts
            FROM visited_places vp
            JOIN destinations d ON d.slug = vp.destination_slug
            WHERE LOWER(d.city) = LOWER(%s)
              AND vp.visited_at >= NOW() - INTERVAL '1 day' * %s
        ) AS combined
        WHERE text IS NOT NULL AND LENGTH(TRIM(text)) > 0
        ORDER BY ts DESC
        """

        params = [city, city, lookback_days, city, lookback_days, city, lookback_days]

        try:
            with get_db_connection() as conn:
                df = pd.read_sql_query(query, conn, params=params)

            logger.info(f"Fetched {len(df)} text snippets for city {city}")
            return df
        except Exception as e:
            logger.error(f"Error fetching city topic texts: {e}")
            raise

    @staticmethod
    def fetch_destination_topic_texts(destination_id: int, lookback_days: int = 365) -> pd.DataFrame:
        """Fetch descriptions, tags, and user notes for a destination."""
        logger.info(
            f"Fetching topic texts for destination {destination_id} (last {lookback_days} days)"
        )

        query = """
        WITH target_destination AS (
            SELECT
                id,
                slug,
                content,
                tags,
                COALESCE(updated_at, created_at, NOW()) AS last_updated
            FROM destinations
            WHERE id = %s
        )
        SELECT text, source, ts
        FROM (
            SELECT
                content AS text,
                'destination_content' AS source,
                last_updated AS ts
            FROM target_destination
            UNION ALL
            SELECT
                array_to_string(tags, ', ') AS text,
                'destination_tags' AS source,
                last_updated AS ts
            FROM target_destination
            UNION ALL
            SELECT
                sp.notes AS text,
                'saved_note' AS source,
                sp.saved_at AS ts
            FROM saved_places sp
            JOIN target_destination td ON td.slug = sp.destination_slug
            WHERE sp.saved_at >= NOW() - INTERVAL '1 day' * %s
            UNION ALL
            SELECT
                array_to_string(sp.tags, ', ') AS text,
                'saved_tags' AS source,
                sp.saved_at AS ts
            FROM saved_places sp
            JOIN target_destination td ON td.slug = sp.destination_slug
            WHERE sp.saved_at >= NOW() - INTERVAL '1 day' * %s
            UNION ALL
            SELECT
                vp.notes AS text,
                'visited_note' AS source,
                vp.visited_at AS ts
            FROM visited_places vp
            JOIN target_destination td ON td.slug = vp.destination_slug
            WHERE vp.visited_at >= NOW() - INTERVAL '1 day' * %s
        ) AS combined
        WHERE text IS NOT NULL AND LENGTH(TRIM(text)) > 0
        ORDER BY ts DESC
        """

        params = [destination_id, lookback_days, lookback_days, lookback_days]

        try:
            with get_db_connection() as conn:
                df = pd.read_sql_query(query, conn, params=params)

            logger.info(f"Fetched {len(df)} text snippets for destination {destination_id}")
            return df
        except Exception as e:
            logger.error(f"Error fetching destination topic texts: {e}")
            raise

    @staticmethod
    def fetch_analytics_data(days: int = 180) -> pd.DataFrame:
        """
        Fetch analytics data for demand forecasting.

        Args:
            days: Number of days of historical data to fetch

        Returns:
            DataFrame with columns: destination_id, date, view_count, save_count, visit_count
        """
        logger.info(f"Fetching analytics data for last {days} days")

        query = """
        WITH daily_views AS (
            SELECT
                destination_id,
                DATE(created_at) as date,
                COUNT(*) as view_count
            FROM user_interactions
            WHERE interaction_type = 'view'
            AND created_at >= NOW() - INTERVAL '%s days'
            GROUP BY destination_id, DATE(created_at)
        ),
        daily_saves AS (
            SELECT
                d.id as destination_id,
                DATE(sp.saved_at) as date,
                COUNT(*) as save_count
            FROM saved_places sp
            JOIN destinations d ON d.slug = sp.destination_slug
            WHERE sp.saved_at >= NOW() - INTERVAL '%s days'
            GROUP BY d.id, DATE(sp.saved_at)
        ),
        daily_visits AS (
            SELECT
                d.id as destination_id,
                DATE(vp.visited_at) as date,
                COUNT(*) as visit_count
            FROM visited_places vp
            JOIN destinations d ON d.slug = vp.destination_slug
            WHERE vp.visited_at >= NOW() - INTERVAL '%s days'
            GROUP BY d.id, DATE(vp.visited_at)
        )
        SELECT
            COALESCE(v.destination_id, s.destination_id, vs.destination_id) as destination_id,
            COALESCE(v.date, s.date, vs.date) as date,
            COALESCE(v.view_count, 0) as view_count,
            COALESCE(s.save_count, 0) as save_count,
            COALESCE(vs.visit_count, 0) as visit_count
        FROM daily_views v
        FULL OUTER JOIN daily_saves s ON v.destination_id = s.destination_id AND v.date = s.date
        FULL OUTER JOIN daily_visits vs ON COALESCE(v.destination_id, s.destination_id) = vs.destination_id
            AND COALESCE(v.date, s.date) = vs.date
        ORDER BY date DESC, destination_id
        """

        try:
            with get_db_connection() as conn:
                df = pd.read_sql_query(query % (days, days, days), conn)

            logger.info(f"Fetched {len(df)} analytics records")
            return df

        except Exception as e:
            logger.error(f"Error fetching analytics data: {e}")
            raise

    @staticmethod
    def _table_exists(conn, table_name: str) -> bool:
        """Check if a table exists in the current database."""
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass(%s)", (f"public.{table_name}",))
            return cur.fetchone()[0] is not None

    @staticmethod
    def fetch_destination_texts(
        destination_id: int,
        days: int = 30,
        limit: int = 200,
        offset: int = 0
    ) -> pd.DataFrame:
        """Fetch user generated text for a destination.

        Combines notes from saved/visited places and long-form reviews when
        available. Results are ordered by recency and paginated via ``limit``
        and ``offset`` so higher level services can iterate through large
        histories without loading everything into memory at once.
        """

        if limit <= 0:
            return pd.DataFrame(columns=["text", "created_at", "source"])

        logger.info(
            "Fetching destination texts for %s (days=%s, limit=%s, offset=%s)",
            destination_id,
            days,
            limit,
            offset,
        )

        offset = max(offset, 0)

        try:
            with get_db_connection() as conn:
                include_reviews = DataFetcher._table_exists(conn, "reviews")

                reviews_union = ""
                if include_reviews:
                    reviews_union = """
                    UNION ALL
                    SELECT
                        r.content AS text,
                        r.created_at AS created_at,
                        'reviews' AS source
                    FROM reviews r
                    JOIN target_destination td ON r.destination_slug = td.slug
                    WHERE r.content IS NOT NULL
                      AND r.content <> ''
                      AND r.created_at >= NOW() - (%(days)s || ' days')::INTERVAL
                """

                query = f"""
                WITH target_destination AS (
                    SELECT id, slug
                    FROM destinations
                    WHERE id = %(destination_id)s
                ),
                saved AS (
                    SELECT
                        sp.notes AS text,
                        sp.saved_at AS created_at,
                        'saved_places' AS source
                    FROM saved_places sp
                    JOIN target_destination td ON sp.destination_slug = td.slug
                    WHERE sp.notes IS NOT NULL
                      AND sp.notes <> ''
                      AND sp.saved_at >= NOW() - (%(days)s || ' days')::INTERVAL
                ),
                visited AS (
                    SELECT
                        vp.notes AS text,
                        vp.visited_at AS created_at,
                        'visited_places' AS source
                    FROM visited_places vp
                    JOIN target_destination td ON vp.destination_slug = td.slug
                    WHERE vp.notes IS NOT NULL
                      AND vp.notes <> ''
                      AND vp.visited_at >= NOW() - (%(days)s || ' days')::INTERVAL
                ),
                combined AS (
                    SELECT * FROM saved
                    UNION ALL
                    SELECT * FROM visited
                    {reviews_union}
                )
                SELECT text, created_at, source
                FROM combined
                ORDER BY created_at DESC
                LIMIT %(limit)s OFFSET %(offset)s
                """

                params = {
                    "destination_id": destination_id,
                    "days": days,
                    "limit": limit,
                    "offset": offset,
                }

                df = pd.read_sql_query(query, conn, params=params)
                return df

        except Exception as e:
            logger.error(f"Error fetching destination texts: {e}")
            return pd.DataFrame(columns=["text", "created_at", "source"])

    @staticmethod
    def get_top_destinations(limit: int = 200) -> List[int]:
        """
        Get top N destinations by total interactions.

        Args:
            limit: Number of top destinations to return

        Returns:
            List of destination IDs
        """
        query = """
        WITH interaction_counts AS (
            SELECT
                destination_id,
                COUNT(*) as total_interactions
            FROM user_interactions
            WHERE created_at >= NOW() - INTERVAL '6 months'
            GROUP BY destination_id
        )
        SELECT destination_id
        FROM interaction_counts
        ORDER BY total_interactions DESC
        LIMIT %s
        """

        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, (limit,))
                    results = cur.fetchall()
                    destination_ids = [row[0] for row in results]

            logger.info(f"Fetched top {len(destination_ids)} destinations")
            return destination_ids

        except Exception as e:
            logger.error(f"Error fetching top destinations: {e}")
            raise

    @staticmethod
    def fetch_visit_history(days: int = 180) -> pd.DataFrame:
        """
        Fetch visit history for graph building.
        
        Args:
            days: Number of days of history to fetch
        
        Returns:
            DataFrame with columns: user_id, destination_id, visited_at
        """
        logger.info(f"Fetching visit history for last {days} days")

        query = """
        SELECT
            vp.user_id,
            d.id as destination_id,
            vp.visited_at
        FROM visited_places vp
        JOIN destinations d ON d.slug = vp.destination_slug
        WHERE vp.visited_at >= NOW() - INTERVAL '%s days'
        AND vp.user_id IS NOT NULL
        ORDER BY vp.user_id, vp.visited_at
        """

        try:
            with get_db_connection() as conn:
                df = pd.read_sql_query(query % days, conn)

            logger.info(f"Fetched {len(df)} visit records for {df['user_id'].nunique()} users")
            return df

        except Exception as e:
            logger.error(f"Error fetching visit history: {e}")
            raise

    @staticmethod
    def get_destination_location(destination_id: int) -> Optional[Dict[str, float]]:
        """
        Get location (lat/lng) for a destination.
        
        Args:
            destination_id: Destination ID
        
        Returns:
            Dict with 'lat' and 'lng' keys, or None if not found
        """
        query = """
        SELECT latitude, longitude
        FROM destinations
        WHERE id = %s
        """

        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, (destination_id,))
                    result = cur.fetchone()
                    if result and result[0] and result[1]:
                        return {'lat': float(result[0]), 'lng': float(result[1])}
            return None
        except Exception as e:
            logger.warning(f"Error fetching location for destination {destination_id}: {e}")
            return None

    @staticmethod
    def get_destination_details(destination_id: int) -> Optional[Dict]:
        """
        Get basic details for a destination.
        
        Args:
            destination_id: Destination ID
        
        Returns:
            Dict with destination details or None
        """
        query = """
        SELECT id, slug, name, city, category, latitude, longitude
        FROM destinations
        WHERE id = %s
        """

        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, (destination_id,))
                    result = cur.fetchone()
                    if result:
                        return {
                            'id': result[0],
                            'slug': result[1],
                            'name': result[2],
                            'city': result[3],
                            'category': result[4],
                            'latitude': result[5],
                            'longitude': result[6],
                        }
            return None
        except Exception as e:
            logger.warning(f"Error fetching details for destination {destination_id}: {e}")
            return None
