import { useState } from 'react'
import { getTickerSpot, runCustomScenario, getPortfolioVar } from '../api/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'

const EMPTY_POSITION = { strike: '', dte: 30, option_type: 'call', quantity: 1 }

export default function PortfolioBuilder() {
  // Ticker
  const [ticker, setTicker]       = useState('SPY')
  const [tickerInput, setTickerInput] = useState('SPY')
  const [spot, setSpot]           = useState(null)
  const [r, setR]                 = useState(0.04)
  const [tickerLoading, setTickerLoading] = useState(false)
  const [tickerError, setTickerError]     = useState(null)

  // Portfolio
  const [positions, setPositions] = useState([])
  const [form, setForm]           = useState(EMPTY_POSITION)

  // Sliders
  const [spotShock, setSpotShock] = useState(0)
  const [volShock, setVolShock]   = useState(0)

  // Results
  const [result, setResult]       = useState(null)
  const [varData, setVarData]     = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const fetchTicker = () => {
    if (!tickerInput.trim()) return
    setTickerLoading(true)
    setTickerError(null)
    
    getTickerSpot(tickerInput.trim().toUpperCase())
      .then(res => {
        setTicker(res.data.ticker)
        setSpot(res.data.spot)
        setR(res.data.r)
        setTickerLoading(false)
      })
      .catch(() => {
        setTickerError('Could not fetch ticker. Check the symbol and try again.')
        setTickerLoading(false)
      })
  }

  const addPosition = () => {
    if (!form.strike || parseFloat(form.strike) <= 0 || !spot) return
    setPositions(prev => [...prev, {
      ...form,
      strike:   parseFloat(form.strike),
      quantity: parseInt(form.quantity),
      ticker:   ticker,
      spot:     spot,
    }])
    setForm(EMPTY_POSITION)
    setResult(null)
    setVarData(null)
  }

  const removePosition = (i) => {
    setPositions(prev => prev.filter((_, idx) => idx !== i))
    setResult(null)
    setVarData(null)
  }

  const runScenario = () => {
    if (positions.length === 0 || !spot) return
    setLoading(true)
    setError(null)
    Promise.all([
      runCustomScenario({
        portfolio:  positions,
      
        spot_shock: spotShock / 100,
        vol_shock:  volShock / 100,
        sigma:      0.15,
        r:          r,
      }),
      getPortfolioVar(positions, 1),
    ])
      .then(([scenarioRes, varRes]) => {
        setResult(scenarioRes.data)
        setVarData(varRes.data.data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }

  const chartData = result
    ? result.positions.map(p => ({
        name: `${p.option_type.toUpperCase()} $${p.strike} ×${p.quantity}`,
        pnl:  p.pnl,
      }))
    : []

  const spotColor = spotShock === 0 ? 'var(--text-secondary)'
    : spotShock > 0 ? 'var(--green)' : 'var(--red)'

  const volColor = volShock === 0 ? 'var(--text-secondary)'
    : volShock > 0 ? 'var(--red)' : 'var(--green)'

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '1.5rem',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

        {/* ── LEFT COLUMN ── */}
        <div>

          {/* Ticker input */}
          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Ticker
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={tickerInput}
                onChange={e => setTickerInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && fetchTicker()}
                placeholder="SPY, AAPL, NVDA..."
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                }}
              />
              <button onClick={fetchTicker} disabled={tickerLoading} style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid var(--accent)',
                background: 'var(--accent)20',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}>
                {tickerLoading ? '...' : 'Load'}
              </button>
            </div>
            {tickerError && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.35rem' }}>{tickerError}</p>}
            {spot && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{ticker}</span>
                {' spot: '}
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>${spot?.toFixed(2)}</span>
                {'  ·  r: '}
                <span style={{ color: 'var(--text-primary)' }}>{(r * 100).toFixed(2)}%</span>
              </p>
            )}
          </div>

          {/* Add position */}
          {spot && (
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              border: '1px solid var(--border)',
            }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Add position
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Type</label>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {['call', 'put'].map(t => (
                      <button key={t} onClick={() => setForm(f => ({ ...f, option_type: t }))} style={{
                        flex: 1, padding: '0.4rem', borderRadius: '6px', border: '1px solid',
                        borderColor: form.option_type === t ? 'var(--accent)' : 'var(--border)',
                        background: form.option_type === t ? 'var(--accent)20' : 'transparent',
                        color: form.option_type === t ? 'var(--accent)' : 'var(--text-secondary)',
                        cursor: 'pointer', fontSize: '0.8rem', textTransform: 'capitalize',
                      }}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Strike <span style={{ color: 'var(--text-secondary)' }}>(spot: ${spot?.toFixed(0)})</span>
                  </label>
                  <input type="number" value={form.strike}
                    onChange={e => setForm(f => ({ ...f, strike: e.target.value }))}
                    placeholder={spot?.toFixed(0)}
                    style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>DTE (days)</label>
                  <input type="number" value={form.dte}
                    onChange={e => setForm(f => ({ ...f, dte: e.target.value }))}
                    style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Contracts</label>
                  <input type="number" value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
                  />
                </div>
              </div>
              <button onClick={addPosition} style={{
                width: '100%', padding: '0.5rem', borderRadius: '6px',
                border: '1px solid var(--accent)', background: 'var(--accent)20',
                color: 'var(--accent)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
              }}>
                + Add Position
              </button>
            </div>
          )}

          {/* Portfolio list */}
          {positions.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Portfolio ({positions.length} positions)
              </p>
              {positions.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.5rem 0.75rem', background: 'var(--bg-secondary)',
                  borderRadius: '6px', marginBottom: '0.35rem', border: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--accent)', marginRight: '0.35rem', fontSize: '0.75rem' }}>{p.ticker}</span>
                    <span style={{ color: p.option_type === 'call' ? 'var(--green)' : 'var(--red)', marginRight: '0.5rem', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                      {p.option_type}
                    </span>
                    ${p.strike} · {p.dte}d · ×{p.quantity}
                  </span>
                  <button onClick={() => removePosition(i)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem' }}>×</button>
                </div>
              ))}
              <button onClick={() => { setPositions([]); setResult(null); setVarData(null) }} style={{
                background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline', marginTop: '0.25rem',
              }}>
                Clear all
              </button>
            </div>
          )}

          {/* Sliders */}
          {positions.length > 0 && (
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              padding: '1rem',
              border: '1px solid var(--border)',
              marginBottom: '1rem',
            }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                Stress Scenario
              </p>

              {/* Spot shock slider */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Spot Shock</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: spotColor }}>
                    {spotShock === 0 ? 'No shock' : `${spotShock > 0 ? '+' : ''}${spotShock}%`}
                  </span>
                </div>
                <input type="range" min={-30} max={30} step={1} value={spotShock}
                  onChange={e => { setSpotShock(Number(e.target.value)); setResult(null); setVarData(null) }}
                  style={{ width: '100%', accentColor: spotShock < 0 ? '#ef4444' : spotShock > 0 ? '#10b981' : '#6366f1', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  <span>-30% Crash</span>
                  <span>0%</span>
                  <span>+30% Rally</span>
                </div>
              </div>

              {/* Vol shock slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Volatility Shock</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: volColor }}>
                    {volShock === 0 ? 'No shock' : `${volShock > 0 ? '+' : ''}${volShock}pp`}
                  </span>
                </div>
                <input type="range" min={-10} max={25} step={1} value={volShock}
                  onChange={e => { setVolShock(Number(e.target.value)); setResult(null); setVarData(null) }}
                  style={{ width: '100%', accentColor: volShock > 0 ? '#ef4444' : volShock < 0 ? '#10b981' : '#6366f1', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  <span>-10pp Vol crush</span>
                  <span>0pp</span>
                  <span>+25pp Vol spike</span>
                </div>
              </div>
            </div>
          )}

          {positions.length > 0 && (
            <button onClick={runScenario} disabled={loading} style={{
              width: '100%', padding: '0.6rem', borderRadius: '8px', border: 'none',
              background: 'var(--accent)', color: 'white', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem', fontWeight: 600, opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Running...' : 'Run Stress Test'}
            </button>
          )}

          {error && <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: '0.75rem' }}>{error}</p>}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div>
          {!result && (
            <div style={{
              height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', fontSize: '0.875rem',
              border: '1px dashed var(--border)', borderRadius: '8px', minHeight: '400px',
              flexDirection: 'column', gap: '0.5rem',
            }}>
              <span style={{ fontSize: '1.5rem' }}>📊</span>
              <span>Load a ticker, build a portfolio, set shocks and run</span>
            </div>
          )}

          {result && (
            <>
              {/* Summary */}
              <div style={{
                background: 'var(--bg-secondary)', borderRadius: '8px', padding: '0.875rem 1rem',
                marginBottom: '1rem',
                borderLeft: `3px solid ${result.total_pnl >= 0 ? 'var(--green)' : 'var(--red)'}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    Multi-ticker portfolio · Spot shock: <span style={{ color: spotColor, fontWeight: 600 }}>{spotShock > 0 ? '+' : ''}{spotShock}%</span>
                    {'  ·  Vol shock: '}
                    <span style={{ color: volColor, fontWeight: 600 }}>{volShock > 0 ? '+' : ''}{volShock}pp</span>
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Spot: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>${result.spot_base?.toFixed(2)}</span>
                    {' → '}
                    <span style={{ fontWeight: 600, color: result.spot_shocked < result.spot_base ? 'var(--red)' : 'var(--green)' }}>
                      ${result.spot_shocked?.toFixed(2)}
                    </span>
                    {'  ·  Vol: '}
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{(result.vol_base * 100).toFixed(0)}%</span>
                    {' → '}
                    <span style={{ fontWeight: 600, color: result.vol_shocked > result.vol_base ? 'var(--red)' : 'var(--green)' }}>
                      {(result.vol_shocked * 100).toFixed(0)}%
                    </span>
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total P&L</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: result.total_pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {result.total_pnl >= 0 ? '+' : ''}${result.total_pnl?.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Chart */}
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} stroke="#1e2d45" />
                  <YAxis tickFormatter={v => `$${v.toFixed(0)}`} tick={{ fontSize: 10, fill: '#64748b' }} stroke="#1e2d45" />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.75rem' }}
                    formatter={(val) => [`$${val.toFixed(2)}`, 'P&L']}
                  />
                  <ReferenceLine y={0} stroke="#1e2d45" />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.pnl >= 0 ? '#10b98160' : '#ef444460'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Position breakdown */}
              <div style={{ marginTop: '1rem' }}>
                {result.positions.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.8rem',
                  }}>
                    <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 600, marginRight: '0.35rem' }}>{p.ticker}</span>
                      {p.option_type} ${p.strike} ×{p.quantity}
                      <span style={{ fontSize: '0.7rem', marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>
                        δ {p.delta?.toFixed(3)} · ν {p.vega?.toFixed(3)}
                      </span>
                    </span>
                    <span style={{ fontWeight: 600, color: p.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {p.pnl >= 0 ? '+' : ''}${p.pnl?.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* VaR */}
              {varData && (
                <div style={{ marginTop: '1.25rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    Monte Carlo VaR — 1 Day · {varData.n_paths?.toLocaleString()} simulations
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    {[
                      { label: 'VaR 95%', value: `$${varData.var_95?.toFixed(2)}`, color: 'var(--amber)' },
                      { label: 'VaR 99%', value: `$${varData.var_99?.toFixed(2)}`, color: 'var(--red)'   },
                      { label: 'ES 95%',  value: `$${varData.es_95?.toFixed(2)}`,  color: 'var(--red)'   },
                    ].map(stat => (
                      <div key={stat.label} style={{
                        background: 'var(--bg-secondary)', borderRadius: '6px',
                        padding: '0.6rem 0.75rem', border: '1px solid var(--border)',
                      }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                          {stat.label}
                        </p>
                        <p style={{ fontSize: '1rem', fontWeight: 700, color: stat.color }}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}