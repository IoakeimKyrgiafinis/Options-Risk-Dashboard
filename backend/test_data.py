from src.data import get_options_chain, get_spot_price, get_risk_free_rate, get_vol_surface

print("Spot (SPY):", get_spot_price("SPY"))
print(f"Risk-free rate: {get_risk_free_rate():.2%}")

chain = get_options_chain("SPY")
print(f"\nExpirations: {len(chain['expirations'])}")
print(f"Calls: {len(chain['calls'])} | Puts: {len(chain['puts'])}")

print("\nSample calls:")
print(chain["calls"][["strike", "dte", "impliedVolatility", "bid", "ask", "lastPrice"]].head(30).to_string())

surface = get_vol_surface("SPY")
print(f"\nVol surface points: {len(surface)}")