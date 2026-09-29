import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const api = axios.create({ baseURL: BASE_URL })

export const getVolSurface = (ticker = 'SPY') => api.get(`/api/surface/?ticker=${ticker}`)

export const getGreeks = (optionType = 'call', ticker = 'SPY') =>
  api.get(`/api/greeks/chain?option_type=${optionType}&ticker=${ticker}`)

export const getSpotVar = (days = 1) => api.get(`/api/var/spot?horizon_days=${days}`)
export const getOptionsVar = (days = 1) => api.get(`/api/var/options?horizon_days=${days}`)
export const getScenarios = () => api.get('/api/scenarios/')
export const runScenario = (name) => api.get(`/api/scenarios/${name}`)
export const runCustomScenario = (payload) => api.post('/api/scenarios/run', payload)
export const getSpot = () => api.get('/api/var/spot')
export const getTickerSpot = (ticker) => api.get(`/api/var/spot/${ticker}`)
export const getStatus = (ticker = 'SPY') => api.get(`/?ticker=${ticker}`)
export const getPortfolioVar = (portfolio, horizon_days = 1) =>
  api.post('/api/var/portfolio', { portfolio, horizon_days })