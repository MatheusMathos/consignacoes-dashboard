import { useMemo, useState } from 'react'
import { getNoReturnLast3Months, fmtBRL, fmtInt, MONTHS_PT } from '../utils/dataProcessing.js'

const STATUS_COLORS = {
  'SEM RETORNO': { bg: '#FEF0EE', color: '#D14B3A' },
  'NF SEM RETORNO': { bg: '#FEF0EE', color: '#D14B3A' },
  'SEM REMESSA': { bg: '#FFF8ED', color: '#B36B1A' },
  'NF MES ANTERIOR': { bg: '#F0EBE3', color: '#7A6A5A' },
  'ERRO OPERACIONAL': { bg: '#FEF0EE', color: '#D14B3A' },
}

function badge(text) {
  if (!text || text === '—') return <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>Sem anotação</span>
  const upper = String(text).trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const style = STATUS_COLORS[upper] || { bg: '#F0EBE3', color: 'var(--text-2)' }
  return (
    <span style={{
      fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.5rem',
      borderRadius: 4, background: style.bg, color: style.color,
    }}>{text}</span>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 style={{
      fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px',
      textTransform: 'uppercase', color: 'var(--text-2)',
      marginBottom: '0.9rem', marginTop: '1.75rem', paddingBottom: '0.6rem',
      borderBottom: '1px solid var(--border)',
    }}>{children}</h2>
  )
}

export default function NoReturnPanel({ data }) {
  const { rows, cutoff, maxDate } = useMemo(() => getNoReturnLast3Months(data), [data])
  const [lojaFilter, setLojaFilter] = useState('Todas')
  const [search, setSearch] = useState('')

  // Monta label do período considerado
  const periodoLabel = useMemo(() => {
    if (!cutoff || !maxDate) return ''
    const meses = []
    for (let m = cutoff.getMonth() + 1; m <= maxDate.getMonth() + 1; m++) {
      meses.push(`${MONTHS_PT[m]}/${maxDate.getFullYear()}`)
    }
    return meses.join(', ')
  }, [cutoff, maxDate])

  const lojas = useMemo(() => {
    const all = [...new Set(rows.map(r => r.loja).filter(Boolean))].sort()
    return ['Todas', ...all]
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (lojaFilter !== 'Todas' && r.loja !== lojaFilter) return false
      if (search) {
        const s = search.toLowerCase()
        return (
          String(r.nf).includes(s) ||
          (r.cliente || '').toLowerCase().includes(s) ||
          (r.consultora || '').toLowerCase().includes(s)
        )
      }
      return true
    })
  }, [rows, lojaFilter, search])

  const totalValor = filtered.reduce((s, r) => s + r.valor, 0)

  // Resumo por loja
  const byLoja = useMemo(() => {
    const m = {}
    for (const r of rows) {
      const l = r.loja || 'Sem loja'
      if (!m[l]) m[l] = { loja: l, count: 0, valor: 0 }
      m[l].count++
      m[l].valor += r.valor
    }
    return Object.values(m).sort((a, b) => b.valor - a.valor)
  }, [rows])

  return (
    <div className="fade-in">
      {/* Alerta de topo */}
      <div style={{
        background: '#FEF0EE', border: '1px solid #F5C6BF',
        borderLeft: '4px solid var(--danger)', borderRadius: 'var(--radius)',
        padding: '1rem 1.5rem', marginBottom: '1.5rem',
        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D14B3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
            {fmtInt(rows.length)} notas com SEM RETORNO
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#7A3028', marginBottom: '0.2rem' }}>
            Total em aberto: <strong>{fmtBRL(rows.reduce((s, r) => s + r.valor, 0))}</strong>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9A4038' }}>
            Período considerado: <strong>{periodoLabel}</strong> (3 meses mais recentes do arquivo).
            Considera apenas anotações <strong>SEM RETORNO</strong> e <strong>NF SEM RETORNO</strong> —
            notas com NF Mês Posterior e erros ficam em suas abas específicas.
          </div>
        </div>
      </div>

      {/* Cards por loja */}
      <SectionTitle>Por Loja</SectionTitle>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '0.75rem', marginBottom: '1.75rem',
      }}>
        {byLoja.map(({ loja, count, valor }) => (
          <div
            key={loja}
            onClick={() => setLojaFilter(l => l === loja ? 'Todas' : loja)}
            style={{
              background: lojaFilter === loja ? '#FEF0EE' : 'var(--surface)',
              border: `1px solid ${lojaFilter === loja ? 'var(--danger)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)', padding: '0.9rem 1rem',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.35rem', lineHeight: 1.3 }}>
              {loja}
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
              {fmtBRL(valor)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.15rem' }}>
              {count} {count === 1 ? 'nota' : 'notas'}
            </div>
          </div>
        ))}
      </div>

      {/* Filtros e tabela */}
      <SectionTitle>Detalhamento</SectionTitle>
      <div style={{
        display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem',
        alignItems: 'center',
      }}>
        <select
          value={lojaFilter}
          onChange={e => setLojaFilter(e.target.value)}
          style={{
            padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--border)', background: 'var(--surface)',
            fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text)',
          }}
        >
          {lojas.map(l => <option key={l}>{l}</option>)}
        </select>
        <input
          placeholder="Buscar NF, cliente, consultora..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--border)', background: 'var(--surface)',
            fontSize: '0.8125rem', color: 'var(--text)', flex: 1, minWidth: 200,
          }}
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
          {fmtInt(filtered.length)} notas · {fmtBRL(totalValor)}
        </span>
      </div>

      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
        overflow: 'auto', maxHeight: 520,
      }}>
        <table>
          <thead>
            <tr>
              <th>NF</th>
              <th>Loja</th>
              <th>Data Emissão</th>
              <th>Dias Pendente</th>
              <th>Cliente</th>
              <th>Consultora</th>
              <th className="right">Valor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem' }}>
                  Nenhuma nota encontrada
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700 }}>{r.nf}</td>
                  <td className="muted">{r.loja}</td>
                  <td className="muted">{r.dataEmissao || '—'}</td>
                  <td>
                    {r.diasPendente != null && (
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 700,
                        color: r.diasPendente > 60 ? 'var(--danger)' : r.diasPendente > 30 ? 'var(--warning)' : 'var(--text-2)',
                      }}>
                        {r.diasPendente}d
                      </span>
                    )}
                  </td>
                  <td>{r.cliente || '—'}</td>
                  <td className="muted">{r.consultora || '—'}</td>
                  <td className="right" style={{ color: 'var(--danger)', fontWeight: 700 }}>
                    {fmtBRL(r.valor)}
                  </td>
                  <td>{badge(r.anotacao)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
