import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import {
  getAvailableMonths, analyzeMonth,
  fmtBRL, fmtInt, fmtMonth, fmtDate, MONTHS_PT,
} from '../utils/dataProcessing.js'
import { SortableTh, useSortableTable, sortRows } from '../utils/sortableTable.jsx'
import { exportTableToExcel } from '../utils/exportExcel.js'
import ExportButton from './ExportButton.jsx'

const PEND_COLUMNS = {
  nf:         r => r['NF'],
  loja:       r => r['Loja'] || '',
  cliente:    r => r['Nome da Cliente'] || '',
  consultora: r => String(r['Nome da Consultora'] || '').trim(),
  valor:      r => r._valor,
  anotacao:   r => r['Anotações'] || '',
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

function Stat({ label, value, valueColor, sub }) {
  return (
    <div style={{
      background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)',
      padding: '0.9rem 1rem', flex: '1 1 140px', minWidth: 140, overflow: 'hidden',
    }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '0.4rem' }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: valueColor || 'var(--text)', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>{sub}</div>}
    </div>
  )
}

export default function MonthAnalysis({ data }) {
  const months = useMemo(() => getAvailableMonths(data), [data])
  const [selectedKey, setSelectedKey] = useState(months[months.length - 1]?.key || '')
  const [showTable, setShowTable] = useState(false)
  const { sortCol, sortDir, onSort } = useSortableTable('valor', 'desc')

  const selected = useMemo(
    () => months.find(m => m.key === selectedKey),
    [months, selectedKey]
  )

  const analysis = useMemo(() => {
    if (!selected) return null
    return analyzeMonth(data, selected.year, selected.month)
  }, [data, selected])

  if (!analysis) return <div style={{ color: 'var(--text-2)' }}>Nenhum dado disponível.</div>

  const {
    year, month,
    totalSaidas, valorSaidas,
    totalEntradas, valorEntradas,
    qtdRetMesAnterior, valorRetMesAnterior,
    qtdSaidasMesPosterior, valorSaidasMesPosterior,
    valorRetornosProprios,
    pendenteCount, valorPendentes,
    saldoOrganico, saldoReal,
    pendentesPorLoja, pendentesRows,
  } = analysis

  // Pie chart para composição dos retornos recebidos no mês
  const pieData = [
    { name: 'Retornos do próprio mês', value: valorRetornosProprios, color: '#3A8C5C' },
    { name: 'NF mês anterior (retornou agora)', value: valorRetMesAnterior, color: '#C9B99A' },
  ].filter(d => d.value > 0)

  // Bar para lojas
  const maxLoja = pendentesPorLoja[0]?.valor || 1

  const hasAnteriores = valorRetMesAnterior > 0
  const hasMesPosterior = qtdSaidasMesPosterior > 0

  return (
    <div className="fade-in">
      {/* Seletor de mês */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-2)' }}>
          Selecione o mês
        </label>
        <select
          value={selectedKey}
          onChange={e => setSelectedKey(e.target.value)}
          style={{
            padding: '0.5rem 0.9rem', borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--border)', background: 'var(--surface)',
            fontWeight: 600, color: 'var(--text)', fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          {months.map(m => (
            <option key={m.key} value={m.key}>{fmtMonth(m.year, m.month)}</option>
          ))}
        </select>
      </div>

      {/* ── Narrativa ─────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderLeft: '4px solid var(--accent)', borderRadius: 'var(--radius)',
        padding: '1.5rem 1.75rem', marginBottom: '1.5rem',
        boxShadow: 'var(--shadow)', lineHeight: 1.75,
      }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '0.75rem' }}>
          Resumo narrativo — {fmtMonth(year, month)}
        </div>

        {/* Parágrafo 1: saídas */}
        <p style={{ fontSize: '0.9375rem', color: 'var(--text)' }}>
          Em <strong>{fmtMonth(year, month)}</strong>, saíram{' '}
          <strong style={{ color: 'var(--accent-dark)' }}>{totalSaidas} notas</strong> no valor de{' '}
          <strong style={{ color: 'var(--accent-dark)' }}>{fmtBRL(valorSaidas)}</strong>.
        </p>

        {/* Parágrafo 2: retornos recebidos no mês */}
        <p style={{ fontSize: '0.9375rem', color: 'var(--text)', marginTop: '0.6rem' }}>
          Retornaram <strong style={{ color: '#3A8C5C' }}>{totalEntradas} notas</strong>{' '}
          ({fmtBRL(valorEntradas)}) neste mês
          {hasAnteriores && (
            <>, sendo <strong style={{ color: '#7A6A5A' }}>{qtdRetMesAnterior} delas ({fmtBRL(valorRetMesAnterior)})</strong> referentes a notas emitidas em meses anteriores (NF Mês Anterior)</>
          )}.
          {hasAnteriores && (
            <> O saldo orgânico de {MONTHS_PT[month]} seria{' '}
              <strong style={{ color: saldoOrganico > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {fmtBRL(saldoOrganico)}
              </strong>, mas com esses retornos de meses anteriores o saldo real fica em{' '}
              <strong style={{ color: saldoReal > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {fmtBRL(saldoReal)}
              </strong>.
            </>
          )}
          {!hasAnteriores && (
            <> O saldo do mês é{' '}
              <strong style={{ color: saldoReal > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {fmtBRL(saldoReal)}
              </strong>.
            </>
          )}
        </p>

        {/* Parágrafo 3: NF Mês Posterior (devolvidas em mês futuro) */}
        {hasMesPosterior && (
          <p style={{ fontSize: '0.9375rem', color: 'var(--text)', marginTop: '0.6rem' }}>
            <strong style={{ color: '#3A6B8C' }}>{qtdSaidasMesPosterior} notas ({fmtBRL(valorSaidasMesPosterior)})</strong>{' '}
            emitidas em {MONTHS_PT[month]} retornaram em mês posterior (NF Mês Posterior) — já foram devolvidas, apenas fora do mês de emissão.
          </p>
        )}

        {/* Parágrafo 4: sem retorno real */}
        {pendenteCount > 0 ? (
          <p style={{ fontSize: '0.9375rem', color: 'var(--text)', marginTop: '0.6rem' }}>
            <strong style={{ color: 'var(--danger)' }}>{pendenteCount} notas ({fmtBRL(valorPendentes)})</strong>{' '}
            estão com <strong style={{ color: 'var(--danger)' }}>SEM RETORNO</strong> — nenhuma devolução foi registrada até o momento.
          </p>
        ) : (
          <p style={{ fontSize: '0.9375rem', color: '#3A8C5C', marginTop: '0.6rem' }}>
            ✓ Nenhuma nota com SEM RETORNO neste mês.
          </p>
        )}
      </div>

      {/* ── Stats row ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <Stat label="Saídas do mês" value={fmtBRL(valorSaidas)} sub={`${totalSaidas} notas`} />
        <Stat label="Retornos recebidos" value={fmtBRL(totalEntradas > 0 ? valorRetornosProprios + valorRetMesAnterior : 0)} valueColor="#3A8C5C" sub={`${totalEntradas} notas`} />
        {hasAnteriores && (
          <Stat label="NF Mês Anterior" value={fmtBRL(valorRetMesAnterior)} sub={`${qtdRetMesAnterior} notas de meses passados`} valueColor="#7A6A5A" />
        )}
        {hasMesPosterior && (
          <Stat label="NF Mês Posterior" value={fmtBRL(valorSaidasMesPosterior)} sub={`${qtdSaidasMesPosterior} notas — devolvidas depois`} valueColor="#3A6B8C" />
        )}
        <Stat label="Saldo Real" value={fmtBRL(saldoReal)} valueColor={saldoReal > 0 ? 'var(--warning)' : 'var(--success)'} />
        <Stat
          label="SEM RETORNO"
          value={fmtBRL(valorPendentes)}
          valueColor={pendenteCount > 0 ? 'var(--danger)' : 'var(--success)'}
          sub={pendenteCount > 0 ? `${pendenteCount} notas sem devolução` : 'Nenhuma pendente'}
        />
      </div>

      {/* ── Gráfico composição dos retornos ─────────────────────────── */}
      {pieData.length > 0 && (
        <>
          <SectionTitle>Composição dos Retornos em {MONTHS_PT[month]}</SectionTitle>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div style={{
              background: 'var(--surface)', borderRadius: 'var(--radius)',
              border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
              padding: '1.25rem', flex: '0 0 260px',
            }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" paddingAngle={3}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.75rem' }}>
              {pieData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{d.name}</div>
                    <div style={{ color: 'var(--text-2)', fontSize: '0.8rem' }}>{fmtBRL(d.value)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Pendentes por Loja ─────────────────────────────────────── */}
      {pendentesPorLoja.length > 0 && (
        <>
          <SectionTitle>Pendentes por Loja em {MONTHS_PT[month]}</SectionTitle>
          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--radius)',
            border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
            padding: '1.25rem', marginBottom: '1.5rem',
          }}>
            {pendentesPorLoja.map(({ loja, valor }) => (
              <div key={loja} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>{loja}</span>
                  <span style={{ fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums', color: 'var(--danger)', fontWeight: 600 }}>
                    {fmtBRL(valor)}
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: 'var(--danger)',
                    width: `${(valor / maxLoja) * 100}%`,
                    borderRadius: 3, transition: 'width 0.4s ease',
                    opacity: 0.75,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Tabela detalhada ──────────────────────────────────────── */}
      {pendenteCount > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowTable(t => !t)}
              style={{
                fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-dark)',
                padding: '0.45rem 1rem', border: '1px solid var(--accent)',
                borderRadius: 'var(--radius-sm)', background: 'var(--surface)',
                letterSpacing: '0.5px',
              }}
            >
              {showTable ? '▲ Ocultar' : '▼ Ver'} notas com SEM RETORNO ({pendenteCount})
            </button>
            {showTable && (
              <ExportButton
                onClick={() => exportTableToExcel(
                  sortRows(pendentesRows, sortCol, sortDir, PEND_COLUMNS),
                  [
                    { header: 'NF', accessor: r => r['NF'] },
                    { header: 'Loja', accessor: r => r['Loja'] || '' },
                    { header: 'Cliente', accessor: r => r['Nome da Cliente'] || '' },
                    { header: 'Consultora', accessor: r => String(r['Nome da Consultora'] || '').trim() },
                    { header: 'Valor', accessor: r => r._valor },
                    { header: 'Anotação', accessor: r => r['Anotações'] || '' },
                  ],
                  `sem_retorno_${fmtMonth(year, month).replace(' de ', '_')}.xlsx`,
                  'Sem Retorno'
                )}
              >
                Exportar Excel
              </ExportButton>
            )}
          </div>

          {showTable && (() => {
            const sorted = sortRows(pendentesRows, sortCol, sortDir, PEND_COLUMNS)
            return (
              <div style={{
                background: 'var(--surface)', borderRadius: 'var(--radius)',
                border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
                overflow: 'auto', maxHeight: 400,
              }}>
                <table>
                  <thead>
                    <tr>
                      <SortableTh col="nf"         label="NF"         sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                      <SortableTh col="loja"       label="Loja"       sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                      <SortableTh col="cliente"    label="Cliente"    sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                      <SortableTh col="consultora" label="Consultora" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                      <SortableTh col="valor"      label="Valor"      sortCol={sortCol} sortDir={sortDir} onSort={onSort} className="right" />
                      <SortableTh col="anotacao"   label="Anotação"   sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{String(r['NF'])}</td>
                        <td className="muted">{r['Loja']}</td>
                        <td>{r['Nome da Cliente'] || '—'}</td>
                        <td className="muted">{String(r['Nome da Consultora'] || '—').trim()}</td>
                        <td className="right" style={{ color: 'var(--danger)', fontWeight: 600 }}>
                          {fmtBRL(r._valor)}
                        </td>
                        <td><ErrorBadge text={r['Anotações']} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}

function ErrorBadge({ text }) {
  if (!text) return <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>—</span>
  const t = text.trim().toUpperCase()
  const isError = t.startsWith('ERRO') || t.includes('SEM RETORNO')
  return (
    <span style={{
      fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.5rem',
      borderRadius: 4,
      background: isError ? '#FEF0EE' : '#F7F4F0',
      color: isError ? 'var(--danger)' : 'var(--text-2)',
    }}>{text}</span>
  )
}
