from fastapi import APIRouter, HTTPException
from src.data import get_vol_surface

router = APIRouter()

@router.get("/")
def get_surface(ticker: str = "SPY", min_dte: int = 7, max_dte: int = 365):
    try:
        points = get_vol_surface(ticker.upper(), min_dte, max_dte)
        return {"status": "ok", "ticker": ticker.upper(), "data": points}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))