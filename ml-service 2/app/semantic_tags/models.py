"""Semantic tagging models and engine.

This module centralizes the shared dataclasses used by the semantic tagging
pipeline and exposes a simple rule-based engine. The engine is designed for
explainability, so every tag decision includes the sentence/phrase that caused
the tag to be applied or skipped.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import logging
import re
from typing import Iterable, List, Sequence, Set

logger = logging.getLogger(__name__)

_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+|\n+")


@dataclass
class SemanticTag:
    """Metadata that describes a semantic tag."""

    id: int
    slug: str
    name: str
    keywords: Sequence[str] = field(default_factory=list)
    description: str | None = None


@dataclass
class TagReason:
    """Explainability payload for a tag decision."""

    sentence: str
    keyword: str


@dataclass
class TagDecision:
    """Result of evaluating a single tag."""

    tag: SemanticTag
    applied: bool
    reasons: List[TagReason] = field(default_factory=list)

    def add_reason(self, sentence: str, keyword: str) -> None:
        self.reasons.append(TagReason(sentence=sentence.strip(), keyword=keyword))


@dataclass
class TaggingResult:
    """Full tagging payload for a document."""

    decisions: List[TagDecision]
    forced_on: List[int]
    forced_off: List[int]


class TagEngine:
    """Simple keyword driven semantic tag evaluator."""

    def __init__(self, tags: Iterable[SemanticTag]):
        self.tags = {tag.id: tag for tag in tags}

    def _split_sentences(self, text: str) -> List[str]:
        return [sentence.strip() for sentence in _SENTENCE_SPLIT_RE.split(text) if sentence and sentence.strip()]

    def evaluate(
        self,
        text: str,
        *,
        force_on_tag_ids: Sequence[int] | None = None,
        force_off_tag_ids: Sequence[int] | None = None,
    ) -> TaggingResult:
        """Evaluate semantic tags for the provided text."""

        sentences = self._split_sentences(text)
        force_on: Set[int] = set(force_on_tag_ids or [])
        force_off: Set[int] = set(force_off_tag_ids or [])
        decisions: List[TagDecision] = []

        for tag in self.tags.values():
            decision = TagDecision(tag=tag, applied=False)
            if tag.id in force_off:
                decision.applied = False
                decision.add_reason("Manually forced off by user", "manual_override")
            else:
                lower_sentences = [sentence.lower() for sentence in sentences]
                for sentence, lower_sentence in zip(sentences, lower_sentences):
                    for keyword in tag.keywords:
                        normalized_keyword = keyword.lower()
                        if re.search(rf"\\b{re.escape(normalized_keyword)}\\b", lower_sentence):
                            decision.applied = True
                            decision.add_reason(sentence, keyword)
                            break
                    if decision.applied:
                        break

            if tag.id in force_on and tag.id not in force_off:
                if not decision.applied:
                    decision.add_reason("Manually forced on by user", "manual_override")
                decision.applied = True

            logger.info(
                "semantic_tag_decision",
                extra={
                    "semantic_tag_decision": {
                        "tag_id": tag.id,
                        "tag_slug": tag.slug,
                        "applied": decision.applied,
                        "reasons": [reason.__dict__ for reason in decision.reasons],
                        "forced_on": tag.id in force_on,
                        "forced_off": tag.id in force_off,
                    }
                },
            )
            decisions.append(decision)

        return TaggingResult(
            decisions=decisions,
            forced_on=sorted(force_on),
            forced_off=sorted(force_off),
        )
