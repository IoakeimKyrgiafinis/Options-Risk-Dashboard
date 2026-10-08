from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import surface, greeks, var, scenarios
from src.data import get_spot_price, get_risk_free_rate
from state import model_state

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Loading market data on startup...")
    # Don't hardcode SPY anymore — fetch on demand instead
    model_state["ready"] = True
    print("Ready.")
    yield
    model_state.clear()

app = FastAPI(title="Options Risk Dashboard", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://options-risk-dashboard-five.vercel.app/",  # production
        "https://options-risk-dashboard-git-master-ioakeim.vercel.app",  # git branch previews
        "http://localhost:5173",                                          # local dev
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(surface.router,   prefix="/api/surface",   tags=["surface"])
app.include_router(greeks.router,    prefix="/api/greeks",    tags=["greeks"])
app.include_router(var.router,       prefix="/api/var",       tags=["var"])
app.include_router(scenarios.router, prefix="/api/scenarios", tags=["scenarios"])

@app.get("/")
def root(ticker: str = "SPY"):
    """Return spot + risk-free rate for any ticker."""
    try:
        spot = get_spot_price(ticker.upper())
        r    = get_risk_free_rate()
        return {
            "status": "Options Risk Dashboard API running",
            "ready":  True,
            "ticker": ticker.upper(),
            "spot":   spot,
            "r":      r,
        }
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))