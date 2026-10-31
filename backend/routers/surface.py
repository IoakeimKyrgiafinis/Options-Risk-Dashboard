from fastapi import APIRouter, HTTPException
from src.data import get_vol_surface, get_options_chain

router = APIRouter()

@router.get("/")
def get_surface(ticker: str = "SPY", min_dte: int = 7, max_dte: int = 365):
    try:
        ticker = ticker.upper()
        points = get_vol_surface(ticker, min_dte, max_dte)
        spot   = get_options_chain(ticker)["spot"]
        return {"status": "ok", "ticker": ticker, "spot": spot, "points": len(points), "data": points}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))