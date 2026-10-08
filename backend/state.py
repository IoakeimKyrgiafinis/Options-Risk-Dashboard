# state.py
model_state = {"spot": 0.0, "r": 0.05, "ticker": "SPY"}

def update_model_state(ticker: str):
    from src.data import get_spot_price, get_risk_free_rate
    model_state["ticker"] = ticker.upper()
    model_state["spot"] = get_spot_price(ticker.upper())
    model_state["r"] = get_risk_free_rate()