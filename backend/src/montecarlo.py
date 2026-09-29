import numpy as np
from src.blackscholes import bs_price

def simulate_spot_paths(
    S: float,
    sigma: float,
    r: float,
    T: float,
    n_paths: int = 10000,
    n_steps: int = 1,
    seed: int = 42,
) -> np.ndarray:
    """
    Simulate spot price paths using Geometric Brownian Motion.
    Returns array of shape (n_paths, n_steps + 1).
    """
    np.random.seed(seed)
    dt = T / n_steps
    Z  = np.random.standard_normal((n_paths, n_steps))

    # GBM: S(t+dt) = S(t) * exp((r - 0.5*sigma^2)*dt + sigma*sqrt(dt)*Z)
    log_returns = (r - 0.5 * sigma ** 2) * dt + sigma * np.sqrt(dt) * Z
    paths = np.zeros((n_paths, n_steps + 1))
    paths[:, 0] = S

    for t in range(1, n_steps + 1):
        paths[:, t] = paths[:, t - 1] * np.exp(log_returns[:, t - 1])

    return paths


def compute_var(
    S: float,
    sigma: float,
    r: float,
    horizon_days: int = 1,
    n_paths: int = 10000,
    confidence_levels: list = [0.95, 0.99],
) -> dict:
    """
    Compute VaR and Expected Shortfall for a long spot position.
    Uses Monte Carlo simulation with GBM.
    """
    T = horizon_days / 365
    paths = simulate_spot_paths(S, sigma, r, T, n_paths=n_paths, n_steps=1)

    # P&L = final spot - initial spot
    pnl = paths[:, -1] - S

    results = {}
    for cl in confidence_levels:
        var = float(np.percentile(pnl, (1 - cl) * 100))
        # Expected Shortfall = average loss beyond VaR
        es  = float(pnl[pnl <= var].mean())
        results[f"var_{int(cl*100)}"] = round(var, 4)
        results[f"es_{int(cl*100)}"]  = round(es, 4)

    results["horizon_days"] = horizon_days
    results["n_paths"]      = n_paths
    results["sigma"]        = sigma
    results["pnl_mean"]     = round(float(pnl.mean()), 4)
    results["pnl_std"]      = round(float(pnl.std()), 4)
    results["pnl_dist"]     = [round(float(x), 4) for x in pnl[:500]]  # sample for histogram

    return results


def compute_options_var(
    S: float,
    sigma: float,
    r: float,
    portfolio: list,
    horizon_days: int = 1,
    n_paths: int = 10000,
) -> dict:
    """
    Compute VaR for a portfolio of options using Monte Carlo.
    
    portfolio: list of dicts with keys:
        strike, dte, option_type, quantity
        (quantity positive = long, negative = short)
    """
    T_horizon = horizon_days / 365
    paths = simulate_spot_paths(S, sigma, r, T_horizon, n_paths=n_paths)
    S_final = paths[:, -1]

    portfolio_pnl = np.zeros(n_paths)

    for option in portfolio:
        K           = option["strike"]
        dte         = option["dte"]
        option_type = option["option_type"]
        quantity    = option["quantity"]
        T_option    = dte / 365

        # Current option price
        price_now = bs_price(S, K, T_option, r, sigma, option_type)

        # Option price after horizon
        T_remaining = max(T_option - T_horizon, 1/365)
        prices_future = np.array([
            bs_price(s, K, T_remaining, r, sigma, option_type)
            for s in S_final
        ])

        option_pnl = quantity * (prices_future - price_now) * 100
        portfolio_pnl += option_pnl

    var_95 = float(np.percentile(portfolio_pnl, 5))
    var_99 = float(np.percentile(portfolio_pnl, 1))
    es_95  = float(portfolio_pnl[portfolio_pnl <= var_95].mean())
    es_99  = float(portfolio_pnl[portfolio_pnl <= var_99].mean())

    return {
        "var_95":     round(var_95, 4),
        "var_99":     round(var_99, 4),
        "es_95":      round(es_95, 4),
        "es_99":      round(es_99, 4),
        "pnl_mean":   round(float(portfolio_pnl.mean()), 4),
        "pnl_std":    round(float(portfolio_pnl.std()), 4),
        "pnl_dist":   [round(float(x), 4) for x in portfolio_pnl[:500]],
        "horizon_days": horizon_days,
        "n_paths":    n_paths,
    }