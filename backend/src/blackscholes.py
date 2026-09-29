import numpy as np
from scipy.stats import norm
from scipy.optimize import brentq

def d1(S, K, T, r, sigma):
    return (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))

def d2(S, K, T, r, sigma):
    return d1(S, K, T, r, sigma) - sigma * np.sqrt(T)

def bs_price(S, K, T, r, sigma, option_type="call") -> float:
    """
    Black-Scholes option price.
    S: spot, K: strike, T: time to expiry in years
    r: risk-free rate, sigma: volatility
    """
    if T <= 0 or sigma <= 0:
        return max(0, S - K) if option_type == "call" else max(0, K - S)

    D1 = d1(S, K, T, r, sigma)
    D2 = d2(S, K, T, r, sigma)

    if option_type == "call":
        return S * norm.cdf(D1) - K * np.exp(-r * T) * norm.cdf(D2)
    else:
        return K * np.exp(-r * T) * norm.cdf(-D2) - S * norm.cdf(-D1)


def bs_greeks(S, K, T, r, sigma, option_type="call") -> dict:
    """
    Compute all Greeks for a single option.
    """
    if T <= 0 or sigma <= 0:
        return {"delta": 0, "gamma": 0, "vega": 0, "theta": 0, "rho": 0}

    D1 = d1(S, K, T, r, sigma)
    D2 = d2(S, K, T, r, sigma)

    # Delta
    if option_type == "call":
        delta = norm.cdf(D1)
    else:
        delta = norm.cdf(D1) - 1

    # Gamma (same for calls and puts)
    gamma = norm.pdf(D1) / (S * sigma * np.sqrt(T))

    # Vega (same for calls and puts) — per 1% move in vol
    vega = S * norm.pdf(D1) * np.sqrt(T) / 100

    # Theta — per calendar day
    if option_type == "call":
        theta = (
            -S * norm.pdf(D1) * sigma / (2 * np.sqrt(T))
            - r * K * np.exp(-r * T) * norm.cdf(D2)
        ) / 365
    else:
        theta = (
            -S * norm.pdf(D1) * sigma / (2 * np.sqrt(T))
            + r * K * np.exp(-r * T) * norm.cdf(-D2)
        ) / 365

    # Rho — per 1% move in rates
    if option_type == "call":
        rho = K * T * np.exp(-r * T) * norm.cdf(D2) / 100
    else:
        rho = -K * T * np.exp(-r * T) * norm.cdf(-D2) / 100

    return {
        "delta": round(delta, 6),
        "gamma": round(gamma, 6),
        "vega":  round(vega, 6),
        "theta": round(theta, 6),
        "rho":   round(rho, 6),
    }


def implied_vol(market_price, S, K, T, r, option_type="call") -> float:
    """
    Extract implied volatility from market price using Brent's method.
    Returns NaN if no solution found or inputs are invalid.
    """
    if T <= 0 or market_price <= 0:
        return float("nan")

    # Intrinsic value check
    intrinsic = max(0, S - K) if option_type == "call" else max(0, K - S)
    if market_price <= intrinsic:
        return float("nan")

    try:
        iv = brentq(
            lambda sigma: bs_price(S, K, T, r, sigma, option_type) - market_price,
            1e-6,  # lower bound
            10.0,  # upper bound (1000% vol)
            xtol=1e-6,
            maxiter=500,
        )
        return round(iv, 6)
    except (ValueError, RuntimeError):
        return float("nan")