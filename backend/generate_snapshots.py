import json
import os
import pandas as pd
import numpy as np
from src.data_live import get_options_chain, get_vol_surface

# 10 Διάσημα Tickers για το Demo
TICKERS = ["SPY", "AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "GOOGL", "META", "NFLX", "AMD"]

def sanitize_data(obj):
    """Βοηθητική συνάρτηση για τη μετατροπή μη-serializable τύπων σε strings/numbers."""
    if isinstance(obj, pd.Timestamp):
        return obj.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(obj, (np.int64, np.int32)):
        return int(obj)
    if isinstance(obj, (np.float64, np.float32)):
        return float(obj)
    if pd.isna(obj):
        return None
    return obj

def build_snapshot():
    snapshot = {}
    print("Generating market snapshots for demo...")
    
    for ticker in TICKERS:
        print(f"Fetching data for {ticker}...")
        try:
            chain = get_options_chain(ticker)
            surface = get_vol_surface(ticker)
            
            # Καθαρισμός calls/puts από Timestamps ή NaN
            cleaned_calls = [{k: sanitize_data(v) for k, v in row.items()} for row in chain["calls"]]
            cleaned_puts = [{k: sanitize_data(v) for k, v in row.items()} for row in chain["puts"]]
            
            snapshot[ticker] = {
                "ticker": ticker,
                "spot": sanitize_data(chain["spot"]),
                "expirations": chain["expirations"],
                "calls": cleaned_calls,
                "puts": cleaned_puts,
                "surface": surface
            }
        except Exception as e:
            print(f"Skipping {ticker} due to error: {e}")

    # Αποθήκευση σε αρχείο JSON
    output_path = "market_data.json"
    with open(output_path, "w") as f:
        json.dump(snapshot, f, indent=2)
    print(f"Successfully saved snapshot to {output_path}!")

if __name__ == "__main__":
    build_snapshot()