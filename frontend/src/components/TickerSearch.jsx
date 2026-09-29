// src/components/TickerSearch.jsx
import { useState, useEffect } from 'react'

export default function TickerSearch({ onSearch, loading, initialValue = 'SPY' }) {
  const [value, setValue] = useState(initialValue)

  // Keep the input in sync when the ticker is changed externally
  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  const handleSubmit = (e) => {
    e.preventDefault()
    const symbol = value.trim().toUpperCase()
    if (symbol) onSearch(symbol)
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '0.35rem 0.5rem 0.35rem 0.875rem',
        width: '360px',
        gap: '0.5rem',
      }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>🔍</span>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          placeholder="Enter ticker (e.g. AAPL, TSLA, NVDA)"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            letterSpacing: '0.03em',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.4rem 0.875rem',
            borderRadius: '6px',
            border: '1px solid var(--accent)',
            background: 'var(--accent)20',
            color: 'var(--accent)',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          {loading ? 'Loading…' : 'Load'}
        </button>
      </div>
    </form>
  )
}