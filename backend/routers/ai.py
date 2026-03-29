"""
AI Auto-Description Router
Generates professional product descriptions using the Claude API (Anthropic).
Falls back gracefully if no API key is configured.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import os
import httpx
from core.security import get_current_user

router = APIRouter()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


class DescriptionRequest(BaseModel):
    product_name: str
    category: str = "General"
    sku: str = ""


class DescriptionResponse(BaseModel):
    description: str
    generated: bool  # True = AI-generated, False = fallback template


def _fallback_description(name: str, category: str) -> str:
    """Generate a simple template description when AI is unavailable."""
    return (
        f"{name} is a high-quality {category.lower()} product designed for professional use. "
        f"It meets industry standards and offers excellent value for businesses seeking reliable, "
        f"cost-effective procurement solutions."
    )


@router.post("/generate-description", response_model=DescriptionResponse)
async def generate_description(
    req: DescriptionRequest,
    _: dict = Depends(get_current_user),
):
    """
    Generate an AI-powered product description using Claude API.
    If ANTHROPIC_API_KEY is not set, returns a polished fallback template.
    """

    if not ANTHROPIC_API_KEY:
        return DescriptionResponse(
            description=_fallback_description(req.product_name, req.category),
            generated=False,
        )

    prompt = (
        f"Write a professional 2-sentence marketing description for a B2B product.\n"
        f"Product Name: {req.product_name}\n"
        f"Category: {req.category}\n"
        f"SKU: {req.sku or 'N/A'}\n\n"
        f"Requirements:\n"
        f"- Exactly 2 sentences\n"
        f"- Professional, B2B tone suitable for a purchase order system\n"
        f"- Highlight key benefits and quality\n"
        f"- Do NOT use the product name in the first word\n"
        f"- Return ONLY the description text, no preamble or quotes"
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 150,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"AI API error: {response.status_code}"
            )

        data = response.json()
        text = data["content"][0]["text"].strip()

        return DescriptionResponse(description=text, generated=True)

    except httpx.TimeoutException:
        # Graceful fallback on timeout
        return DescriptionResponse(
            description=_fallback_description(req.product_name, req.category),
            generated=False,
        )
    except HTTPException:
        raise
    except Exception as e:
        # Log and fallback — never crash the app over AI
        print(f"[AI] Description generation failed: {e}")
        return DescriptionResponse(
            description=_fallback_description(req.product_name, req.category),
            generated=False,
        )


@router.get("/status")
async def ai_status(_: dict = Depends(get_current_user)):
    """Check if AI features are available."""
    return {
        "ai_enabled": bool(ANTHROPIC_API_KEY),
        "model": "claude-haiku-4-5-20251001" if ANTHROPIC_API_KEY else None,
        "message": "AI Auto-Description active" if ANTHROPIC_API_KEY else "Set ANTHROPIC_API_KEY in .env to enable AI features",
    }
