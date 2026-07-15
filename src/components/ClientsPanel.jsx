import { Fragment, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { getClientRanking, fmtBRL, fmtInt, fmtDate } from '../utils/dataProcessing.js'
import { SortableTh, useSortableTable, sortRows } from '../utils/sortableTable.jsx'
import { exportTableToExcel } from '../utils/exportExcel.js'
import { useIsMobile } from '../utils/useMediaQuery.js'
import ExportButton from './ExportButton.jsx'

const CLIENT_COLUMNS = {
  cliente:       c => c.cliente,
  lojas:         c => c.lojas.join(', '),
  consultoras:   c => c.consultoras.join(', '),
  qtd:           c => c.qtd,
  valor:         c => c.valor,
  notaMaisAntiga: c => c.notaMaisAntiga ? c.notaMaisAntiga.getTime() : 0,
  dias:          c => c.diasMaximo ?? 0,
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

function DaysBadge({ dias }) {
  if (dias == null) return <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>—</span>
  const color = dias > 90 ? '#D14B3A' : dias > 60 ? '#B36B1A' : dias > 30 ? '#7A6A5A' : '#3A8C5C'
  const bg = dias > 90 ? '#FEF0EE' : dias > 60 ? '#FFF8ED' : dias > 30 ? '#F7F4F0' : '#F0FAF4'
  return (
    <span style={{
      fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.55rem',
      borderRadius: 4, background: bg, color,
    }}>
      {dias}d
    </span>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '0.7rem 1rem',
      boxShadow: 'var(--shadow-lg)', fontSize: '0.8rem', maxWidth: 240,
    }}>
      <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text)', wordBreak: 'break-word' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.fill }}>{fmtBRL(p.value)}</div>
      ))}
    </div>
  )
}

