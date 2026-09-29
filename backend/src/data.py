# src/data.py

import yfinance as yf
import pandas as pd
import numpy as np
import math
from datetime import datetime, date
from scipy.stats import norm


def bs_price(S: float, K: float, T: float, r: float, sigma: float, option_type: str = "call") -> float:
    if T <= 0 or sigma <= 0:
        return max(0.0, S - K) if option_type == "call" else max(0.0, K - S)
    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    if option_type == "call":
        price = S * norm.cdf(d1) - K * math.exp(-r * T) * norm.cdf(d2)
    else:
        price = K * math.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
    return float(price)


def get_options_chain(ticker: str = "SPY", max_expirations: int = 999, use_fallback: bool = True) -> dict:
    """
    Fetch full options chain.
    - use_fallback=True: Fill bad IVs with 18% (for Greeks table)
    - use_fallback=False: Leave bad IVs as NaN (for Vol Surface)
    """
    stock = yf.Ticker(ticker)
    spot = stock.info.get("regularMarketPrice") or stock.info.get("currentPrice")
    if spot is None:
        hist = stock.history(period="1d")
        spot = float(hist["Close"].iloc[-1])

    expirations = stock.options
    if not expirations:
        return {"ticker": ticker, "spot": spot, "calls": [], "puts": []}

    expirations = expirations[:max_expirations]
    r = get_risk_free_rate()

    all_calls = []
    all_puts  = []

    for exp in expirations:
        try:
            chain = stock.option_chain(exp)
            exp_date = datetime.strptime(exp, "%Y-%m-%d").date()
            today = date.today()
            dte = (exp_date - today).days

            if dte <= 0:
                continue

            T = dte / 365.0

            # --- Calls ---
            calls = chain.calls.copy()
            calls["expiration"] = exp
            calls["dte"]        = dte
            calls["type"]       = "call"
            calls["moneyness"]  = calls["strike"] / spot
            calls["impliedVolatility"] = pd.to_numeric(calls["impliedVolatility"], errors="coerce")

            if use_fallback:
                # FALLBACK MODE: Fill bad IVs with 18%
                calls.loc[calls["impliedVolatility"].isna(), "impliedVolatility"] = 0.18
                calls.loc[calls["impliedVolatility"] <= 0.12, "impliedVolatility"] = 0.18

            calculated_calls = []
            for _, row in calls.iterrows():
                iv = float(row["impliedVolatility"])
                K  = float(row["strike"])
                if np.isnan(iv) or iv <= 0:
                    calculated_calls.append(np.nan)
                else:
                    price = bs_price(spot, K, T, r, iv, "call")
                    calculated_calls.append(round(float(price), 2))
            calls["lastPrice"] = calculated_calls
            all_calls.append(calls)

            # --- Puts ---
            puts = chain.puts.copy()
            puts["expiration"] = exp
            puts["dte"]        = dte
            puts["type"]       = "put"
            puts["moneyness"]  = puts["strike"] / spot
            puts["impliedVolatility"] = pd.to_numeric(puts["impliedVolatility"], errors="coerce")

            if use_fallback:
                puts.loc[puts["impliedVolatility"].isna(), "impliedVolatility"] = 0.18
                puts.loc[puts["impliedVolatility"] <= 0.12, "impliedVolatility"] = 0.18

            calculated_puts = []
            for _, row in puts.iterrows():
                iv = float(row["impliedVolatility"])
                K  = float(row["strike"])
                if np.isnan(iv) or iv <= 0:
                    calculated_puts.append(np.nan)
                else:
                    price = bs_price(spot, K, T, r, iv, "put")
                    calculated_puts.append(round(float(price), 2))
            puts["lastPrice"] = calculated_puts
            all_puts.append(puts)

        except Exception as e:
            print(f"Warning: could not fetch {exp}: {e}")
            continue

    calls_df = pd.concat(all_calls, ignore_index=True) if all_calls else pd.DataFrame()
    puts_df  = pd.concat(all_puts, ignore_index=True) if all_puts else pd.DataFrame()

    return {
        "ticker":      ticker,
        "spot":        spot,
        "expirations": list(expirations),
        "calls":       calls_df.to_dict(orient="records") if not calls_df.empty else [],
        "puts":        puts_df.to_dict(orient="records") if not puts_df.empty else [],
    }


def get_spot_price(ticker: str = "SPY") -> float:
    stock = yf.Ticker(ticker)
    spot = stock.info.get("regularMarketPrice") or stock.info.get("currentPrice")
    if spot is None:
        hist = stock.history(period="1d")
        spot = float(hist["Close"].iloc[-1])
    return float(spot)


def get_risk_free_rate() -> float:
    try:
        tbill = yf.Ticker("^IRX")
        hist  = tbill.history(period="5d")
        return float(hist["Close"].iloc[-1]) / 100
    except:
        return 0.05


from src.blackscholes import implied_vol as calc_iv

def get_vol_surface(ticker: str = "SPY", min_dte: int = 7, max_dte: int = 365) -> list:
    """
    Build implied volatility surface from options chain.
    Computes IV from real market prices (bid/ask midpoint or last trade),
    NOT from Yahoo's placeholder impliedVolatility field.
    """
    chain_data = get_options_chain(ticker)
    S = chain_data["spot"]
    r = get_risk_free_rate()

    from src.blackscholes import implied_vol as calc_iv

    surface_points = []

    for raw_data, option_type in [(chain_data["calls"], "call"), (chain_data["puts"], "put")]:
        # Convert list of dicts to DataFrame FIRST
        if not raw_data:
            continue
        df = pd.DataFrame(raw_data)
        if df.empty:
            continue

        df = df[
            (df["dte"] >= min_dte) &
            (df["dte"] <= max_dte) &
            (df["moneyness"] >= 0.80) &
            (df["moneyness"] <= 1.20)
        ].copy()

        for _, row in df.iterrows():
            K   = float(row["strike"])
            dte = int(row["dte"])
            T   = dte / 365

            # Use bid-ask midpoint if available, else last traded price
            bid = float(row.get("bid", 0) or 0)
            ask = float(row.get("ask", 0) or 0)
            if bid > 0 and ask > 0:
                mid_price = (bid + ask) / 2
            else:
                mid_price = float(row.get("lastPrice", 0) or 0)

            if mid_price <= 0.05:
                continue

            # Compute IV from real market price
            iv = calc_iv(mid_price, S, K, T, r, option_type)

            if iv is None or np.isnan(iv) or iv <= 0.05 or iv > 2.0:
                continue

            surface_points.append({
                "strike":      K,
                "moneyness":   round(float(row["moneyness"]), 4),
                "dte":         dte,
                "iv":          round(iv, 4),
                "option_type": option_type,
                "expiration":  row["expiration"],
            })

    return surface_points