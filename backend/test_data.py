import yfinance as yf

stock = yf.Ticker("SPY")
chain = stock.option_chain("2026-10-06")

# Look at the raw impliedVolatility column for CALLS
print(chain.calls[["strike", "impliedVolatility", "bid", "ask", "lastPrice", "volume"]].head(30).to_string())