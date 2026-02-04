"""Tests for topic modeling utilities."""

import pytest

from app.config import get_settings
from app.models import topic_modeling
from app.models.topic_modeling import TopicModelingModel


class DummySentenceTransformer:
    """Lightweight stand-in for the transformer model."""

    def __init__(self, *_, **__):
        self.model_loaded = True


class DummyBERTopic:
    """Deterministic BERTopic replacement for tests."""

    def __init__(self, *_, **__):
        self.topic_words = {
            0: [("food", 0.8), ("market", 0.6)],
            1: [("art", 0.7), ("gallery", 0.5)],
        }
        self._topics = []

    def fit_transform(self, texts):
        self._topics = [0 if "food" in text else 1 for text in texts]
        probs = [0.99] * len(texts)
        return self._topics, probs

    def get_topic_info(self):
        if not self._topics:
            return []
        return [
            {"Topic": 0, "Count": self._topics.count(0)},
            {"Topic": 1, "Count": self._topics.count(1)},
        ]

    def get_topic(self, topic_id):
        return self.topic_words.get(topic_id, [])


@pytest.fixture(autouse=True)
def patch_topic_dependencies(monkeypatch):
    """Patch heavy ML dependencies with deterministic stand-ins."""

    monkeypatch.setattr(topic_modeling, "SentenceTransformer", DummySentenceTransformer)
    monkeypatch.setattr(topic_modeling, "BERTopic", DummyBERTopic)


def test_destination_topic_extraction_is_deterministic(monkeypatch):
    """Ensure destination topic extraction yields consistent keywords."""

    model = TopicModelingModel()
    monkeypatch.setattr(
        model,
        "_fetch_destination_texts",
        lambda _destination_id: [
            "Amazing food hall with natural wine",
            "A calm art gallery by the river",
            "Street food vendors with fusion dishes",
            "Outdoor art festival with installations",
            "Late-night food trucks and art projections",
        ],
    )

    result = model.extract_topics_for_destination(destination_id=99, min_topic_size=2)

    assert result["status"] == "success"
    keywords_by_topic = {topic["topic_id"]: topic["keywords"] for topic in result["topics"]}
    assert keywords_by_topic[0][0] == "food"
    assert keywords_by_topic[1][0] == "art"


def test_city_topic_extraction_respects_minimum_documents(monkeypatch):
    """The city extractor should stop if not enough cleaned docs exist."""

    model = TopicModelingModel()
    settings = get_settings()
    insufficient_docs = settings.topic_min_documents_city - 1
    monkeypatch.setattr(
        model, "_fetch_city_texts", lambda _city: ["Food" for _ in range(insufficient_docs)]
    )

    result = model.extract_topics_for_city("Paris", min_topic_size=3)

    assert result["status"] == "insufficient_data"
    assert result["topics"] == []
