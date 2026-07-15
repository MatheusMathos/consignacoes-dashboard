import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { getStoreRanking, fmtBRL, fmtInt } from '../utils/dataProcessing.js'
import { SortableTh, useSortableTable, sortRows } from '../utils/sortableTable.jsx'
import { exportTableToExcel } from '../utils/exportExcel.js'
import { useIsMobile } from '../utils/useMediaQuery.js'
import ExportButton from './ExportButton.jsx'

const RANKING_COLUMNS = {
  loja:          r => r.loja,
  saidas:        r => r.saidas,
  entradas:      r => r.entradas,
  saldo:         r => r.saldo,
  pendentes:     r => r.pendentes,
  valorPendente: r => r.valorPendente,
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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '0.7rem 1rem',
      boxShadow: 'var(--shadow-lg)', fontSize: '0.8rem',
    }}>
      <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.fill, marginBottom: '0.1rem' }}>
          {p.name}: <strong>{fmtBRL(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

export default function StoreRanking({ data }) {
  const ranking = useMemo(() => getStoreRanking(data), [data])
  const isMobile = useIsMobile()
  const { sortCol, sortDir, onSort } = useSortableTable('valorPendente', 'desc')
  const sortedRanking = useMemo(
    () => sortRows(ranking, sortCol, sortDir, RANKING_COLUMNS),
    [ranking, sortCol, sortDir]
  )

  const nameMax = isMobile ? 12 : 22
  const chartData = ranking.slice(0, 10).map(r => ({
    name: r.loja.length > nameMax ? r.loja.slice(0, nameMax - 2) + '…' : r.loja,
    fullName: r.loja,
    Saídas: r.saidas,
    Retornos: r.entradas,
    Pendente: r.valorPendente,
  }))

  const maxPend = ranking[0]?.valorPendente || 1

  return (
    <div className="fade-in">
      <SectionTitle>Ranking de Pendências por Loja</SectionTitle>
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)', padding: '1.25rem',
        boxShadow: 'var(--shadow)', marginBottom: '1.75rem',
      }}>
        {ranking.map(({ loja, saidas, entradas, saldo, pendentes, valorPendente }) => (
          <div key={loja} style={{ marginBottom: '1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.3rem 1rem', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text)' }}>{loja}</span>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-2)' }}>Saldo: <strong style={{ color: saldo > 0 ? 'var(--warning)' : 'var(--success)' }}>{fmtBRL(saldo)}</strong></span>
                <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{fmtBRL(valorPendente)}</span>
              </div>
            </div>
            <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: valorPendente > 0
                  ? `linear-gradient(90deg, var(--danger) 0%, #E88070 100%)`
                  : 'var(--success)',
                width: `${Math.max(2, (valorPendente / maxPend) * 100)}%`,
                borderRadius: 3, transition: 'width 0.4s ease',
              }} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--text-3)' }}>
              <span>Saídas: {fmtBRL(saidas)}</span>
              <span>Retornos: {fmtBRL(entradas)}</span>
              <span>{pendentes} notas pendentes</span>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>Saídas vs Retornos por Loja</SectionTitle>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '1.5rem', boxShadow: 'var(--shadow)', marginBottom: '1.75rem' }}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }} barGap={2} barSize={12}>
            <XAxis type="number" tickFormatter={v => `R$ ${(v/1000).toFixed(0)}k`}
              tick={{ fontSize: 10, fill: 'var(--text-2)' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={isMobile ? 80 : 160}
              tick={{ fontSize: 10, fill: 'var(--text-2)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Saídas"   fill="#C9B99A" radius={[0,3,3,0]} name="Saídas" />
            <Bar dataKey="Retornos" fill="#3A8C5C" radius={[0,3,3,0]} name="Retornos" />
            <Bar dataKey="Pendente" fill="#D14B3A" radius={[0,3,3,0]} name="Pendente" />
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

      <SectionTitle>Tabela Completa</SectionTitle>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <ExportButton
          onClick={() => exportTableToExcel(
            sortedRanking,
            [
              { header: 'Loja', accessor: r => r.loja },
              { header: 'Saídas (R$)', accessor: r => r.saidas },
              { header: 'Retornos (R$)', accessor: r => r.entradas },
              { header: 'Saldo', accessor: r => r.saldo },
              { header: 'Qtd Pendente', accessor: r => r.pendentes },
              { header: 'Valor Pendente', accessor: r => r.valorPendente },
            ],
            'ranking_lojas.xlsx',
            'Ranking Lojas'
          )}
        >
          Exportar Excel
        </ExportButton>
      </div>
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
        overflow: 'auto',
      }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <SortableTh col="loja"          label="Loja"            sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              <SortableTh col="saidas"        label="Saídas (R$)"     sortCol={sortCol} sortDir={sortDir} onSort={onSort} className="right" />
              <SortableTh col="entradas"      label="Retornos (R$)"   sortCol={sortCol} sortDir={sortDir} onSort={onSort} className="right" />
              <SortableTh col="saldo"         label="Saldo"           sortCol={sortCol} sortDir={sortDir} onSort={onSort} className="right" />
              <SortableTh col="pendentes"     label="Qtd Pendente"    sortCol={sortCol} sortDir={sortDir} onSort={onSort} className="right" />
              <SortableTh col="valorPendente" label="Valor Pendente"  sortCol={sortCol} sortDir={sortDir} onSort={onSort} className="right" />
            </tr>
          </thead>
          <tbody>
            {sortedRanking.map(({ loja, saidas, entradas, saldo, pendentes, valorPendente }, i) => (
              <tr key={loja}>
                <td className="muted">{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{loja}</td>
                <td className="right">{fmtBRL(saidas)}</td>
                <td className="right">{fmtBRL(entradas)}</td>
                <td className="right" style={{ fontWeight: 700, color: saldo > 0 ? 'var(--warning)' : 'var(--success)' }}>
                  {fmtBRL(saldo)}
                </td>
                <td className="right">
                  <span style={{
                    background: pendentes > 0 ? '#FEF0EE' : '#F0FAF4',
                    color: pendentes > 0 ? 'var(--danger)' : 'var(--success)',
                    borderRadius: 6, padding: '0.15rem 0.5rem', fontWeight: 700, fontSize: '0.75rem',
                  }}>{pendentes}</span>
                </td>
                <td className="right" style={{ fontWeight: 700, color: valorPendente > 0 ? 'var(--danger)' : 'inherit' }}>
                  {fmtBRL(valorPendente)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
