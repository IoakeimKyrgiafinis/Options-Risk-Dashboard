from fastapi import APIRouter, HTTPException
from src.data import get_options_chain
from src.blackscholes import bs_greeks, bs_price
from state import model_state

router = APIRouter()

@router.get("/chain")
def get_chain_greeks(ticker: str = "SPY", option_type: str = "call",
                     min_dte: int = 7, max_dte: int = 90):
    try:
        chain = get_options_chain(ticker)
        S     = chain["spot"]
        r     = model_state.get("r") or 0.04

        df = chain["calls"] if option_type == "call" else chain["puts"]
        df = df[
            (df["dte"] >= min_dte) &
            (df["dte"] <= max_dte) &
            (df["moneyness"] >= 0.90) &
            (df["moneyness"] <= 1.10) &
            (df["impliedVolatility"] > 0.01)
        ].copy()

        result = []
        for _, row in df.iterrows():
            K  = float(row["strike"])
            T  = int(row["dte"]) / 365
            iv = float(row["impliedVolatility"])

            result.append({
                "option_type": option_type,
                "strike":      K,
                "dte":         int(row["dte"]),
                "moneyness":   round(float(row["moneyness"]), 4),
                "expiration":  row["expiration"],
                "iv":          round(iv, 4),
                "price":       round(float(bs_price(S, K, T, r, iv, option_type)), 4),
                **bs_greeks(S, K, T, r, iv, option_type),
            })

        result.sort(key=lambda x: (x["dte"], x["strike"]))
        return {"status": "ok", "ticker": ticker.upper(), "spot": S,
                "option_type": option_type, "data": result}

    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))