"""Graph-based sequencing model using NetworkX."""

import networkx as nx
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
from collections import defaultdict

from app.config import get_settings
from app.utils.logger import get_logger
from app.utils.data_fetcher import DataFetcher

logger = get_logger(__name__)
settings = get_settings()


class GraphSequencingModel:
    """
    Graph-based sequencing for destination recommendations.
    
    Builds a co-visitation graph from user visit sequences and uses it to:
    - Suggest next places based on common sequences
    - Optimize multi-day itineraries
    - Power "Complete Your Day" suggestions
    """

    def __init__(self):
        """Initialize the graph sequencing model."""
        self.graph: Optional[nx.DiGraph] = None
        self.trained_at: Optional[datetime] = None
        self.stats: Dict = {}

    def build_co_visitation_graph(
        self,
        visit_history: Optional[pd.DataFrame] = None,
        min_weight: int = 2
    ) -> nx.DiGraph:
        """
        Build directed graph from visit sequences.
        
        Args:
            visit_history: DataFrame with columns ['user_id', 'destination_id', 'visited_at']
                          If None, fetches from database
            min_weight: Minimum edge weight to include (filters rare sequences)
        
        Returns:
            Directed graph where edges represent "visited A then B" patterns
        """
        logger.info("Building co-visitation graph")

        if visit_history is None:
            visit_history = DataFetcher.fetch_visit_history()

        if visit_history is None or len(visit_history) < 10:
            logger.warning("Insufficient visit history data")
            return nx.DiGraph()

        G = nx.DiGraph()
        sequence_count = 0
        edge_weights = defaultdict(int)

        # Group by user and build sequences
        for user_id, user_visits in visit_history.groupby('user_id'):
            # Sort by visit time
            sorted_visits = user_visits.sort_values('visited_at')
            destinations = sorted_visits['destination_id'].tolist()

            # Add edges for consecutive visits
            for i in range(len(destinations) - 1):
                src = destinations[i]
                dst = destinations[i + 1]
                edge_weights[(src, dst)] += 1
                sequence_count += 1

        # Add edges to graph (only if weight >= min_weight)
        for (src, dst), weight in edge_weights.items():
            if weight >= min_weight:
                G.add_edge(src, dst, weight=weight, frequency=weight)

        # Calculate statistics
        self.stats = {
            'nodes': G.number_of_nodes(),
            'edges': G.number_of_edges(),
            'sequences': sequence_count,
            'avg_out_degree': sum(dict(G.out_degree()).values()) / max(G.number_of_nodes(), 1),
        }

        logger.info(
            f"Graph built: {self.stats['nodes']} nodes, {self.stats['edges']} edges, "
            f"{sequence_count} sequences"
        )

        self.graph = G
        self.trained_at = datetime.utcnow()
        return G

    def suggest_next_places(
        self,
        current_place_id: int,
        limit: int = 5,
        exclude_ids: Optional[List[int]] = None,
        consider_distance: bool = True,
        max_distance_km: float = 10.0
    ) -> List[Dict]:
        """
        Suggest next places based on graph traversal.
        
        Args:
            current_place_id: Current destination ID
            limit: Number of suggestions
            exclude_ids: Destination IDs to exclude
            consider_distance: Whether to factor in geographic distance
            max_distance_km: Maximum distance for suggestions
        
        Returns:
            List of suggested destinations with scores
        """
        if not self.graph or current_place_id not in self.graph:
            logger.warning(f"Destination {current_place_id} not in graph")
            return []

        # Get outgoing edges (places visited after this one)
        successors = list(self.graph.successors(current_place_id))

        if not successors:
            return []

        # Calculate scores based on edge weights
        suggestions = []
        for dest_id in successors:
            if exclude_ids and dest_id in exclude_ids:
                continue

            edge_data = self.graph[current_place_id][dest_id]
            weight = edge_data.get('weight', 1)
            frequency = edge_data.get('frequency', 1)

            # Base score from co-visitation frequency
            score = weight / max(self.stats.get('avg_out_degree', 1), 1)

            # Normalize score (0-1 range)
            max_weight = max(
                [self.graph[current_place_id][s].get('weight', 1) for s in successors],
                default=1
            )
            normalized_score = weight / max(max_weight, 1)

            suggestions.append({
                'destination_id': dest_id,
                'score': float(normalized_score),
                'weight': int(weight),
                'frequency': int(frequency),
                'reason': f'Visited by {frequency} users after this place',
            })

        # Sort by score
        suggestions.sort(key=lambda x: x['score'], reverse=True)

        # Apply distance filter if requested
        if consider_distance and max_distance_km > 0:
            try:
                current_location = DataFetcher.get_destination_location(current_place_id)
                if current_location:
                    filtered = []
                    for sug in suggestions[:limit * 2]:  # Check more candidates
                        dest_location = DataFetcher.get_destination_location(sug['destination_id'])
                        if dest_location:
                            distance = self._calculate_distance(
                                current_location['lat'],
                                current_location['lng'],
                                dest_location['lat'],
                                dest_location['lng']
                            )
                            if distance <= max_distance_km:
                                sug['distance_km'] = round(distance, 2)
                                filtered.append(sug)
                    
                    suggestions = filtered[:limit]
            except Exception as e:
                logger.warning(f"Distance filtering failed: {e}")

        return suggestions[:limit]

    def suggest_complete_day(
        self,
        starting_place_id: int,
        categories: Optional[List[str]] = None,
        max_places: int = 5
    ) -> List[Dict]:
        """
        Suggest a complete day itinerary starting from a place.
        
        Uses graph traversal to find common sequences that include:
        - Breakfast → Lunch → Dinner
        - Activity → Restaurant → Activity
        
        Args:
            starting_place_id: Starting destination ID
            categories: Preferred categories (e.g., ['restaurant', 'museum'])
            max_places: Maximum places in sequence
        
        Returns:
            List of suggested destinations in sequence order
        """
        if not self.graph or starting_place_id not in self.graph:
            return []

        sequence = [starting_place_id]
        current = starting_place_id
        visited = {starting_place_id}

        # Traverse graph to build sequence
        for _ in range(max_places - 1):
            next_places = self.suggest_next_places(
                current,
                limit=10,
                exclude_ids=list(visited)
            )

            if not next_places:
                break

            # Filter by categories if specified
            if categories:
                filtered = [
                    p for p in next_places
                    if self._destination_matches_category(p['destination_id'], categories)
                ]
                if filtered:
                    next_places = filtered

            if next_places:
                next_place = next_places[0]
                sequence.append(next_place['destination_id'])
                visited.add(next_place['destination_id'])
                current = next_place['destination_id']
            else:
                break

        # Enrich with destination details
        enriched = []
        for dest_id in sequence:
            details = DataFetcher.get_destination_details(dest_id)
            if details:
                enriched.append({
                    'destination_id': dest_id,
                    'name': details.get('name'),
                    'slug': details.get('slug'),
                    'category': details.get('category'),
                    'city': details.get('city'),
                })

        return enriched

    def optimize_itinerary(
        self,
        destination_ids: List[int],
        max_days: int = 3
    ) -> Dict:
        """
        Optimize a multi-day itinerary using graph and geographic data.
        
        Args:
            destination_ids: List of destination IDs to include
            max_days: Maximum number of days
        
        Returns:
            Optimized itinerary with day-by-day breakdown
        """
        if not self.graph or not destination_ids:
            return {'days': [], 'total_distance_km': 0}

        # Get destination details
        destinations = []
        for dest_id in destination_ids:
            details = DataFetcher.get_destination_details(dest_id)
            if details:
                destinations.append({
                    'id': dest_id,
                    'name': details.get('name'),
                    'category': details.get('category'),
                    'lat': details.get('latitude'),
                    'lng': details.get('longitude'),
                })

        if len(destinations) < 2:
            return {'days': [{'places': destinations}], 'total_distance_km': 0}

        # Simple optimization: group by graph sequences and distance
        # More sophisticated: use TSP solver or clustering
        days = []
        remaining = destinations.copy()

        for day in range(max_days):
            if not remaining:
                break

            day_places = []
            current = remaining.pop(0)
            day_places.append(current)

            # Find next places based on graph and distance
            while len(day_places) < 4 and remaining:  # Max 4 places per day
                best_next = None
                best_score = -1

                for candidate in remaining:
                    # Graph score
                    graph_score = 0
                    if self.graph.has_edge(current['id'], candidate['id']):
                        edge_data = self.graph[current['id']][candidate['id']]
                        graph_score = edge_data.get('weight', 0) / 10.0

                    # Distance score (closer is better)
                    distance = self._calculate_distance(
                        current.get('lat', 0),
                        current.get('lng', 0),
                        candidate.get('lat', 0),
                        candidate.get('lng', 0)
                    )
                    distance_score = max(0, 1 - (distance / 50.0))  # Normalize to 50km

                    # Combined score
                    score = graph_score * 0.6 + distance_score * 0.4

                    if score > best_score:
                        best_score = score
                        best_next = candidate

                if best_next:
                    day_places.append(best_next)
                    remaining.remove(best_next)
                    current = best_next
                else:
                    break

            days.append({'day': day + 1, 'places': day_places})

        # Calculate total distance
        total_distance = 0
        for day in days:
            places = day['places']
            for i in range(len(places) - 1):
                total_distance += self._calculate_distance(
                    places[i].get('lat', 0),
                    places[i].get('lng', 0),
                    places[i + 1].get('lat', 0),
                    places[i + 1].get('lng', 0)
                )

        return {
            'days': days,
            'total_distance_km': round(total_distance, 2),
            'optimization_method': 'graph_and_distance',
        }

    def _calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate distance between two points using Haversine formula."""
        from math import radians, cos, sin, asin, sqrt

        if not all([lat1, lng1, lat2, lng2]):
            return float('inf')

        # Convert to radians
        lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])

        # Haversine formula
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
        c = 2 * asin(sqrt(a))
        r = 6371  # Earth radius in km

        return c * r

    def _destination_matches_category(self, destination_id: int, categories: List[str]) -> bool:
        """Check if destination matches any of the given categories."""
        try:
            details = DataFetcher.get_destination_details(destination_id)
            if not details:
                return False
            dest_category = (details.get('category') or '').lower()
            return any(cat.lower() in dest_category for cat in categories)
        except:
            return False

    def save_to_database(self) -> bool:
        """Save graph edges to database."""
        if not self.graph:
            return False

        try:
            from app.utils.database import get_db_connection

            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    # Clear existing edges
                    cur.execute("DELETE FROM co_visitation_graph")

                    # Insert edges
                    edges = []
                    for src, dst, data in self.graph.edges(data=True):
                        edges.append((src, dst, data.get('weight', 1), data.get('frequency', 1)))

                    if edges:
                        cur.executemany(
                            """
                            INSERT INTO co_visitation_graph 
                            (destination_a_id, destination_b_id, weight, frequency, updated_at)
                            VALUES (%s, %s, %s, %s, NOW())
                            ON CONFLICT (destination_a_id, destination_b_id)
                            DO UPDATE SET weight = EXCLUDED.weight, frequency = EXCLUDED.frequency, updated_at = NOW()
                            """,
                            edges
                        )

                    conn.commit()
                    logger.info(f"Saved {len(edges)} graph edges to database")
                    return True
        except Exception as e:
            logger.error(f"Error saving graph to database: {e}")
            return False

    def load_from_database(self) -> bool:
        """Load graph from database."""
        try:
            from app.utils.database import get_db_connection

            G = nx.DiGraph()

            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT destination_a_id, destination_b_id, weight, frequency
                        FROM co_visitation_graph
                        ORDER BY weight DESC
                        """
                    )
                    rows = cur.fetchall()

                    for src, dst, weight, frequency in rows:
                        G.add_edge(src, dst, weight=weight, frequency=frequency)

            self.graph = G
            self.stats = {
                'nodes': G.number_of_nodes(),
                'edges': G.number_of_edges(),
            }
            logger.info(f"Loaded graph from database: {self.stats['nodes']} nodes, {self.stats['edges']} edges")
            return True
        except Exception as e:
            logger.error(f"Error loading graph from database: {e}")
            return False


# Global model instance
_model_instance = None


def get_graph_model() -> GraphSequencingModel:
    """Get or create the global graph model instance."""
    global _model_instance

    if _model_instance is None:
        _model_instance = GraphSequencingModel()

    return _model_instance

