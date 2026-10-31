from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from src.blackscholes import bs_price, bs_greeks
from src.data import enrich_positions
from state import model_state

router = APIRouter()


class OptionPosition(BaseModel):
    strike:      float
    dte:         int
    option_type: str
    quantity:    int
    ticker:      str = "SPY"
    spot:        Optional[float] = None  # ignored: the server uses the live spot


class ScenarioRequest(BaseModel):
    portfolio:  List[OptionPosition]
    spot_shock: float   # e.g. -0.10 for -10%
    vol_shock:  float   # e.g. 0.05 for +5 percentage points


@router.post("/run")
def run_scenario(body: ScenarioRequest):
    if not body.portfolio:
        raise HTTPException(status_code=400, detail="Portfolio is empty")
    try:
        r         = model_state.get("r") or 0.04
        positions = enrich_positions([p.model_dump() for p in body.portfolio])

        results = []
        for p in positions:
            S, K, T, iv = p["spot"], p["strike"], p["dte"] / 365, p["iv"]
            otype       = p["option_type"]

            S_shocked  = S * (1 + body.spot_shock)
            iv_shocked = max(0.01, iv + body.vol_shock)

            price_base    = bs_price(S, K, T, r, iv, otype)
            price_shocked = bs_price(S_shocked, K, T, r, iv_shocked, otype)
            pnl           = p["quantity"] * (price_shocked - price_base) * 100
            g             = bs_greeks(S, K, T, r, iv, otype)

            results.append({
                "ticker":        p["ticker"],
                "strike":        K,
                "option_type":   otype,
                "quantity":      p["quantity"],
                "spot_base":     round(S, 2),
                "spot_shocked":  round(S_shocked, 2),
                "vol_base":      round(iv, 4),
                "vol_shocked":   round(iv_shocked, 4),
                "price_base":    round(price_base, 4),
                "price_shocked": round(price_shocked, 4),
                "pnl":           round(pnl, 4),
                "delta":         g["delta"],
                "gamma":         g["gamma"],
                "vega":          g["vega"],
            })

        return {
            "status":     "ok",
            "spot_shock": body.spot_shock,
            "vol_shock":  body.vol_shock,
            "total_pnl":  round(sum(x["pnl"] for x in results), 4),
            "positions":  results,
        }

    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))