import { useEffect, useState } from 'react'
import { getVolSurface, getGreeks } from './api/client'
import VolSurface from './components/VolSurface'
import GreeksTable from './components/GreeksTable'
import PortfolioBuilder from './components/PortfolioBuilder'

const sectionTitle = {
  fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem',
  textTransform: 'uppercase', letterSpacing: '0.05em',
}

export default function App() {
  const [ticker, setTicker]           = useState('SPY')
  const [tickerInput, setTickerInput] = useState('SPY')
  const [spot, setSpot]               = useState(null)
  const [asOf, setAsOf]               = useState(null)
  const [surface, setSurface]         = useState([])
  const [greeks, setGreeks]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [switching, setSwitching]     = useState(false)
  const [error, setError]             = useState(null)

  const loadTicker = (t) => {
    if (!t) return
    setSwitching(true)
    setError(null)
    Promise.all([getVolSurface(t), getGreeks('call', t), getGreeks('put', t)])
      .then(([surfaceRes, callRes, putRes]) => {
        setTicker(surfaceRes.data.ticker)
        setSpot(surfaceRes.data.spot)
        setSurface(surfaceRes.data.data)
        setGreeks([...callRes.data.data, ...putRes.data.data])
        setAsOf(new Date())
        setLoading(false)
        setSwitching(false)
      })
      .catch(() => {
        setError(`Could not load options for "${t}". Check the symbol and try again.`)
        setLoading(false)
        setSwitching(false)
      })
  }

  useEffect(() => { loadTicker('SPY') }, [])

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', color: 'var(--text-secondary)', fontSize: '0.875rem',
    }}>
      Loading market data...
    </div>
  )

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem' }}>

      {/* Header */}
      <div style={{
        marginBottom: '2rem', display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap',
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Options Risk Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Black-Scholes pricing · Monte Carlo VaR · Implied volatility surface
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              value={tickerInput}
              onChange={e => setTickerInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && loadTicker(tickerInput.trim())}
              placeholder="SPY, AAPL, NVDA..."
              style={{
                width: '150px', padding: '0.5rem 0.75rem', borderRadius: '6px',
                border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600,
                letterSpacing: '0.05em',
              }}
            />
            <button
              onClick={() => loadTicker(tickerInput.trim())}
              disabled={switching}
              style={{
                padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--accent)',
                background: 'var(--accent)20', color: 'var(--accent)',
                cursor: switching ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 600,
              }}
            >
              {switching ? 'Loading...' : 'Load'}
            </button>
          </div>

          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ticker} spot</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.1 }}>
              {spot ? `$${spot.toFixed(2)}` : '—'}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Last updated</p>
            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              {asOf?.toLocaleString('en-GB', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Source: Alpaca Markets (indicative feed)
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--red)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{error}</p>
      )}

      <div style={{ opacity: switching ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={sectionTitle}>Implied Volatility Surface · {ticker}</h2>
          <VolSurface data={surface} />
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={sectionTitle}>Options Greeks · {ticker}</h2>
          <GreeksTable data={greeks} />
        </section>
      </div>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={sectionTitle}>Custom Portfolio Stress Test</h2>
        <PortfolioBuilder />
      </section>

    </div>
  )
}