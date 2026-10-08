import { useEffect, useState, useCallback } from 'react'
import { getVolSurface, getGreeks, getStatus } from './api/client'
import VolSurface from './components/VolSurface'
import GreeksTable from './components/GreeksTable'
import PortfolioBuilder from './components/PortfolioBuilder'
// import TickerSearch from './components/TickerSearch'

export default function App() {
  const [ticker, setTicker] = useState('SPY')

  const [surface, setSurface]         = useState([])
  const [greeks, setGreeks]           = useState([])
  const [spot, setSpot]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const fetchAll = useCallback(async (symbol) => {
    setLoading(true)
    setError(null)
    try {
      const [surfaceRes, callRes, putRes, statusRes] = await Promise.all([
        getVolSurface(symbol),
        getGreeks('call', symbol),
        getGreeks('put', symbol),
        getStatus(symbol),
      ])

      setSurface(surfaceRes.data.data || [])

      const calls = (callRes.data.data || []).map(item => ({ ...item, type: 'call' }))
      const puts  = (putRes.data.data  || []).map(item => ({ ...item, type: 'put'  }))
      setGreeks([...calls, ...puts])

      setSpot(statusRes.data.spot)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll(ticker)
  }, [ticker, fetchAll])

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>
            Options Risk Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Implied volatility surface · Options Greeks · Options Portfolio Stress Test
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Last updated</p>
          <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            10/08/2026 16:55
          </p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Source: Demo Snapshot · {ticker}
          </p>
        </div>
      </div>

      {/* Ticker Dropdown Selector */}
      <div style={{ 
        marginBottom: '1.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem',
        background: 'var(--bg-secondary, #1e1e1e)',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid var(--border, #333)'
      }}>
        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary, #fff)' }}>
          Select Demo Ticker:
        </label>
        <select 
          value={ticker} 
          onChange={(e) => setTicker(e.target.value)}
          style={{
            background: '#2d2d2d',
            border: '1px solid #444',
            borderRadius: '6px',
            padding: '0.5rem 1rem',
            color: '#fff',
            fontSize: '0.875rem',
            outline: 'none',
            cursor: 'pointer',
            minWidth: '120px'
          }}
        >
          {["SPY", "AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "GOOGL", "META", "NFLX", "AMD"].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {loading && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Loading...</span>}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          background: '#ef444420',
          border: '1px solid #ef4444',
          color: '#ef4444',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
        }}>
          Failed to load <strong>{ticker}</strong>: {error}
        </div>
      )}

      {/* Vol Surface */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Implied Volatility Surface — {ticker}
        </h2>
        <VolSurface data={surface} loading={loading} />
      </section>

      {/* Greeks */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Options Greeks — {ticker}
        </h2>
        <GreeksTable data={greeks} loading={loading} />
      </section>

      {/* Portfolio Builder */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Custom Portfolio Stress Test
        </h2>
        <PortfolioBuilder spot={spot} ticker={ticker} />
      </section>

    </div>
  )
}