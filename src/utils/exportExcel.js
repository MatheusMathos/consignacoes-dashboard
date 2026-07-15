import * as XLSX from 'xlsx'

// columns: [{ header, accessor: row => value }]
function sheetFromRows(rows, columns) {
  const data = rows.map(r => {
    const obj = {}
    for (const c of columns) obj[c.header] = c.accessor(r)
    return obj
  })
  return XLSX.utils.json_to_sheet(data, { header: columns.map(c => c.header) })
}

// sheets: [{ name, rows, columns }]
export function exportSheetsToExcel(sheets, filename) {
  const wb = XLSX.utils.book_new()
  for (const { name, rows, columns } of sheets) {
    const ws = sheetFromRows(rows, columns)
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
  }
  XLSX.writeFile(wb, filename)
}

export function exportTableToExcel(rows, columns, filename, sheetName = 'Dados') {
  exportSheetsToExcel([{ name: sheetName, rows, columns }], filename)
}
