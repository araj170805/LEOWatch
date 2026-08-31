"""AI assistant chat endpoint — powered by Gemini hybrid RAG.

PUBLIC endpoint: orbital-knowledge and conjunction explanations are part of
the core scientific product and do not require an account. The AI layer only
*explains* pre-computed numbers; it never calculates orbital quantities.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from ..proper_rag import explain as rag_explain

router = APIRouter()


class ChatRequest(BaseModel):
    question: str
    event: dict | None = None
    # Recent turns ([{role, text}, ...]) so follow-ups keep conversational context.
    history: list[dict] | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[str]
    provenance: dict


@router.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest):
    try:
        result = rag_explain(body.event, body.question, k=4, history=body.history)
        return ChatResponse(
            answer=result.get("answer", "AI explanation temporarily unavailable."),
            sources=result.get("sources", []),
            provenance={
                "data": "CelesTrak / backend calculation" if body.event else "n/a",
                "propagation": "SGP4" if body.event else "n/a",
                "knowledge": "Orbital Knowledge Base (hybrid RAG)",
                "explanation": "Gemini",
            },
        )
    except Exception:
        return ChatResponse(
            answer="AI service temporarily unavailable. Core tracking, propagation, "
            "conjunction and risk features remain fully operational.",
            sources=[],
            provenance={},
        )
