import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  computeKPIs, computeMonthSummaryTable, fmtBRL, fmtInt, MONTHS_PT,
} from '../utils/dataProcessing.js'

function Card({ label, value, sub, color = 'var(--accent)', small = false }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderTop: `3px solid ${color}`, borderRadius: 'var(--radius)',
      padding: '1.25rem 1rem', flex: 1, minWidth: 0,
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '0.5rem', lineHeight: 1.4 }}>{label}</div>
      <div style={{ fontSize: small ? '1.1rem' : 'clamp(1rem, 2.5vw, 1.5rem)', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.3rem' }}>{sub}</div>}
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', boxShadow: 'var(--shadow-lg)', fontSize: '0.8rem' }}>
      <div style={{ fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text)' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.fill, marginBottom: '0.15rem' }}>
          {p.name}: <strong>{fmtBRL(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

// Cabeçalho de coluna clicável para ordenação
function SortTh({ col, label, sortCol, sortDir, onSort, className }) {
  const active = sortCol === col
  return (
    <th className={className}
      onClick={() => onSort(col)}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
    >
      {label}{' '}
      <span style={{ opacity: active ? 1 : 0.3, fontSize: '0.65rem' }}>
        {active ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}
      </span>
    </th>
  )
}

export default function KPICards({ data }) {
  const kpis    = useMemo(() => computeKPIs(data), [data])
  const summary = useMemo(() => computeMonthSummaryTable(data), [data])

  const [sortCol, setSortCol] = useState('key')   // default: ordem cronológica
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const sortedSummary = useMemo(() => {
    return [...summary].sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol]
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      return sortDir === 'asc' ? va - vb : vb - va
    })
  }, [summary, sortCol, sortDir])

  const chartData = summary.map(s => ({
    name: `${MONTHS_PT[s.month].slice(0, 3)} ${String(s.year).slice(2)}`,
    Saídas: s.valorSaidas,
    Retornos: s.valorEntradas,
    Pendente: s.valorPendentes,
  }))

  return (
    <div className="fade-in">
      <SectionTitle>Visão Geral</SectionTitle>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
        <Card label="Total de Registros" value={fmtInt(kpis.total)} />
        <Card label="Saídas"      value={fmtBRL(kpis.valorSaidas)}  sub={`${fmtInt(kpis.saidaCount)} notas`} />
        <Card label="Retornos"    value={fmtBRL(kpis.valorEntradas)} sub={`${fmtInt(kpis.entradaCount)} notas`} />
        <Card label="Saldo Geral" value={fmtBRL(kpis.saldo)}
          color={kpis.saldo > 0 ? 'var(--warning)' : 'var(--success)'}
          sub={kpis.saldo > 0 ? 'a receber' : 'equilibrado'} />
        <Card label="SEM RETORNO" value={fmtBRL(kpis.semRetornoValor)}
          color="var(--danger)" sub={`${fmtInt(kpis.semRetornoCount)} notas verdadeiramente pendentes`} />
        <Card label="Com Erro"    value={fmtBRL(kpis.comErroValor)}
          color="var(--warning)" sub={`${fmtInt(kpis.comErroCount)} notas com problema`} />
      </div>

      <SectionTitle>Saídas vs Retornos por Mês</SectionTitle>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '1.5rem', boxShadow: 'var(--shadow)', marginBottom: '1.75rem' }}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barGap={4} barSize={22}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-2)' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `R$ ${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--text-2)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Saídas"   fill="#C9B99A" radius={[4,4,0,0]} name="Saídas" />
            <Bar dataKey="Retornos" fill="#3A8C5C" radius={[4,4,0,0]} name="Retornos" />
            <Bar dataKey="Pendente" fill="#D14B3A" radius={[4,4,0,0]} name="Pendente" />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', justifyContent: 'center' }}>
          {[['#C9B99A','Saídas'],['#3A8C5C','Retornos'],['#D14B3A','Pendente']].map(([c,l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-2)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
              {l}
            </div>
          ))}
        </div>
      </div>

      <SectionTitle>Resumo por Mês</SectionTitle>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <SortTh col="key"           label="Mês"            sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <SortTh col="valorSaidas"   label="Saídas (R$)"    sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="right" />
              <SortTh col="valorEntradas" label="Retornos (R$)"  sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="right" />
              <SortTh col="valorRetMesAnterior" label="NF Mês Ant." sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="right" />
              <SortTh col="pendenteCount" label="Pendentes"      sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="right" />
              <SortTh col="valorPendentes" label="Valor Pendente" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="right" />
              <SortTh col="saldoReal"     label="Saldo"          sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="right" />
            </tr>
          </thead>
          <tbody>
            {sortedSummary.map(s => (
              <tr key={s.key}>
                <td style={{ fontWeight: 600 }}>{s.label}</td>
                <td className="right">{fmtBRL(s.valorSaidas)}</td>
                <td className="right">{fmtBRL(s.valorEntradas)}</td>
                <td className="right muted">{fmtBRL(s.valorRetMesAnterior)}</td>
                <td className="right">
                  <span style={{ background: s.pendenteCount > 0 ? '#FEF0EE' : '#F0FAF4', color: s.pendenteCount > 0 ? 'var(--danger)' : 'var(--success)', borderRadius: 6, padding: '0.15rem 0.6rem', fontWeight: 600, fontSize: '0.75rem' }}>
                    {s.pendenteCount}
                  </span>
                </td>
                <td className="right" style={{ color: s.valorPendentes > 0 ? 'var(--danger)' : 'inherit', fontWeight: 600 }}>
                  {fmtBRL(s.valorPendentes)}
                </td>
                <td className="right" style={{ color: s.saldoReal > 0 ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>
                  {fmtBRL(s.saldoReal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '0.9rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border)' }}>
      {children}
    </h2>
  )
}
