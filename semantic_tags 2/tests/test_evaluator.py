from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from semantic_tags.evaluator import SemanticTagEvaluator


def _build_evaluator() -> SemanticTagEvaluator:
    return SemanticTagEvaluator(
        definitions_path=Path(__file__).resolve().parents[1] / "data" / "tag_definitions.yaml"
    )


def test_rooftop_tag_requires_view_context():
    evaluator = _build_evaluator()
    text = (
        "The rooftop terrace just opened for the season.\n"
        "Guests can enjoy panoramic views of the skyline with cocktails."
    )
    assert "rooftop_view" in evaluator.evaluate(text)


def test_rooftop_tag_not_triggered_when_context_missing():
    evaluator = _build_evaluator()
    text = (
        "A rooftop deck exists but it is closed for renovation this summer."
        " Seating is currently unavailable."
    )
    assert "rooftop_view" not in evaluator.evaluate(text)


def test_live_music_detected_with_supporting_paragraph():
    evaluator = _build_evaluator()
    text = (
        "Friday nights are lively with live music in the courtyard.\n"
        "A rotating band performs on the outdoor stage."
    )
    assert "live_music" in evaluator.evaluate(text)


def test_live_music_not_triggered_by_negated_sentence():
    evaluator = _build_evaluator()
    text = (
        "Live music used to fill the lobby, but the performances were cancelled last year.\n"
        "Expect a calm and quiet atmosphere now."
    )
    assert "live_music" not in evaluator.evaluate(text)


def test_pet_friendly_positive_case():
    evaluator = _build_evaluator()
    text = "Pets are welcome on the patio and the staff keeps dog treats behind the bar."
    assert "pet_friendly" in evaluator.evaluate(text)


def test_pet_friendly_not_triggered_when_animals_restricted():
    evaluator = _build_evaluator()
    text = "Pets are not allowed inside, only service animals may enter the cafe."
    assert "pet_friendly" not in evaluator.evaluate(text)
