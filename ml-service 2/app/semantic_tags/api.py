"""FastAPI endpoints for semantic tagging."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.semantic_tags.models import (
    SemanticTag,
    TagEngine,
    TaggingResult,
)

router = APIRouter(prefix="/semantic-tags", tags=["Semantic Tags"])

_DEFAULT_TAGS = (
    SemanticTag(
        id=1,
        slug="family-friendly",
        name="Family Friendly",
        keywords=("kids", "children", "family", "stroller"),
        description="Destinations suitable for families or groups with kids.",
    ),
    SemanticTag(
        id=2,
        slug="nightlife",
        name="Nightlife",
        keywords=("cocktail", "bar", "club", "late-night"),
        description="Places that are active after dark and oriented around nightlife.",
    ),
    SemanticTag(
        id=3,
        slug="outdoors",
        name="Outdoors",
        keywords=("trail", "hike", "park", "nature"),
        description="Outdoor adventures, scenic routes, and parks.",
    ),
)

_engine = TagEngine(tags=_DEFAULT_TAGS)


class TaggingRequest(BaseModel):
    """Request schema for the tagging endpoint."""

    text: str = Field(..., description="Source text to scan for semantic tags")
    force_on_tag_ids: list[int] | None = Field(
        default=None,
        description="Tag IDs that should be forcefully applied, even without a match",
    )
    force_off_tag_ids: list[int] | None = Field(
        default=None,
        description="Tag IDs that should be skipped regardless of matches",
    )


class TagReasonResponse(BaseModel):
    sentence: str
    keyword: str


class TagDecisionResponse(BaseModel):
    tag_id: int
    tag_slug: str
    tag_name: str
    applied: bool
    reasons: list[TagReasonResponse]


class TaggingResponse(BaseModel):
    decisions: list[TagDecisionResponse]
    forced_on: list[int]
    forced_off: list[int]

    @classmethod
    def from_result(cls, result: TaggingResult) -> "TaggingResponse":
        return cls(
            decisions=[
                TagDecisionResponse(
                    tag_id=decision.tag.id,
                    tag_slug=decision.tag.slug,
                    tag_name=decision.tag.name,
                    applied=decision.applied,
                    reasons=[
                        TagReasonResponse(sentence=reason.sentence, keyword=reason.keyword)
                        for reason in decision.reasons
                    ],
                )
                for decision in result.decisions
            ],
            forced_on=result.forced_on,
            forced_off=result.forced_off,
        )


@router.post("/apply", response_model=TaggingResponse)
async def apply_semantic_tags(payload: TaggingRequest) -> TaggingResponse:
    """Apply semantic tags to the provided text and return explainable results."""

    result = _engine.evaluate(
        payload.text,
        force_on_tag_ids=payload.force_on_tag_ids,
        force_off_tag_ids=payload.force_off_tag_ids,
    )
    return TaggingResponse.from_result(result)
