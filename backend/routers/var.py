from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from src.montecarlo import compute_portfolio_var
from src.data import (
    get_spot_price, get_risk_free_rate,
    enrich_positions, get_correlation, get_atm_vol,
)
from state import model_state

router = APIRouter()


class OptionPosition(BaseModel):
    strike:      float
    dte:         int
    option_type: str
    quantity:    int
    ticker:      str = "SPY"
    spot:        Optional[float] = None  # ignored: the server uses the live spot


class VarRequest(BaseModel):
    portfolio:    List[OptionPosition]
    horizon_days: int = 1


@router.get("/spot/{ticker}")
def get_ticker_spot(ticker: str):
    try:
        t = ticker.upper()
        return {"status": "ok", "ticker": t, "spot": get_spot_price(t), "r": get_risk_free_rate()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/portfolio")
def get_portfolio_var(body: VarRequest):
    if not body.portfolio:
        raise HTTPException(status_code=400, detail="Portfolio is empty")
    try:
        r         = model_state.get("r") or 0.04
        positions = enrich_positions([p.model_dump() for p in body.portfolio])

        tickers, corr = get_correlation([p["ticker"] for p in positions])
        spots         = {p["ticker"]: p["spot"] for p in positions}
        underlyings   = {t: {"spot": spots[t], "sigma": get_atm_vol(t)} for t in tickers}

        result = compute_portfolio_var(
            positions, underlyings, tickers, corr, r, body.horizon_days
        )
        return {"status": "ok", "data": result}

    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))