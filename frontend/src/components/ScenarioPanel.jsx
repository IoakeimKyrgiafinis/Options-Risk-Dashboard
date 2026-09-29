import { useState } from 'react'
import { runScenario } from '../api/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'

export default function ScenarioPanel({ scenarios }) {
  const [selected, setSelected] = useState(null)
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)

  const run = (name) => {
    setSelected(name)
    setLoading(true)
    runScenario(name).then(res => {
      setResult(res.data)
      setLoading(false)
    })
  }

  const chartData = result
    ? result.positions.map(p => ({
        name:        `${p.option_type.toUpperCase()} $${p.strike}`,
        pnl:         p.pnl,
        price_base:  p.price_base,
        price_shock: p.price_shocked,
      }))
    : []

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '1.5rem',
    }}>

      {/* Scenario buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {scenarios.map(s => (
          <button key={s.name} onClick={() => run(s.name)} style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: '1px solid',
            borderColor: selected === s.name ? 'var(--accent)' : 'var(--border)',
            background: selected === s.name ? 'var(--accent)20' : 'transparent',
            color: selected === s.name ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: selected === s.name ? 600 : 400,
            transition: 'all 0.15s',
          }}>
            {s.label}
          </button>
        ))}
      </div>

      {loading && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Running scenario...</p>
      )}

      {result && !loading && (
        <>
          {/* Scenario summary */}
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            padding: '0.875rem 1rem',
            marginBottom: '1.25rem',
            borderLeft: `3px solid ${result.total_pnl >= 0 ? 'var(--green)' : 'var(--red)'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                {result.label}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Spot: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>${result.spot_base?.toFixed(2)}</span>
                {' → '}
                <span style={{ color: result.spot_shocked < result.spot_base ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>
                  ${result.spot_shocked?.toFixed(2)}
                </span>
                {'  ·  Vol: '}
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{(result.vol_base * 100).toFixed(0)}%</span>
                {' → '}
                <span style={{ color: result.vol_shocked > result.vol_base ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>
                  {(result.vol_shocked * 100).toFixed(0)}%
                </span>
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total P&L</p>
              <p style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: result.total_pnl >= 0 ? 'var(--green)' : 'var(--red)',
              }}>
                {result.total_pnl >= 0 ? '+' : ''}${result.total_pnl?.toFixed(2)}
              </p>
            </div>
          </div>

          {/* P&L bar chart */}
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} stroke="#1e2d45" />
              <YAxis tickFormatter={v => `$${v.toFixed(0)}`} tick={{ fontSize: 11, fill: '#64748b' }} stroke="#1e2d45" />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                }}
                formatter={(val, name) => [`$${val.toFixed(4)}`, name]}
              />
              <ReferenceLine y={0} stroke="#1e2d45" />
              <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl >= 0 ? '#10b98160' : '#ef444460'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Position table */}
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '160px 80px 100px 100px 100px 80px 80px',
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '0.5rem 0',
              borderBottom: '1px solid var(--border)',
            }}>
              <span>Position</span>
              <span>Qty</span>
              <span>Base Price</span>
              <span>Shocked Price</span>
              <span>P&L</span>
              <span>Delta</span>
              <span>Vega</span>
            </div>
            {result.positions.map((p, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '160px 80px 100px 100px 100px 80px 80px',
                fontSize: '0.875rem',
                padding: '0.6rem 0',
                borderBottom: '1px solid var(--border)',
                alignItems: 'center',
              }}>
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                  {p.option_type} ${p.strike}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>×{p.quantity}</span>
                <span style={{ color: 'var(--text-secondary)' }}>${p.price_base?.toFixed(4)}</span>
                <span style={{ color: 'var(--text-secondary)' }}>${p.price_shocked?.toFixed(4)}</span>
                <span style={{ color: p.pnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                  {p.pnl >= 0 ? '+' : ''}${p.pnl?.toFixed(2)}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>{p.delta?.toFixed(3)}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{p.vega?.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {!result && !loading && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Select a scenario above to run the P&L analysis.
        </p>
      )}
    </div>
  )
}