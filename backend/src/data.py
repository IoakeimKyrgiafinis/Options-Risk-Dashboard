import os
import time
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from src.blackscholes import implied_vol
load_dotenv()

DATA_URL  = "https://data.alpaca.markets"
CACHE_TTL = 300   # seconds — keeps us well inside the free 200 calls/min limit
MAX_PAGES = 30
COLUMNS   = [
    "contractSymbol", "strike", "expiration", "dte", "type",
    "moneyness", "bid", "ask", "lastPrice", "impliedVolatility",
]

_cache = {}


def _headers() -> dict:
    key    = os.getenv("ALPACA_API_KEY")
    secret = os.getenv("ALPACA_SECRET_KEY")
    if not key or not secret:
        raise RuntimeError("ALPACA_API_KEY and ALPACA_SECRET_KEY must be set")
    return {
        "APCA-API-KEY-ID":     key,
        "APCA-API-SECRET-KEY": secret,
        "accept":              "application/json",
    }


def _parse_occ(symbol: str):
    """
    Parse an OCC option symbol, e.g. SPY261016C00770000
    -> (expiration datetime, 'call'/'put', strike 770.0)
    """
    i = 0
    while not symbol[i].isdigit():
        i += 1
    expiration = datetime.strptime(symbol[i:i + 6], "%y%m%d")
    option_type = "call" if symbol[i + 6] == "C" else "put"
    strike = int(symbol[i + 7:]) / 1000
    return expiration, option_type, strike


def get_spot_price(ticker: str = "SPY") -> float:
    """Latest price from Alpaca's free IEX stock feed."""
    resp = requests.get(
        f"{DATA_URL}/v2/stocks/{ticker}/snapshot",
        params={"feed": "iex"},
        headers=_headers(),
        timeout=15,
    )
    resp.raise_for_status()
    snap = resp.json()

    for section, field in [
        ("latestTrade", "p"),
        ("minuteBar", "c"),
        ("dailyBar", "c"),
        ("prevDailyBar", "c"),
    ]:
        value = (snap.get(section) or {}).get(field)
        if value:
            return float(value)

    raise ValueError(f"No price available for {ticker}")


def get_risk_free_rate() -> float:
    """3-month Treasury yield from FRED (DGS3MO). Falls back to 4%."""
    key = os.getenv("FRED_API_KEY")
    if key:
        try:
            resp = requests.get(
                "https://api.stlouisfed.org/fred/series/observations",
                params={
                    "series_id":  "DGS3MO",
                    "api_key":    key,
                    "file_type":  "json",
                    "sort_order": "desc",
                    "limit":      10,
                },
                timeout=10,
            )
            resp.raise_for_status()
            for obs in resp.json()["observations"]:
                if obs["value"] not in (".", ""):
                    return float(obs["value"]) / 100
        except Exception as e:
            print(f"Warning: FRED risk-free rate unavailable: {e}")
    return float(os.getenv("RISK_FREE_RATE", "0.04"))


def _fetch_options_chain(ticker: str, max_dte: int = 365, band: float = 0.25) -> dict:
    spot  = get_spot_price(ticker)
    today = datetime.now(timezone.utc).date()

    params = {
        "feed":                "indicative",
        "limit":               1000,
        "strike_price_gte":    round(spot * (1 - band), 2),
        "strike_price_lte":    round(spot * (1 + band), 2),
        "expiration_date_gte": (today + timedelta(days=1)).isoformat(),
        "expiration_date_lte": (today + timedelta(days=max_dte)).isoformat(),
    }

    snapshots = {}
    for _ in range(MAX_PAGES):
        resp = requests.get(
            f"{DATA_URL}/v1beta1/options/snapshots/{ticker}",
            params=params,
            headers=_headers(),
            timeout=30,
        )
        resp.raise_for_status()
        body = resp.json()
        snapshots.update(body.get("snapshots") or {})

        token = body.get("next_page_token")
        if not token:
            break
        params["page_token"] = token

    rows = []
    for symbol, snap in snapshots.items():
        try:
            expiration, option_type, strike = _parse_occ(symbol)
        except Exception:
            continue

        dte = (expiration.date() - today).days
        if dte <= 0:
            continue

        quote = snap.get("latestQuote") or {}
        trade = snap.get("latestTrade") or {}

        rows.append({
            "contractSymbol":    symbol,
            "strike":            strike,
            "expiration":        expiration.strftime("%Y-%m-%d"),
            "dte":               dte,
            "type":              option_type,
            "moneyness":         strike / spot,
            "bid":               float(quote.get("bp") or 0),
            "ask":               float(quote.get("ap") or 0),
            "lastPrice":         float(trade.get("p") or 0),
            "impliedVolatility": float(snap.get("impliedVolatility") or 0),
        })

    df    = pd.DataFrame(rows, columns=COLUMNS)

    # Alpaca only returns IV for OTM contracts. An ITM contract has the same IV as the
    # OTM contract at the same strike and expiry (put-call parity), so copy it across.
    has_iv = df["impliedVolatility"] > 0.01
    iv_by_strike = df[has_iv].groupby(["expiration", "strike"])["impliedVolatility"].mean()
    missing = df[~has_iv]
    df.loc[missing.index, "impliedVolatility"] = [
        iv_by_strike.get((e, k), 0.0)
        for e, k in zip(missing["expiration"], missing["strike"])
    ]

    calls = df[df["type"] == "call"].reset_index(drop=True)
    puts  = df[df["type"] == "put"].reset_index(drop=True)

    return {
        "ticker":      ticker,
        "spot":        spot,
        "expirations": sorted(df["expiration"].unique().tolist()),
        "calls":       calls,
        "puts":        puts,
    }


