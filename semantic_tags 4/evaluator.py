"""Utilities for applying semantic tag definitions to narrative text."""
from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
import re
from typing import Iterable, List, Sequence

try:  # pragma: no cover - optional dependency
    import yaml  # type: ignore
except ModuleNotFoundError:  # pragma: no cover - executed when PyYAML is absent
    yaml = None


_PARAGRAPH_SPLIT_RE = re.compile(r"\r?\n\s*\r?\n", re.MULTILINE)
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
_WHITESPACE_RE = re.compile(r"\s+")


@dataclass(frozen=True)
class ContextDefinition:
    """Describes additional context requirements for a tag."""

    require_any: tuple[str, ...]
    require_all: tuple[str, ...]
    exclude_any: tuple[str, ...]

    @classmethod
    def from_dict(cls, data: dict | None) -> "ContextDefinition | None":
        if not data:
            return None
        return cls(
            require_any=tuple(_normalize_term(term) for term in data.get("require_any", [])),
            require_all=tuple(_normalize_term(term) for term in data.get("require_all", [])),
            exclude_any=tuple(_normalize_term(term) for term in data.get("exclude_any", [])),
        )

    def matches(self, text: str) -> bool:
        if self.require_any and not any(term in text for term in self.require_any):
            return False
        if self.require_all and not all(term in text for term in self.require_all):
            return False
        if self.exclude_any and any(term in text for term in self.exclude_any):
            return False
        return True


@dataclass(frozen=True)
class TagDefinition:
    """Represents the rules required for a single semantic tag."""

    name: str
    keywords: tuple[str, ...]
    negative_phrases: tuple[str, ...]
    sentence_context: ContextDefinition | None
    paragraph_context: ContextDefinition | None

    @classmethod
    def from_dict(cls, data: dict) -> "TagDefinition":
        context = data.get("context", {})
        return cls(
            name=data["name"],
            keywords=tuple(_normalize_term(term) for term in data.get("keywords", [])),
            negative_phrases=tuple(_normalize_term(term) for term in data.get("negative_phrases", [])),
            sentence_context=ContextDefinition.from_dict(context.get("sentence")),
            paragraph_context=ContextDefinition.from_dict(context.get("paragraph")),
        )


@dataclass
class SentenceBlock:
    text: str
    normalized: str


@dataclass
class ParagraphBlock:
    text: str
    normalized: str
    sentences: Sequence[SentenceBlock]


class SemanticTagEvaluator:
    """Evaluates prose and returns the semantic tags that apply."""

    def __init__(self, definitions_path: str | Path | None = None):
        if definitions_path is None:
            definitions_path = Path(__file__).with_name("data") / "tag_definitions.yaml"
        self._definitions_path = Path(definitions_path)
        raw_data = _load_definition_document(self._definitions_path)
        tag_dicts = raw_data.get("tags", []) if isinstance(raw_data, dict) else []
        self.tag_definitions: List[TagDefinition] = [
            TagDefinition.from_dict(entry) for entry in tag_dicts
        ]

    def evaluate(self, text: str) -> list[str]:
        paragraphs = list(_build_paragraphs(text))
        matches: list[str] = []
        for tag_definition in self.tag_definitions:
            if self._tag_matches(tag_definition, paragraphs):
                matches.append(tag_definition.name)
        return matches

    def _tag_matches(
        self, definition: TagDefinition, paragraphs: Sequence[ParagraphBlock]
    ) -> bool:
        if not definition.keywords:
            return False
        for paragraph in paragraphs:
            for sentence in paragraph.sentences:
                if not _contains_any(sentence.normalized, definition.keywords):
                    continue
                if definition.negative_phrases and (
                    _contains_any(sentence.normalized, definition.negative_phrases)
                    or _contains_any(paragraph.normalized, definition.negative_phrases)
                ):
                    continue
                if definition.sentence_context and not definition.sentence_context.matches(
                    sentence.normalized
                ):
                    continue
                if definition.paragraph_context and not definition.paragraph_context.matches(
                    paragraph.normalized
                ):
                    continue
                return True
        return False


def _build_paragraphs(text: str) -> Iterable[ParagraphBlock]:
    cleaned = text.strip()
    if not cleaned:
        return []
    for raw_paragraph in _PARAGRAPH_SPLIT_RE.split(cleaned) if cleaned else []:
        paragraph_text = raw_paragraph.strip()
        if not paragraph_text:
            continue
        normalized_paragraph = _normalize_term(paragraph_text)
        sentences = list(_build_sentences(paragraph_text))
        yield ParagraphBlock(
            text=paragraph_text, normalized=normalized_paragraph, sentences=sentences
        )


def _build_sentences(paragraph_text: str) -> Iterable[SentenceBlock]:
    normalized = paragraph_text.strip()
    if not normalized:
        return []
    if _SENTENCE_SPLIT_RE.search(normalized):
        raw_sentences = _SENTENCE_SPLIT_RE.split(normalized)
    else:
        raw_sentences = [normalized]
    for sentence in raw_sentences:
        text = sentence.strip()
        if not text:
            continue
        yield SentenceBlock(text=text, normalized=_normalize_term(text))


def _contains_any(haystack: str, needles: Sequence[str]) -> bool:
    return any(needle in haystack for needle in needles)


def _normalize_term(value: str) -> str:
    return _WHITESPACE_RE.sub(" ", value.strip().lower())


def _load_definition_document(definition_path: Path) -> dict:
    raw_text = definition_path.read_text()
    if yaml is not None:
        return yaml.safe_load(raw_text)
    return json.loads(raw_text)


__all__ = ["SemanticTagEvaluator"]
