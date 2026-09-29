# Options Risk Dashboard

A full-stack options analytics dashboard for equity and ETF options — built with React, FastAPI, and Yahoo Finance data.



## Features

- **Implied Volatility Surface** — Visualizes the IV smile across multiple DTE buckets using Black-Scholes inversion of real market prices.
- **Options Greeks** — Full Greeks table (Delta, Gamma, Theta, Vega) computed dynamically for any ticker.
- **Put-Call Skew** — 30-day skew metric that captures crash-risk pricing.
- **Multi-Ticker Support** — Type any US ticker (SPY, AAPL, TSLA, NVDA, QQQ, etc.) to load its surface and Greeks.
- **Portfolio Stress Test** — Monte Carlo VaR for arbitrary option portfolios.

## Tech Stack

**Backend**
- FastAPI (Python 3.11+)
- yfinance for market data
- scipy for Black-Scholes root-finding
- NumPy / Pandas for data processing

**Frontend**
- React 18 + Vite
- Recharts for the volatility smile panels
- Axios for API calls

## Architecture

```
frontend/                    React + Vite app
  src/
    api/client.js            Axios wrapper for the backend API
    components/
      VolSurface.jsx         IV smile panels
      GreeksTable.jsx        Options Greeks table
      TickerSearch.jsx       Ticker input
      PortfolioBuilder.jsx   Portfolio stress test UI
    App.jsx                  Main layout and data fetching

backend/                     FastAPI service
  main.py                    FastAPI app + CORS + lifespan
  routers/
    surface.py               Volatility surface endpoint
    greeks.py                Greeks endpoint
    var.py                   VaR endpoints
    scenarios.py             Scenario endpoints
  src/
    data.py                  Yahoo Finance fetching, caching, Black-Scholes pricing
    blackscholes.py          Greeks and implied-vol inversion
    montecarlo.py            Monte Carlo VaR
```

## Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
Backend runs at http://127.0.0.1:8000.

Frontend:

bash
cd frontend
npm install
npm run dev
Frontend runs at http://localhost:5173. It expects the backend at http://127.0.0.1:8000 unless VITE_API_URL is set.

Deployment
Backend: Render (Web Service, Python 3)

Frontend: Vercel (static build)

Environment variable VITE_API_URL on the frontend points to the Render backend URL.

Data Source
Yahoo Finance via yfinance. Note that Yahoo's impliedVolatility field is often a placeholder (returns 1e-5 for illiquid strikes), so the volatility surface is computed by inverting real market prices (bid/ask midpoint or last trade) through Black-Scholes.

License
MIT
