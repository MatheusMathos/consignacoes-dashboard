import { useState } from 'react'

// Cabeçalho de coluna clicável para ordenação (maior→menor / menor→maior / A-Z / Z-A)
export function SortableTh({ col, label, sortCol, sortDir, onSort, className }) {
  const active = sortCol === col
  return (
    <th
      className={className}
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

// Hook de estado de ordenação: alterna asc/desc ao clicar na mesma coluna
export function useSortableTable(defaultCol, defaultDir = 'desc') {
  const [sortCol, setSortCol] = useState(defaultCol)
  const [sortDir, setSortDir] = useState(defaultDir)

  const onSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  return { sortCol, sortDir, onSort }
}

// Ordena `rows` pela coluna ativa. `accessors` é um mapa { coluna: row => valor }.
// Valores string usam ordem alfabética (localeCompare pt-BR); valores numéricos usam maior/menor.
export function sortRows(rows, sortCol, sortDir, accessors) {
  const getter = accessors[sortCol]
  if (!getter) return rows
  return [...rows].sort((a, b) => {
    const va = getter(a)
    const vb = getter(b)
    if (typeof va === 'string' || typeof vb === 'string') {
      const sa = String(va ?? '')
      const sb = String(vb ?? '')
      return sortDir === 'asc' ? sa.localeCompare(sb, 'pt-BR') : sb.localeCompare(sa, 'pt-BR')
    }
    const na = va ?? 0
    const nb = vb ?? 0
    return sortDir === 'asc' ? na - nb : nb - na
  })
}
