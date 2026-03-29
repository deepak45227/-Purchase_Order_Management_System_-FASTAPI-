from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import uvicorn
import os
from dotenv import load_dotenv

# Load .env — try both "run from backend/" and project-root scenarios
_base = os.path.dirname(os.path.abspath(__file__))
load_dotenv(dotenv_path=os.path.join(_base, '..', '.env'))
load_dotenv(dotenv_path=os.path.join(_base, '..', '..', '.env'))

from db.database import engine, Base
from routers import vendors, products, purchase_orders, auth
from routers import ai as ai_router

# Auto-create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ProCure — PO Management System",
    description=(
        "Purchase Order Management System with role-based JWT auth, "
        "5% tax business logic, real-time stock tracking, and AI product descriptions."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resolve frontend paths relative to this file (works from any working directory)
_frontend_static    = os.path.join(_base, '..', 'frontend', 'static')
_frontend_templates = os.path.join(_base, '..', 'frontend', 'templates')

app.mount("/static", StaticFiles(directory=_frontend_static), name="static")
templates = Jinja2Templates(directory=_frontend_templates)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router,            prefix="/api/auth",            tags=["Authentication"])
app.include_router(vendors.router,         prefix="/api/vendors",         tags=["Vendors"])
app.include_router(products.router,        prefix="/api/products",        tags=["Products"])
app.include_router(purchase_orders.router, prefix="/api/purchase-orders", tags=["Purchase Orders"])
app.include_router(ai_router.router,       prefix="/api/ai",              tags=["AI Features"])


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "ProCure PO Management System",
        "version": "2.0.0",
        "ai_enabled": bool(os.getenv("ANTHROPIC_API_KEY", "")),
    }


if __name__ == "__main__":
    port = int(os.getenv("APP_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
