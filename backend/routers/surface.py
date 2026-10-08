from fastapi import APIRouter, HTTPException
from src.data import get_vol_surface
from state import update_model_state

router = APIRouter()

@router.get("/")
def get_surface(ticker: str = "SPY", min_dte: int = 7, max_dte: int = 365):
    try:
        ticker_upper = ticker.upper()
        
        # Ενημέρωση του state με το spot και το r της επιλεγμένης μετοχής
        update_model_state(ticker_upper)
        
        points = get_vol_surface(ticker_upper, min_dte, max_dte)
        return {"status": "ok", "ticker": ticker_upper, "data": points}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))