// Helpers de data para filtro de mês
function toMonthVal(date) {
  if (!date) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
function fromMonthVal(str) {
  if (!str) return null
  const [y, m] = str.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

export default function ClientsPanel({ data }) {
  const allRanking = useMemo(() => getClientRanking(data), [data])
  const isMobile = useIsMobile()

  // Datas mín/máx das notas
  const { minDate, maxDate } = useMemo(() => {
    let min = null, max = null
    for (const c of allRanking) {
      for (const n of c.notas) {
        if (n.dataEmissao) {
          if (!min || n.dataEmissao < min) min = n.dataEmissao
          if (!max || n.dataEmissao > max) max = n.dataEmissao
        }
      }
    }
    return { minDate: min, maxDate: max }
  }, [allRanking])

  const [fromMonth, setFromMonth] = useState('')
  const [toMonth, setToMonth]     = useState('')
  const { sortCol, sortDir, onSort } = useSortableTable('valor', 'desc')
  const [search, setSearch]       = useState('')
  const [expanded, setExpanded]   = useState(null)

  const effectiveFrom = fromMonth || ''
  const effectiveTo   = toMonth   || ''

  // Filtra clientes cujas notas estejam no período selecionado
  const ranking = useMemo(() => {
    if (!effectiveFrom && !effectiveTo) return allRanking
    const fromDate = fromMonthVal(effectiveFrom)
    const toDate   = effectiveTo
      ? new Date(Number(effectiveTo.split('-')[0]), Number(effectiveTo.split('-')[1]), 0)
      : null

    return allRanking.map(c => {
      const notasFiltradas = c.notas.filter(n => {
        if (!n.dataEmissao) return false
        if (fromDate && n.dataEmissao < fromDate) return false
        if (toDate   && n.dataEmissao > toDate)   return false
        return true
      })
      if (!notasFiltradas.length) return null
      const valor = notasFiltradas.reduce((s, n) => s + n.valor, 0)
      const notaMaisAntiga = notasFiltradas.reduce((m, n) => (!m || (n.dataEmissao && n.dataEmissao < m) ? n.dataEmissao : m), null)
      const diasMaximo = notaMaisAntiga ? Math.floor((new Date() - notaMaisAntiga) / 86400000) : null
      return { ...c, notas: notasFiltradas, qtd: notasFiltradas.length, valor, notaMaisAntiga, diasMaximo }
    }).filter(Boolean)
  }, [allRanking, effectiveFrom, effectiveTo])

  const sorted = useMemo(() => {
    let list = ranking
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(c =>
        c.cliente.toLowerCase().includes(s) ||
        c.lojas.some(l => l.toLowerCase().includes(s)) ||
        c.consultoras.some(co => co.toLowerCase().includes(s))
      )
    }
    return sortRows(list, sortCol, sortDir, CLIENT_COLUMNS)
  }, [ranking, sortCol, sortDir, search])

  const totalValor = ranking.reduce((s, c) => s + c.valor, 0)
  const totalNotas = ranking.reduce((s, c) => s + c.qtd, 0)
  const maxDias    = ranking.reduce((m, c) => Math.max(m, c.diasMaximo ?? 0), 0)

  const nameMax = isMobile ? 12 : 20
  const chartData = [...ranking]
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8)
    .map(c => ({
      name: c.cliente.length > nameMax ? c.cliente.slice(0, nameMax - 2) + '…' : c.cliente,
      fullName: c.cliente,
      Valor: c.valor,
    }))

  if (allRanking.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--success)', fontWeight: 600 }}>
        ✅ Nenhuma cliente com notas SEM RETORNO.
      </div>
    )
  }

  return (
    <div className="fade-in">

      {/* Filtro de período */}
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
            value={fromMonth}
            min={toMonthVal(minDate)}
            max={toMonthVal(maxDate)}
            onChange={e => setFromMonth(e.target.value)}
            style={{ padding: '0.4rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: '0.8125rem', color: 'var(--text)' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>Até</label>
          <input
            type="month"
            value={toMonth}
            min={toMonthVal(minDate)}
            max={toMonthVal(maxDate)}
            onChange={e => setToMonth(e.target.value)}
            style={{ padding: '0.4rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: '0.8125rem', color: 'var(--text)' }}
          />
        </div>
        {(fromMonth || toMonth) && (
          <button
            onClick={() => { setFromMonth(''); setToMonth('') }}
            style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-dark)', padding: '0.38rem 0.85rem', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', cursor: 'pointer' }}
          >
            Limpar filtro
          </button>
        )}
        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginLeft: 'auto' }}>
          {!fromMonth && !toMonth ? 'Todos os períodos' : `${ranking.length} clientes no período`}
        </span>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
        <KPICard label="Clientes com Pendências" value={fmtInt(ranking.length)} color="var(--accent)" />
        <KPICard label="Total Pendente" value={fmtBRL(totalValor)} color="var(--danger)" />
        <KPICard label="Notas SEM RETORNO" value={fmtInt(totalNotas)} color="var(--warning)" />
        <KPICard label="Maior Tempo" value={`${maxDias}d`} color="#7A6A5A"
          sub="cliente com nota mais antiga" />
      </div>

      {/* Gráfico top 8 por valor */}
      <SectionTitle>Top 8 Clientes por Valor Pendente</SectionTitle>
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)', padding: '1.5rem',
        boxShadow: 'var(--shadow)', marginBottom: '1.75rem',
      }}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
            <XAxis type="number" tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: 'var(--text-2)' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={isMobile ? 80 : 160}
              tick={{ fontSize: 11, fill: 'var(--text-2)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Valor" fill="#D14B3A" radius={[0, 4, 4, 0]} barSize={18} name="Valor" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filtros + ordenação */}
      <SectionTitle>Lista Completa</SectionTitle>
      <div style={{
        display: 'flex', gap: '0.75rem', flexWrap: 'wrap',
        marginBottom: '0.85rem', alignItems: 'center',
      }}>
        <input
          placeholder="Buscar cliente, loja, consultora..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--border)', background: 'var(--surface)',
            fontSize: '0.8125rem', color: 'var(--text)', flex: 1, minWidth: 220,
          }}
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
          {sorted.length} clientes
        </span>
        <ExportButton
          onClick={() => exportTableToExcel(
            sorted,
            [
              { header: 'Cliente', accessor: c => c.cliente },
              { header: 'Loja(s)', accessor: c => c.lojas.join(', ') },
              { header: 'Consultora', accessor: c => c.consultoras.join(', ') },
              { header: 'Notas', accessor: c => c.qtd },
              { header: 'Valor Pendente', accessor: c => c.valor },
              { header: 'Nota mais antiga', accessor: c => c.notaMaisAntiga ? fmtDate(c.notaMaisAntiga) : '' },
              { header: 'Dias em aberto', accessor: c => c.diasMaximo ?? '' },
            ],
            'clientes.xlsx',
            'Clientes'
          )}
        >
          Exportar Excel
        </ExportButton>
      </div>

      {/* Tabela de clientes */}
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
        overflow: 'auto',
      }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <SortableTh col="cliente"        label="Cliente"          sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              <SortableTh col="lojas"          label="Loja(s)"          sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              <SortableTh col="consultoras"    label="Consultora"       sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              <SortableTh col="qtd"            label="Notas"            sortCol={sortCol} sortDir={sortDir} onSort={onSort} className="right" />
              <SortableTh col="valor"          label="Valor Pendente"   sortCol={sortCol} sortDir={sortDir} onSort={onSort} className="right" />
              <SortableTh col="notaMaisAntiga" label="Nota mais antiga" sortCol={sortCol} sortDir={sortDir} onSort={onSort} className="right" />
              <SortableTh col="dias"           label="Dias em aberto"   sortCol={sortCol} sortDir={sortDir} onSort={onSort} className="right" />
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => (
              <Fragment key={c.cliente}>
                <tr
                  style={{ cursor: 'pointer', background: expanded === c.cliente ? '#FEF8F6' : undefined }}
                  onClick={() => setExpanded(e => e === c.cliente ? null : c.cliente)}
                >
                  <td className="muted">{i + 1}</td>
                  <td style={{ fontWeight: 700 }}>{c.cliente}</td>
                  <td className="muted" style={{ fontSize: '0.78rem' }}>{c.lojas.join(', ') || '—'}</td>
                  <td className="muted" style={{ fontSize: '0.78rem' }}>{c.consultoras.join(', ') || '—'}</td>
                  <td className="right">
                    <span style={{
                      background: '#FEF0EE', color: 'var(--danger)',
                      borderRadius: 6, padding: '0.15rem 0.55rem',
                      fontWeight: 700, fontSize: '0.75rem',
                    }}>{c.qtd}</span>
                  </td>
                  <td className="right" style={{ fontWeight: 700, color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtBRL(c.valor)}
                  </td>
                  <td className="right muted" style={{ fontSize: '0.8rem' }}>
                    {c.notaMaisAntiga ? fmtDate(c.notaMaisAntiga) : '—'}
                  </td>
                  <td className="right">
                    <DaysBadge dias={c.diasMaximo} />
                  </td>
                  <td style={{ color: 'var(--text-3)', fontSize: '0.75rem', paddingRight: '0.75rem' }}>
                    {expanded === c.cliente ? '▲' : '▼'}
                  </td>
                </tr>

                {/* Linha expandida: detalhe das notas */}
                {expanded === c.cliente && (
                  <tr key={`${c.cliente}-detail`}>
                    <td colSpan={9} style={{ padding: 0, background: '#FEF8F6' }}>
                      <div style={{
                        padding: '0.75rem 1.25rem 1.25rem',
                        borderTop: '1px dashed var(--border)',
                      }}>
                        <div style={{
                          fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1.5px',
                          textTransform: 'uppercase', color: 'var(--text-2)',
                          marginBottom: '0.65rem',
                        }}>
                          Notas em aberto — {c.cliente}
                        </div>
                        <table style={{ margin: 0 }}>
                          <thead>
                            <tr>
                              <th>NF</th>
                              <th>Loja</th>
                              <th>Data Emissão</th>
                              <th className="right">Dias</th>
                              <th className="right">Valor</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {c.notas.map((n, ni) => {
                              const dias = n.dataEmissao
                                ? Math.floor((new Date() - n.dataEmissao) / 86400000)
                                : null
                              return (
                                <tr key={ni}>
                                  <td style={{ fontWeight: 600 }}>{String(n.nf)}</td>
                                  <td className="muted">{n.loja || '—'}</td>
                                  <td className="muted">{n.dataEmissao ? fmtDate(n.dataEmissao) : '—'}</td>
                                  <td className="right"><DaysBadge dias={dias} /></td>
                                  <td className="right" style={{ color: 'var(--danger)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                    {fmtBRL(n.valor)}
                                  </td>
                                  <td>
                                    <span style={{
                                      fontSize: '0.7rem', fontWeight: 600,
                                      padding: '0.15rem 0.5rem', borderRadius: 4,
                                      background: '#FEF0EE', color: 'var(--danger)',
                                    }}>{n.anotacao}</span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KPICard({ label, value, color, sub }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderTop: `3px solid ${color}`, borderRadius: 'var(--radius)',
      padding: '1.25rem 1rem', flex: '1 1 135px', minWidth: 135,
      boxShadow: 'var(--shadow)', overflow: 'hidden',
    }}>
      <div style={{
        fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1.5px',
        textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '0.5rem',
      }}>{label}</div>
      <div style={{
        fontSize: 'clamp(0.95rem, 1.6vw, 1.3rem)',
        fontWeight: 700, color: 'var(--text)',
        fontVariantNumeric: 'tabular-nums',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{value}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
    </div>
  )
}
