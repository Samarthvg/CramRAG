"""What this deployment can currently do.

The web app reads this to decide what to offer, which keeps feature gating in
one place instead of scattered across the frontend. Flip a flag to true in the
same change that makes the feature real. Nothing secret goes here.
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/config", tags=["config"])

DOCUMENT_TYPES = ["application/pdf", "text/markdown", "text/plain"]

FEATURES = {
    "ingestion": False,
    "retrieval": False,
    "answers": False,
    "flashcards": False,
    "quizzes": False,
    "evaluation": False,
}


class CapabilitiesResponse(BaseModel):
    document_types: list[str]
    features: dict[str, bool]


@router.get("/capabilities", response_model=CapabilitiesResponse)
def capabilities() -> CapabilitiesResponse:
    return CapabilitiesResponse(document_types=DOCUMENT_TYPES, features=FEATURES)
