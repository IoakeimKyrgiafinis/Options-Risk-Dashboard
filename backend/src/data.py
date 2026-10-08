import json
import os

JSON_PATH = os.path.join(os.path.dirname(__file__), "../market_data.json")

def load_snapshot():
    if os.path.exists(JSON_PATH):
        try:
            with open(JSON_PATH, "r") as f:
                content = f.read().strip()
                if not content:
                    return {}
                return json.loads(content)
        except json.JSONDecodeError:
            return {}
    return {}
CACHE = load_snapshot()

def get_options_chain(ticker: str = "SPY", max_expirations: int = 999, use_fallback: bool = True) -> dict:
    ticker = ticker.upper()
    if ticker in CACHE:
        return CACHE[ticker]
    if CACHE:
        first_key = list(CACHE.keys())[0]
        return CACHE[first_key]
    return {"ticker": ticker, "spot": 0.0, "expirations": [], "calls": [], "puts": []}

def get_spot_price(ticker: str = "SPY") -> float:
    ticker = ticker.upper()
    if ticker in CACHE:
        return float(CACHE[ticker].get("spot", 100.0))
    return 100.0

def get_risk_free_rate() -> float:
    return 0.05

def get_vol_surface(ticker: str = "SPY", min_dte: int = 7, max_dte: int = 365) -> list:
    ticker = ticker.upper()
    if ticker in CACHE and "surface" in CACHE[ticker]:
        return CACHE[ticker]["surface"]
    if CACHE:
        first_key = list(CACHE.keys())[0]
        return CACHE[first_key].get("surface", [])
    return []




