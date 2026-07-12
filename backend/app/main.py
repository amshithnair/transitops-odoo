"""
TransitOps — FastAPI application entrypoint.

- CORS scoped to FRONTEND_URL (design decision #5)
- Lifespan: creates all tables + runs idempotent seed on startup
- Includes all 10 routers with proper tags
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.seed import seed_database
from app.routers import auth, vehicles, drivers, trips, maintenance, fuel_expense, dashboard, reports, dispatch, map


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables and seed data on startup."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="TransitOps API",
    description="Fleet operations platform — manage vehicles, drivers, trips, "
                "maintenance, fuel, expenses, reports, AI dispatch, and fleet map.",
    version="1.0.0",
    lifespan=lifespan,
)

# Design decision #5: CORS scoped to frontend origin, not wildcard.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(vehicles.router)
app.include_router(drivers.router)
app.include_router(trips.router)
app.include_router(maintenance.router)
app.include_router(fuel_expense.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(dispatch.router)
app.include_router(map.router)


@app.get("/", tags=["Health"])
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "TransitOps API"}
