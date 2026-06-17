import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { getErrorSummary, fmtBRL, fmtInt, fmtDate } from '../utils/dataProcessing.js'

const ERROR_COLORS = [
  '#D14B3A', '#E5912A', '#C9B99A', '#7A6A5A', '#A09E9C',
  '#8C3A3A', '#B36B1A', '#5C7A5C', '#3A6B8C', '#8C5A8C',
]

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
      <div style={{ fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text)', maxWidth: 220 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.fill }}>
          {fmtBRL(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function ErrorsPanel({ data }) {
  const summary = useMemo(() => getErrorSummary(data), [data])
  const [activeType, setActiveType] = useState(null)
  const [search, setSearch] = useState('')

  // Linhas filtradas
  const filteredRows = useMemo(() => {
    let rows = summary.rows
    if (activeType) {
      rows = rows.filter(r => {
        const a = String(r['Anotações'] || '').trim().toUpperCase()
          .normalize('NFD').replace(/[̀-ͯ]/g, '')
        return a === activeType
      })
    }
    if (search) {
      const s = search.toLowerCase()
      rows = rows.filter(r =>
        String(r['NF']).includes(s) ||
        (r['Nome da Cliente'] || '').toLowerCase().includes(s) ||
        (r['Loja'] || '').toLowerCase().includes(s)
      )
    }
    return rows
  }, [summary.rows, activeType, search])

  if (summary.total === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '4rem',
        color: 'var(--success)', fontWeight: 600, fontSize: '1rem',
      }}>
        ✅ Nenhum erro encontrado nos dados carregados.
      </div>
    )
  }

  // Dados do gráfico (top 8 por valor)
  const chartData = summary.byType.slice(0, 8).map((e, i) => ({
    name: e.tipo.length > 28 ? e.tipo.slice(0, 26) + '…' : e.tipo,
    fullName: e.tipo,
    valor: e.valor,
    color: ERROR_COLORS[i % ERROR_COLORS.length],
  }))

  return (
    <div className="fade-in">
      {/* KPI topo */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderTop: '3px solid var(--danger)', borderRadius: 'var(--radius)',
          padding: '1.25rem', flex: 1, minWidth: 160, boxShadow: 'var(--shadow)',
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '0.4rem' }}>
            Total de Erros
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>{fmtInt(summary.total)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>notas com problema</div>
        </div>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderTop: '3px solid var(--warning)', borderRadius: 'var(--radius)',
          padding: '1.25rem', flex: 1, minWidth: 200, boxShadow: 'var(--shadow)',
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '0.4rem' }}>
            Valor Total em Erros
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)', fontVariantNumeric: 'tabular-nums' }}>
            {fmtBRL(summary.totalValor)}
          </div>
        </div>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderTop: '3px solid var(--info)', borderRadius: 'var(--radius)',
          padding: '1.25rem', flex: 1, minWidth: 160, boxShadow: 'var(--shadow)',
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '0.4rem' }}>
            Tipos de Erro
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--info)' }}>{summary.byType.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>categorias distintas</div>
        </div>
      </div>

      {/* Gráfico */}
      <SectionTitle>Valor por Tipo de Erro</SectionTitle>
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)', padding: '1.5rem',
        boxShadow: 'var(--shadow)', marginBottom: '1.75rem',
      }}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
            <XAxis type="number" tickFormatter={v => `R$ ${(v/1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: 'var(--text-2)' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={190}
              tick={{ fontSize: 11, fill: 'var(--text-2)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="valor" radius={[0,4,4,0]} barSize={18}>
              {chartData.map((e, i) => (
                <Cell key={i} fill={
                  activeType === e.fullName ? ERROR_COLORS[i % ERROR_COLORS.length] : `${ERROR_COLORS[i % ERROR_COLORS.length]}CC`
                } cursor="pointer"
                  onClick={() => setActiveType(t => t === e.fullName ? null : e.fullName)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {activeType && (
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-2)', marginTop: '0.5rem' }}>
            Filtrando por: <strong style={{ color: 'var(--danger)' }}>{activeType}</strong>
            {' '}·{' '}
            <button onClick={() => setActiveType(null)} style={{ color: 'var(--accent-dark)', fontWeight: 600, fontSize: '0.75rem' }}>
              Limpar filtro
            </button>
          </div>
        )}
      </div>

      {/* Tabela por tipo */}
      <SectionTitle>Resumo por Tipo</SectionTitle>
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
        overflow: 'auto', marginBottom: '1.75rem',
      }}>
        <table>
          <thead>
            <tr>
              <th>Tipo de Erro</th>
              <th className="right">Qtd</th>
              <th className="right">Valor</th>
              <th className="right">Lojas afetadas</th>
            </tr>
          </thead>
          <tbody>
            {summary.byType.map((e, i) => (
              <tr
                key={e.tipo}
                onClick={() => setActiveType(t => t === e.tipo ? null : e.tipo)}
                style={{
                  cursor: 'pointer',
                  background: activeType === e.tipo ? '#FEF0EE' : undefined,
                }}
              >
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: ERROR_COLORS[i % ERROR_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{e.tipo}</span>
                  </div>
                </td>
                <td className="right">
                  <span style={{
                    background: '#FEF0EE', color: 'var(--danger)',
                    borderRadius: 6, padding: '0.15rem 0.5rem', fontWeight: 700, fontSize: '0.75rem',
                  }}>{e.count}</span>
                </td>
                <td className="right" style={{ fontWeight: 600, color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtBRL(e.valor)}
                </td>
                <td className="right muted">{e.lojas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detalhamento */}
      <SectionTitle>Detalhamento das Notas com Erro</SectionTitle>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          placeholder="Buscar NF, cliente, loja..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--border)', background: 'var(--surface)',
            fontSize: '0.8125rem', flex: 1, minWidth: 200,
          }}
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
          {fmtInt(filteredRows.length)} notas · {fmtBRL(filteredRows.reduce((s, r) => s + r._valor, 0))}
        </span>
      </div>
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
        overflow: 'auto', maxHeight: 480,
      }}>
        <table>
          <thead>
            <tr>
              <th>NF</th>
              <th>Espécie</th>
              <th>Loja</th>
              <th>Data Emissão</th>
              <th>Cliente</th>
              <th>Consultora</th>
              <th className="right">Valor</th>
              <th>Erro</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem' }}>
                  Nenhuma nota encontrada
                </td>
              </tr>
            ) : (
              filteredRows.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700 }}>{String(r['NF'])}</td>
                  <td className="muted">{r['Espécie']}</td>
                  <td className="muted">{r['Loja']}</td>
                  <td className="muted">{fmtDate(r['Data Emissão'])}</td>
                  <td>{r['Nome da Cliente'] || '—'}</td>
                  <td className="muted">{r['Nome da Consultora'] || '—'}</td>
                  <td className="right" style={{ fontWeight: 700, color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtBRL(r._valor)}
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.5rem',
                      borderRadius: 4, background: '#FEF0EE', color: 'var(--danger)',
                    }}>{r['Anotações']}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
