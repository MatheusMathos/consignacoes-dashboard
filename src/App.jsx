import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { processData } from './utils/dataProcessing.js'
import KPICards from './components/KPICards.jsx'
import MonthAnalysis from './components/MonthAnalysis.jsx'
import NoReturnPanel from './components/NoReturnPanel.jsx'
import ErrorsPanel from './components/ErrorsPanel.jsx'
import StoreRanking from './components/StoreRanking.jsx'
import ClientsPanel from './components/ClientsPanel.jsx'

// Nome do arquivo na pasta public/
const XLSX_FILE = '/Consignacoes_Acumulado.xlsx'

// ─── Ícones simples (SVG inline) ─────────────────────────────────────────────
const icons = {
  chart:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  calendar: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  alert:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  clock:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  store:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  user:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  refresh:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
}

const TABS = [
  { id: 'resumo',    label: 'Resumo Geral',   icon: icons.chart },
  { id: 'mes',       label: 'Análise por Mês', icon: icons.calendar },
  { id: 'pendentes', label: 'Sem Devolução',   icon: icons.clock },
  { id: 'erros',     label: 'Erros',           icon: icons.alert },
  { id: 'lojas',     label: 'Ranking Lojas',   icon: icons.store },
  { id: 'clientes',  label: 'Clientes',        icon: icons.user },
]

// ─── Carrega o xlsx da pasta public/ ─────────────────────────────────────────
async function loadXlsx() {
  const res = await fetch(XLSX_FILE)
  if (!res.ok) throw new Error(`Não foi possível carregar ${XLSX_FILE} (${res.status})`)
  const buffer = await res.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(ws, { raw: true, cellDates: true })
  return processData(raw)
}

// ─── Tela de carregamento / erro ──────────────────────────────────────────────
function LoadingScreen({ error, onRetry }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: '2rem',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1.25rem' }}>👠</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: '0.4rem' }}>
          Consignações
        </h1>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '2rem' }}>
          Acompanhamento · Análise · Controle
        </p>

        {error ? (
          <div style={{
            background: '#FEF0EE', border: '1px solid #F5C6BF',
            borderLeft: '4px solid var(--danger)', borderRadius: 'var(--radius)',
            padding: '1.25rem 1.5rem', textAlign: 'left',
          }}>
            <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              Erro ao carregar os dados
            </div>
            <div style={{ fontSize: '0.8rem', color: '#7A3028', marginBottom: '1rem' }}>
              {error}
            </div>
            <button
              onClick={onRetry}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)',
                background: 'var(--danger)', color: '#fff',
                fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer',
                border: 'none',
              }}
            >
              {icons.refresh} Tentar novamente
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              border: '3px solid var(--border)',
              borderTopColor: 'var(--accent)',
            }} className="spin" />
            <span style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
              Carregando dados…
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── App Principal ────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [activeTab, setActiveTab] = useState('resumo')

  const load = () => {
    setLoading(true)
    setError(null)
    loadXlsx()
      .then(rows => { setData(rows); setLoading(false) })
      .catch(e   => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  if (loading || error || !data) {
    return <LoadingScreen error={error} onRetry={load} />
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 2rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 60, position: 'sticky',
        top: 0, zIndex: 100, boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>👠</span>
          <div>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', letterSpacing: '-0.3px' }}>
              Consignações
            </span>
            <span style={{
              marginLeft: '0.75rem', fontSize: '0.6875rem', fontWeight: 600,
              letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-3)',
            }}>
              {data.length.toLocaleString('pt-BR')} registros
            </span>
          </div>
        </div>
        <button
          onClick={load}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)',
            padding: '0.35rem 0.85rem', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)',
            cursor: 'pointer', letterSpacing: '0.5px',
          }}
        >
          {icons.refresh} Atualizar
        </button>
      </header>

      {/* Tabs */}
      <nav style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 2rem', display: 'flex', gap: 0, overflowX: 'auto',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.7rem 1.1rem',
              fontSize: '0.75rem', fontWeight: 600,
              letterSpacing: '0.5px', textTransform: 'uppercase',
              color: activeTab === tab.id ? 'var(--text)' : 'var(--text-2)',
              borderBottom: activeTab === tab.id
                ? '2px solid var(--accent)'
                : '2px solid transparent',
              transition: 'color 0.15s',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={{ flex: 1, padding: '2rem', maxWidth: 1400, width: '100%', margin: '0 auto' }}>
        {activeTab === 'resumo'    && <KPICards      data={data} />}
        {activeTab === 'mes'       && <MonthAnalysis  data={data} />}
        {activeTab === 'pendentes' && <NoReturnPanel  data={data} />}
        {activeTab === 'erros'     && <ErrorsPanel    data={data} />}
        {activeTab === 'lojas'     && <StoreRanking   data={data} />}
        {activeTab === 'clientes'  && <ClientsPanel   data={data} />}
      </main>
    </div>
  )
}
