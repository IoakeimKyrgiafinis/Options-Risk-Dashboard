import { useState, useMemo, memo } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const DTE_BUCKETS = [
  { label: '≤14d',  min: 0,   max: 14  },
  { label: '15-30d', min: 15,  max: 30  },
  { label: '31-60d', min: 31,  max: 60  },
  { label: '61-90d', min: 61,  max: 90  },
  { label: '91-180d',min: 91,  max: 180 },
  { label: '>180d',  min: 181, max: 999 },
]

function getIVColor(iv) {
  if (iv < 0.12) return '#10b981'
  if (iv < 0.16) return '#3b82f6'
  if (iv < 0.20) return '#f59e0b'
  if (iv < 0.25) return '#ef4444'
  return '#7c3aed'
}

function SmileChart({ points, expLabel }) {
  const sorted = [...points].sort((a, b) => a.moneyness - b.moneyness)
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: '8px',
      padding: '1rem',
      border: '1px solid var(--border)',
    }}>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
        {expLabel}
      </p>
      <ResponsiveContainer width="100%" height={140}>
        <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <XAxis
            dataKey="moneyness"
            type="number"
            domain={[0.80, 1.20]}
            tickFormatter={v => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: 10, fill: '#64748b' }}
            stroke="#1e2d45"
          />
          <YAxis
            dataKey="iv"
            type="number"
            tickFormatter={v => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: 10, fill: '#64748b' }}
            stroke="#1e2d45"
            width={35}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '0.75rem',
            }}
            formatter={(val, name) => [
              name === 'iv' ? `${(val * 100).toFixed(1)}%` : val.toFixed(3),
              name === 'iv' ? 'Implied Vol' : 'Moneyness'
            ]}
          />
          <Scatter data={sorted} dataKey="iv">
            {sorted.map((entry, i) => (
              <Cell key={i} fill={getIVColor(entry.iv)} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function VolSurface({ data }) {
  const [optionType, setOptionType] = useState('all')

  const filtered = useMemo(() => {
    if (optionType === 'all') return data
    return data.filter(d => d.option_type === optionType)
  }, [data, optionType])

  // Group by DTE bucket
  const buckets = useMemo(() => {
    return DTE_BUCKETS.map(bucket => ({
      ...bucket,
      points: filtered.filter(d => d.dte >= bucket.min && d.dte <= bucket.max),
    })).filter(b => b.points.length > 0)
  }, [filtered])

  // Summary stats
  const atm = filtered.filter(d => d.moneyness >= 0.98 && d.moneyness <= 1.02)
  const avgATMVol = atm.length > 0 ? atm.reduce((s, d) => s + d.iv, 0) / atm.length : null
  const skew = filtered.filter(d => d.dte >= 25 && d.dte <= 35)
  const otmPuts  = skew.filter(d => d.moneyness <= 0.95 && d.option_type === 'put')
  const otmCalls = skew.filter(d => d.moneyness >= 1.05 && d.option_type === 'call')
  const avgPutVol  = otmPuts.length  > 0 ? otmPuts.reduce((s, d)  => s + d.iv, 0) / otmPuts.length  : null
  const avgCallVol = otmCalls.length > 0 ? otmCalls.reduce((s, d) => s + d.iv, 0) / otmCalls.length : null
  const skewVal = avgPutVol && avgCallVol ? avgPutVol - avgCallVol : null

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '1.5rem',
    }}>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Surface Points', value: data.length },
          { label: 'ATM Implied Vol', value: avgATMVol ? `${(avgATMVol * 100).toFixed(1)}%` : '—' },
          { label: '30d Put-Call Skew', value: skewVal ? `${(skewVal * 100).toFixed(1)}pp` : '—' },
          { label: 'Expirations', value: [...new Set(data.map(d => d.expiration))].length },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            padding: '0.875rem 1rem',
            border: '1px solid var(--border)',
          }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              {stat.label}
            </p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {['all', 'call', 'put'].map(t => (
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
            {t === 'all' ? 'All' : t === 'call' ? 'Calls' : 'Puts'}
          </button>
        ))}

        {/* Legend */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {[
            { color: '#10b981', label: '<12%' },
            { color: '#3b82f6', label: '12-16%' },
            { color: '#f59e0b', label: '16-20%' },
            { color: '#ef4444', label: '20-25%' },
            { color: '#7c3aed', label: '>25%' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Smile charts per DTE bucket */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        {buckets.map(bucket => (
          <SmileChart
            key={bucket.label}
            points={bucket.points}
            expLabel={`${bucket.label} · ${bucket.points.length} points`}
          />
        ))}
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
        Each panel shows the volatility smile for a maturity bucket. X-axis is moneyness (strike/spot),
        Y-axis is implied vol extracted via Black-Scholes inversion. The downward slope in OTM puts reflects the volatility skew — markets price crash risk at a premium.
      </p>
    </div>
  )
}