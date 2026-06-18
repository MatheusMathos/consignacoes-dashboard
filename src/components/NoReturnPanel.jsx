import { useMemo, useState } from 'react'
import { getAllNoReturn, fmtBRL, fmtInt, MONTHS_PT } from '../utils/dataProcessing.js'

const STATUS_COLORS = {
  'SEM RETORNO':    { bg: '#FEF0EE', color: '#D14B3A' },
  'NF SEM RETORNO': { bg: '#FEF0EE', color: '#D14B3A' },
}

function badge(text) {
  if (!text || text === '—') return <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>—</span>
  const upper = String(text).trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const style = STATUS_COLORS[upper] || { bg: '#F0EBE3', color: 'var(--text-2)' }
  return (
    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4, background: style.bg, color: style.color }}>
      {text}
    </span>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '0.9rem', marginTop: '1.75rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border)' }}>
      {children}
    </h2>
  )
}

// Converte Date → string "YYYY-MM" para input[type=month]
function toMonthValue(date) {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

// Converte "YYYY-MM" → Date (primeiro dia do mês)
function fromMonthValue(str) {
  if (!str) return null
  const [y, m] = str.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

export default function NoReturnPanel({ data }) {
  const { allRows, minDate, maxDate } = useMemo(() => getAllNoReturn(data), [data])

  // Padrão: últimos 3 meses do arquivo
  const defaultFrom = useMemo(() => {
    if (!maxDate) return ''
    return toMonthValue(new Date(maxDate.getFullYear(), maxDate.getMonth() - 2, 1))
  }, [maxDate])

  const defaultTo = useMemo(() => toMonthValue(maxDate), [maxDate])

  const [fromMonth, setFromMonth] = useState('')
  const [toMonth, setToMonth]     = useState('')
  const [lojaFilter, setLojaFilter] = useState('Todas')
  const [search, setSearch]         = useState('')

  // Usa default se o usuário não escolheu
  const effectiveFrom = fromMonth || defaultFrom
  const effectiveTo   = toMonth   || defaultTo

  const fromDate = fromMonthValue(effectiveFrom)
  const toDate   = effectiveTo
    ? new Date(Number(effectiveTo.split('-')[0]), Number(effectiveTo.split('-')[1]), 0) // último dia do mês
    : null

  // Filtra por período
  const rows = useMemo(() => {
    return allRows.filter(r => {
      if (!r.dataEmissao) return false
      if (fromDate && r.dataEmissao < fromDate) return false
      if (toDate   && r.dataEmissao > toDate)   return false
      return true
    }).sort((a, b) => (b.diasPendente ?? 0) - (a.diasPendente ?? 0))
  }, [allRows, fromDate, toDate])

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

  // Label do período ativo
  const periodoLabel = useMemo(() => {
    if (!effectiveFrom || !effectiveTo) return ''
    const [fy, fm] = effectiveFrom.split('-').map(Number)
    const [ty, tm] = effectiveTo.split('-').map(Number)
    return `${MONTHS_PT[fm]}/${fy} — ${MONTHS_PT[tm]}/${ty}`
  }, [effectiveFrom, effectiveTo])

  const isDefault = !fromMonth && !toMonth

  return (
    <div className="fade-in">
      {/* Filtros de período no topo */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '1rem 1.25rem',
        marginBottom: '1.25rem', boxShadow: 'var(--shadow)',
        display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-2)' }}>
          Período
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>De</label>
          <input
            type="month"
            value={fromMonth || defaultFrom}
            min={toMonthValue(minDate)}
            max={toMonthValue(maxDate)}
            onChange={e => setFromMonth(e.target.value)}
            style={{ padding: '0.4rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: '0.8125rem', color: 'var(--text)' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>Até</label>
          <input
            type="month"
            value={toMonth || defaultTo}
            min={toMonthValue(minDate)}
            max={toMonthValue(maxDate)}
            onChange={e => setToMonth(e.target.value)}
            style={{ padding: '0.4rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: '0.8125rem', color: 'var(--text)' }}
          />
        </div>
        {!isDefault && (
          <button
            onClick={() => { setFromMonth(''); setToMonth('') }}
            style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-dark)', padding: '0.38rem 0.85rem', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', cursor: 'pointer' }}
          >
            Restaurar padrão (3 meses)
          </button>
        )}
        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginLeft: 'auto' }}>
          {isDefault ? '3 meses mais recentes do arquivo' : periodoLabel}
        </span>
      </div>

      {/* Alerta de resumo */}
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
            {fmtInt(rows.length)} notas com SEM RETORNO — {periodoLabel}
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#7A3028' }}>
            Total em aberto: <strong>{fmtBRL(rows.reduce((s, r) => s + r.valor, 0))}</strong>
          </div>
        </div>
      </div>

      {/* Cards por loja */}
      <SectionTitle>Por Loja</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.75rem' }}>
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
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.35rem', lineHeight: 1.3 }}>{loja}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(valor)}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.15rem' }}>{count} {count === 1 ? 'nota' : 'notas'}</div>
          </div>
        ))}
      </div>

      {/* Filtros e tabela */}
      <SectionTitle>Detalhamento</SectionTitle>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem', alignItems: 'center' }}>
        <select
          value={lojaFilter}
          onChange={e => setLojaFilter(e.target.value)}
          style={{ padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: 'var(--surface)', fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text)' }}
        >
          {lojas.map(l => <option key={l}>{l}</option>)}
        </select>
        <input
          placeholder="Buscar NF, cliente, consultora..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: '0.8125rem', color: 'var(--text)', flex: 1, minWidth: 200 }}
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
          {fmtInt(filtered.length)} notas · {fmtBRL(totalValor)}
        </span>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', overflow: 'auto', maxHeight: 520 }}>
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
                  <td className="muted">{r.dataEmissaoStr || '—'}</td>
                  <td>
                    {r.diasPendente != null && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: r.diasPendente > 60 ? 'var(--danger)' : r.diasPendente > 30 ? 'var(--warning)' : 'var(--text-2)' }}>
                        {r.diasPendente}d
                      </span>
                    )}
                  </td>
                  <td>{r.cliente || '—'}</td>
                  <td className="muted">{r.consultora || '—'}</td>
                  <td className="right" style={{ color: 'var(--danger)', fontWeight: 700 }}>{fmtBRL(r.valor)}</td>
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
