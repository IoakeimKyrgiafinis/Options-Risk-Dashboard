from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from src.blackscholes import bs_price, bs_greeks
from src.data import get_spot_price, get_risk_free_rate

router = APIRouter()

class OptionPosition(BaseModel):
    strike:      float
    dte:         int
    option_type: str
    quantity:    int
    ticker:      Optional[str] = "SPY"
    spot:        Optional[float] = None

class ScenarioRequest(BaseModel):
    portfolio:   List[OptionPosition]
    spot_shock:  float
    vol_shock:   float
    sigma:       float = 0.15
    r:           float = 0.04

@router.post("/run")
def run_scenario(body: ScenarioRequest):
    try:
        sigma = body.sigma
        r     = body.r

        results = []
        for option in body.portfolio:
            S           = option.spot
            K           = option.strike
            T           = option.dte / 365
            option_type = option.option_type
            quantity    = option.quantity

            S_shocked   = S * (1 + body.spot_shock)
            vol_shocked = max(0.01, sigma + body.vol_shock)

            price_base    = bs_price(S, K, T, r, sigma, option_type)
            price_shocked = bs_price(S_shocked, K, T, r, vol_shocked, option_type)
            pnl           = quantity * (price_shocked - price_base) * 100
            g             = bs_greeks(S, K, T, r, sigma, option_type)

            results.append({
                "ticker":        option.ticker,
                "strike":        K,
                "option_type":   option_type,
                "quantity":      quantity,
                "spot_base":     round(S, 2),
                "spot_shocked":  round(S_shocked, 2),
                "price_base":    round(price_base, 4),
                "price_shocked": round(price_shocked, 4),
                "pnl":           round(pnl, 4),
                "delta":         g["delta"],
                "gamma":         g["gamma"],
                "vega":          g["vega"],
            })

        total_pnl = sum(p["pnl"] for p in results)

        return {
            "status":      "ok",
            "spot_shock":  body.spot_shock,
            "vol_shock":   body.vol_shock,
            "vol_base":    round(sigma, 4),
            "vol_shocked": round(max(0.01, sigma + body.vol_shock), 4),
            "total_pnl":   round(total_pnl, 4),
            "positions":   results,
        }

    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))