import { useState, useMemo } from 'react'

export default function GreeksTable({ data }) {
  const [optionType, setOptionType] = useState('call')
  const [searchTerm, setSearchTerm] = useState('')
  
  const filtered = useMemo(() => {
    if (!Array.isArray(data)) return []
    return data.filter(d => {
      
      const rawType = String(d.option_type || d.type || d.right || d.cp || 'call').toLowerCase()
      
      
      const normalizedType = (rawType.includes('p') && !rawType.includes('c')) ? 'put' : 'call'
      
      const matchesType = normalizedType === optionType.toLowerCase()
      const matchesStrike = searchTerm === '' || d.strike?.toString().includes(searchTerm)
      
      return matchesType && matchesStrike
    })
  }, [data, optionType, searchTerm])
  console.log('Sample row object:', data[0])
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '1.5rem',
    }}>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['call', 'put'].map(t => (
            <button key={t} onClick={() => setOptionType(t)} style={{
              padding: '0.3rem 0.875rem',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: optionType === t ? 'var(--accent)' : 'var(--border)',
              background: optionType === t ? 'var(--accent)20' : 'transparent',
              color: optionType === t ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: optionType === t ? 600 : 400,
              textTransform: 'capitalize',
            }}>
              {t === 'call' ? 'Calls' : 'Puts'}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Filter strike..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '0.3rem 0.75rem',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            outline: 'none',
            width: '140px',
          }}
        />
      </div>

      {/* Table container */}
      <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>Expiration</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Strike</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Black Scholes Price</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>IV</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Delta</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Gamma</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Theta</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Vega</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.6rem 0.5rem', textAlign: 'left', color: 'var(--text-secondary)' }}>{row.expiration}</td>
                <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>${row.strike?.toFixed(2)}</td>
                <td style={{ padding: '0.6rem 0.5rem' }}>
                  ${(row.lastPrice ?? row.price ?? row.last ?? 0).toFixed(2)}
                </td>
                <td style={{ padding: '0.6rem 0.5rem', color: 'var(--blue)' }}>{row.iv ? `${(row.iv * 100).toFixed(1)}%` : '—'}</td>
                <td style={{ padding: '0.6rem 0.5rem', color: row.delta >= 0 ? 'var(--green)' : 'var(--red)' }}>{row.delta?.toFixed(3)}</td>
                <td style={{ padding: '0.6rem 0.5rem' }}>{row.gamma?.toFixed(4)}</td>
                <td style={{ padding: '0.6rem 0.5rem', color: 'var(--amber)' }}>{row.theta?.toFixed(3)}</td>
                <td style={{ padding: '0.6rem 0.5rem' }}>{row.vega?.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
        Greeks are calculated dynamically using the Black-Scholes pricing engine based on underlying spot price, strike, time to expiry, and implied volatility.
      </p>
    </div>
  )
}