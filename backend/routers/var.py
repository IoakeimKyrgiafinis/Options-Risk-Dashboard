from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from src.montecarlo import compute_var, compute_options_var
from state import model_state, update_model_state
router = APIRouter()

class OptionPosition(BaseModel):
    strike:      float
    dte:         int
    option_type: str
    quantity:    int

class VarRequest(BaseModel):
    portfolio:    List[OptionPosition]
    horizon_days: int = 1

@router.get("/spot/{ticker}")
def get_ticker_spot(ticker: str):
    try:
        from src.data import get_spot_price, get_risk_free_rate
        spot = get_spot_price(ticker.upper())
        r    = get_risk_free_rate()
        return {"status": "ok", "ticker": ticker.upper(), "spot": spot, "r": r}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))    

@router.get("/spot")
def get_spot_var(horizon_days: int = 1, n_paths: int = 10000):
    try:
        S     = model_state.get("spot")
        r     = model_state.get("r")
        sigma = 0.15
        result = compute_var(S, sigma, r, horizon_days, n_paths)
        return {"status": "ok", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/options")
def get_options_var(horizon_days: int = 1):
    try:
        S = model_state.get("spot")
        r = model_state.get("r")

        # Default sample portfolio — long straddle
        portfolio = [
            {"strike": round(S), "dte": 30, "option_type": "call", "quantity": 10},
            {"strike": round(S), "dte": 30, "option_type": "put",  "quantity": 10},
        ]

        result = compute_options_var(S, 0.15, r, portfolio, horizon_days)
        return {"status": "ok", "portfolio": portfolio, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/portfolio")
def get_portfolio_var(body: VarRequest):
    try:
        S     = model_state.get("spot")
        r     = model_state.get("r")
        sigma = 0.15

        portfolio = [
            {
                "strike":      p.strike,
                "dte":         p.dte,
                "option_type": p.option_type,
                "quantity":    p.quantity,
            }
            for p in body.portfolio
        ]

        result = compute_options_var(S, sigma, r, portfolio, body.horizon_days)
        return {"status": "ok", "data": result}

    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))