def get_options_chain(ticker: str = "SPY") -> dict:
    """Cached wrapper — one Alpaca fetch per ticker every 5 minutes."""
    ticker = ticker.upper()
    hit = _cache.get(ticker)
    if hit and time.time() - hit[0] < CACHE_TTL:
        return hit[1]

    chain = _fetch_options_chain(ticker)
    _cache[ticker] = (time.time(), chain)
    return chain


def get_vol_surface(ticker: str = "SPY", min_dte: int = 7, max_dte: int = 365) -> list:
    """
    Build implied volatility surface by inverting Black-Scholes
    on mid prices of the options chain.
    """
    from src.blackscholes import implied_vol as calc_iv

    chain_data = get_options_chain(ticker)
    S = chain_data["spot"]
    r = get_risk_free_rate()

    surface_points = []

    for df, option_type in [(chain_data["calls"], "call"), (chain_data["puts"], "put")]:
        if df.empty:
            continue

        # OTM only: calls at/above spot, puts below spot
        if option_type == "call":
            otm = df["moneyness"] >= 1.0
        else:
            otm = df["moneyness"] < 1.0

        df = df[
            (df["dte"] >= min_dte) &
            (df["dte"] <= max_dte) &
            (df["moneyness"] >= 0.80) &
            (df["moneyness"] <= 1.20) &
            otm
        ].copy()

        for _, row in df.iterrows():
            K   = float(row["strike"])
            dte = int(row["dte"])
            T   = dte / 365

            if row["bid"] > 0 and row["ask"] > 0:
                mid_price = (row["bid"] + row["ask"]) / 2
            else:
                mid_price = float(row["lastPrice"])

            if mid_price <= 0.05:
                continue

            iv = calc_iv(mid_price, S, K, T, r, option_type)

            if iv is None or np.isnan(iv) or iv <= 0.01 or iv > 2.0:
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



def get_position_vol(ticker: str, strike: float, dte: int) -> float:
    """Implied vol at the chain contract nearest to this strike and expiry."""
    chain = get_options_chain(ticker)
    df = pd.concat([chain["calls"], chain["puts"]])
    df = df[df["impliedVolatility"] > 0.01]
    if df.empty:
        raise ValueError(f"No implied volatility available for {ticker}")

    expiries = np.sort(df["dte"].unique())
    nearest  = expiries[np.abs(expiries - dte).argmin()]
    sub      = df[df["dte"] == nearest]
    row      = sub.iloc[(sub["strike"] - strike).abs().argmin()]
    return float(row["impliedVolatility"])


def get_atm_vol(ticker: str, dte: int = 30) -> float:
    """At-the-money implied vol, used as the underlying's simulation vol."""
    chain = get_options_chain(ticker)
    return get_position_vol(ticker, chain["spot"], dte)


def enrich_positions(positions: list) -> list:
    """Attach the live spot and implied vol of its own underlying to each position."""
    out = []
    for p in positions:
        t = p["ticker"].upper()
        chain = get_options_chain(t)
        out.append({
            **p,
            "ticker": t,
            "spot":   chain["spot"],
            "iv":     get_position_vol(t, p["strike"], p["dte"]),
        })
    return out


def get_correlation(tickers: list, lookback_days: int = 400):
    """
    Correlation matrix of daily log returns from Alpaca daily bars (IEX feed).
    Returns (sorted tickers, numpy matrix).
    """
    tickers = sorted({t.upper() for t in tickers})
    if len(tickers) == 1:
        return tickers, np.array([[1.0]])

    key = ("corr", tuple(tickers))
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < 3600:
        return hit[1]

    start = (datetime.now(timezone.utc) - timedelta(days=lookback_days)).strftime("%Y-%m-%d")
    params = {
        "symbols":    ",".join(tickers),
        "timeframe":  "1Day",
        "start":      start,
        "limit":      10000,
        "adjustment": "all",
        "feed":       "iex",
    }

    closes = {t: {} for t in tickers}
    for _ in range(MAX_PAGES):
        resp = requests.get(f"{DATA_URL}/v2/stocks/bars", params=params,
                            headers=_headers(), timeout=30)
        resp.raise_for_status()
        body = resp.json()
        for sym, bars in (body.get("bars") or {}).items():
            for b in bars:
                closes[sym][b["t"][:10]] = b["c"]
        token = body.get("next_page_token")
        if not token:
            break
        params["page_token"] = token

    prices  = pd.DataFrame(closes).dropna()
    returns = np.log(prices / prices.shift(1)).dropna()
    if len(returns) < 60:
        raise ValueError("Not enough price history to estimate correlations")

    corr   = returns.corr().loc[tickers, tickers].values
    result = (tickers, corr)
    _cache[key] = (time.time(), result)
    return result