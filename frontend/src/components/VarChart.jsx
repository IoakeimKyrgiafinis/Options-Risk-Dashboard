import { useState } from 'react'
import { getSpotVar } from '../api/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'

export default function VarChart({ data: initialData }) {
  const [data, setData]       = useState(initialData)
  const [horizon, setHorizon] = useState(1)
  const [loading, setLoading] = useState(false)

  const fetchVar = (days) => {
    setHorizon(days)
    setLoading(true)
    getSpotVar(days).then(res => {
      setData(res.data.data)
      setLoading(false)
    })
  }

  if (!data) return null

  // Build histogram from pnl_dist sample
  const pnlDist = data.pnl_dist || []
  const min = Math.min(...pnlDist)
  const max = Math.max(...pnlDist)
  const bins = 40
  const binWidth = (max - min) / bins
  const histogram = Array.from({ length: bins }, (_, i) => {
    const binMin = min + i * binWidth
    const binMax = binMin + binWidth
    const count  = pnlDist.filter(v => v >= binMin && v < binMax).length
    return {
      bin:   parseFloat(binMin.toFixed(2)),
      count,
      isLoss: binMax <= data.var_95,
    }
  })

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '1.5rem',
    }}>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'VaR 95%',     value: `$${data.var_95?.toFixed(2)}`,  color: 'var(--amber)' },
          { label: 'VaR 99%',     value: `$${data.var_99?.toFixed(2)}`,  color: 'var(--red)'   },
          { label: 'ES 95%',      value: `$${data.es_95?.toFixed(2)}`,   color: 'var(--red)'   },
          { label: 'P&L Std Dev', value: `$${data.pnl_std?.toFixed(2)}`, color: 'var(--text-primary)' },
          { label: 'Simulations', value: data.n_paths?.toLocaleString(),  color: 'var(--text-primary)' },
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
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Horizon selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>Horizon:</span>
        {[1, 5, 10].map(d => (
          <button key={d} onClick={() => fetchVar(d)} style={{
            padding: '0.3rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid',
            borderColor: horizon === d ? 'var(--accent)' : 'var(--border)',
            background: horizon === d ? 'var(--accent)20' : 'transparent',
            color: horizon === d ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: horizon === d ? 600 : 400,
          }}>
            {d}d
          </button>
        ))}
        {loading && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>Computing...</span>}
      </div>

      {/* P&L Distribution histogram */}
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={histogram} barCategoryGap={1}>
          <XAxis
            dataKey="bin"
            tickFormatter={v => `$${v.toFixed(0)}`}
            tick={{ fontSize: 11, fill: '#64748b' }}
            stroke="#1e2d45"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            stroke="#1e2d45"
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '0.75rem',
            }}
            formatter={(val, name) => [val, 'Simulations']}
            labelFormatter={l => `P&L ≈ $${parseFloat(l).toFixed(2)}`}
          />
          <ReferenceLine x={data.var_95} stroke="var(--amber)" strokeDasharray="4 4" label={{ value: 'VaR 95%', fill: '#f59e0b', fontSize: 11 }} />
          <ReferenceLine x={data.var_99} stroke="var(--red)"   strokeDasharray="4 4" label={{ value: 'VaR 99%', fill: '#ef4444', fontSize: 11 }} />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {histogram.map((entry, i) => (
              <Cell key={i} fill={entry.isLoss ? '#ef444460' : '#3b82f640'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
        P&L distribution from {data.n_paths?.toLocaleString()} Monte Carlo simulations using Geometric Brownian Motion.
        Red bars represent losses beyond the 95% VaR threshold. ES (Expected Shortfall) is the average loss in the tail beyond VaR.
      </p>
    </div>
  )
}