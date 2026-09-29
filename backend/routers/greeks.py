from fastapi import APIRouter, HTTPException
import pandas as pd
from src.data import get_options_chain, get_spot_price, get_risk_free_rate
from src.blackscholes import bs_greeks, bs_price

router = APIRouter()

@router.get("/chain")
def get_chain_greeks(
    ticker: str = "SPY",
    option_type: str = "call",
    min_dte: int = 7,
    max_dte: int = 90,
):
    try:
        symbol = ticker.upper()
        S = get_spot_price(symbol)
        r = get_risk_free_rate()
        sigma = 0.15

        chain = get_options_chain(symbol)

        calls_df = pd.DataFrame(chain["calls"])
        puts_df  = pd.DataFrame(chain["puts"])

        df = calls_df if option_type == "call" else puts_df

        if df.empty:
            return {"status": "ok", "ticker": symbol, "option_type": option_type, "data": []}

        df = df[
            (df["dte"] >= min_dte) &
            (df["dte"] <= max_dte) &
            (df["moneyness"] >= 0.90) &
            (df["moneyness"] <= 1.10)
        ].copy()

        result = []
        for _, row in df.iterrows():
            K   = float(row["strike"])
            dte = int(row["dte"])
            T   = dte / 365
            iv  = float(row["impliedVolatility"])
            if iv <= 0.05:
                iv = sigma

            price = bs_price(S, K, T, r, iv, option_type)
            g = bs_greeks(S, K, T, r, iv, option_type)

            result.append({
                "strike":     K,
                "dte":        dte,
                "moneyness":  round(float(row["moneyness"]), 4),
                "expiration": row["expiration"],
                "iv":         round(iv, 4),
                "lastPrice":  round(float(price), 2),
                **g,
            })

        return {"status": "ok", "ticker": symbol, "option_type": option_type, "data": result}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))