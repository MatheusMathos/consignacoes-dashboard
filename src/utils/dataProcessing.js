// ─── Normalização ────────────────────────────────────────────────────────────

export function removeAccents(str) {
  // Usa range hex explícito para evitar problemas de encoding no arquivo
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function norm(val) {
  if (val == null) return ''
  return removeAccents(String(val).trim().toUpperCase())
}

export function normEspecie(val) {
  const v = norm(val)
  if (v === 'SAIDA' || v === 'SAÍDA') return 'SAIDA'
  if (v === 'ENTRADA') return 'ENTRADA'
  return v
}

export function normPareado(val) {
  const v = norm(val)
  if (v === 'OK') return 'OK'
  return 'NAO_PAREADO'
}

// ─── Formatação ──────────────────────────────────────────────────────────────

export function fmtBRL(value) {
  if (value == null || isNaN(value)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function fmtInt(value) {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function fmtDate(date) {
  if (!date) return '—'
  if (date instanceof Date) {
    return date.toLocaleDateString('pt-BR')
  }
  // string no formato yyyy-mm-dd
  const [y, m, d] = String(date).split('-')
  if (y && m && d) return `${d}/${m}/${y}`
  return String(date)
}

export const MONTHS_PT = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function fmtMonth(year, month) {
  return `${MONTHS_PT[month]} de ${year}`
}

// ─── Helpers de data ─────────────────────────────────────────────────────────

function parseDate(val) {
  if (!val) return null
  // SheetJS com cellDates:true já entrega Date objects
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val
  // Fallback: string "yyyy-mm-dd" ou "mm/dd/yy"
  const d = new Date(String(val))
  return isNaN(d.getTime()) ? null : d
}

// ─── Processamento do Excel/JSON ──────────────────────────────────────────────

export function parseRow(row) {
  // Normaliza valor: com raw:true já é number, mas pode vir como string em JSONs manuais
  const rawValor = row['Total da Nota']
  const valor = typeof rawValor === 'number'
    ? rawValor
    : parseFloat(String(rawValor || '').replace(/[^0-9.,]/g, '').replace(',', '.')) || 0

  return {
    ...row,
    _especie: normEspecie(row['Espécie']),
    _pareado: normPareado(row['Pareado']),
    _anotacao: norm(row['Anotações']),
    _valor: valor,
    _dataEmissao: parseDate(row['Data Emissão']),
    _dataPagamento: parseDate(row['Data do Pagamento/Previsão']),
  }
}

export function processData(rawRows) {
  return rawRows.map(parseRow)
}

// ─── Lógica de datas ──────────────────────────────────────────────────────────

export function getYearMonth(date) {
  if (!date) return null
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

export function sameYearMonth(date, year, month) {
  if (!date) return false
  return date.getFullYear() === year && date.getMonth() + 1 === month
}

// ─── KPIs Gerais ─────────────────────────────────────────────────────────────

export function computeKPIs(rows) {
  const total = rows.length
  const totalValor = rows.reduce((s, r) => s + r._valor, 0)

  const processoOk = rows.filter(r => r._anotacao === 'PROCESSO OK')
  const saidas = rows.filter(r => r._especie === 'SAIDA')
  const entradas = rows.filter(r => r._especie === 'ENTRADA')

  const valorSaidas = saidas.reduce((s, r) => s + r._valor, 0)
  const valorEntradas = entradas.reduce((s, r) => s + r._valor, 0)
  const saldo = valorSaidas - valorEntradas

  // Pendentes REAIS: apenas Saídas com SEM RETORNO (mesmo critério das outras abas)
  // NF Mês Anterior e NF Mês Posterior = já foram devolvidas (em outro mês) → não são pendentes
  const semRetorno = saidas.filter(
    r => r._anotacao === 'SEM RETORNO' || r._anotacao === 'NF SEM RETORNO'
  )

  // Erros: separado dos pendentes
  const comErro = rows.filter(r => r._anotacao.startsWith('ERRO') || r._anotacao === 'SEM REMESSA')

  return {
    total,
    totalValor,
    processoOkValor: processoOk.reduce((s, r) => s + r._valor, 0),
    semRetornoCount: semRetorno.length,
    semRetornoValor: semRetorno.reduce((s, r) => s + r._valor, 0),
    comErroCount: comErro.length,
    comErroValor: comErro.reduce((s, r) => s + r._valor, 0),
    valorSaidas,
    valorEntradas,
    saldo,
    saidaCount: saidas.length,
    entradaCount: entradas.length,
  }
}

// ─── Meses disponíveis ────────────────────────────────────────────────────────

export function getAvailableMonths(rows) {
  const seen = new Set()
  const result = []
  for (const r of rows) {
    if (!r._dataEmissao) continue
    const y = r._dataEmissao.getFullYear()
    const m = r._dataEmissao.getMonth() + 1
    const key = `${y}-${String(m).padStart(2, '0')}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push({ year: y, month: m, key })
    }
  }
  return result.sort((a, b) => a.key.localeCompare(b.key))
}

// ─── Análise por Mês ──────────────────────────────────────────────────────────

export function analyzeMonth(rows, year, month) {
  const doMes = rows.filter(r => sameYearMonth(r._dataEmissao, year, month))

  // Saídas emitidas no mês
  const saidas = doMes.filter(r => r._especie === 'SAIDA')
  const totalSaidas = saidas.length
  const valorSaidas = saidas.reduce((s, r) => s + r._valor, 0)

  // Entradas (retornos) registradas no mês
  const entradas = doMes.filter(r => r._especie === 'ENTRADA')
  const totalEntradas = entradas.length
  const valorEntradas = entradas.reduce((s, r) => s + r._valor, 0)

  // Retornos que são de notas de meses ANTERIORES (entraram agora, saíram antes)
  const retMesAnterior = entradas.filter(r => r._anotacao === 'NF MES ANTERIOR')
  const valorRetMesAnterior = retMesAnterior.reduce((s, r) => s + r._valor, 0)
  const qtdRetMesAnterior = retMesAnterior.length

  // Retornos que são de notas de meses POSTERIORES (saíram antes, retornam depois)
  const retMesPosterior = entradas.filter(r => r._anotacao === 'NF MES POSTERIOR')
  const valorRetMesPosterior = retMesPosterior.reduce((s, r) => s + r._valor, 0)

  // Retornos "próprios" do mês (excluindo os de meses anteriores/posteriores)
  const retornosProprios = entradas.filter(
    r => r._anotacao !== 'NF MES ANTERIOR' && r._anotacao !== 'NF MES POSTERIOR'
  )
  const valorRetornosProprios = retornosProprios.reduce((s, r) => s + r._valor, 0)

  // Processo OK no mês
  const processoOk = doMes.filter(r => r._anotacao === 'PROCESSO OK')
  const valorProcessoOk = processoOk.reduce((s, r) => s + r._valor, 0)

  // Saídas do mês que retornaram num mês POSTERIOR (NF MÊS POSTERIOR nas saídas)
  // → foram devolvidas, só que depois. Não são pendentes.
  const saidasMesPosterior = saidas.filter(r => r._anotacao === 'NF MES POSTERIOR')
  const valorSaidasMesPosterior = saidasMesPosterior.reduce((s, r) => s + r._valor, 0)

  // Pendentes REAIS: apenas saídas com SEM RETORNO (nenhuma devolução registrada)
  const pendentes = saidas.filter(
    r => r._anotacao === 'SEM RETORNO' || r._anotacao === 'NF SEM RETORNO'
  )
  const valorPendentes = pendentes.reduce((s, r) => s + r._valor, 0)

  // Saldo orgânico do mês (considerando só retornos próprios)
  const saldoOrganico = valorSaidas - valorRetornosProprios
  // Saldo real (com tudo que entrou no mês)
  const saldoReal = valorSaidas - valorEntradas

  // Pendentes por loja
  const pendentesPorLoja = Object.entries(
    pendentes.reduce((acc, r) => {
      const loja = r['Loja'] || 'Sem loja'
      acc[loja] = (acc[loja] || 0) + r._valor
      return acc
    }, {})
  )
    .map(([loja, valor]) => ({ loja, valor }))
    .sort((a, b) => b.valor - a.valor)

  return {
    year, month,
    totalSaidas, valorSaidas,
    totalEntradas, valorEntradas,
    qtdRetMesAnterior, valorRetMesAnterior,
    qtdRetMesPosterior: retMesPosterior.length, valorRetMesPosterior,
    qtdSaidasMesPosterior: saidasMesPosterior.length, valorSaidasMesPosterior,
    valorRetornosProprios,
    processoOkCount: processoOk.length, valorProcessoOk,
    pendenteCount: pendentes.length, valorPendentes,
    saldoOrganico, saldoReal,
    pendentesPorLoja,
    pendentesRows: pendentes,
  }
}

// ─── Tabela resumo de meses ───────────────────────────────────────────────────

export function computeMonthSummaryTable(rows) {
  const months = getAvailableMonths(rows)
  return months.map(({ year, month }) => {
    const a = analyzeMonth(rows, year, month)
    return {
      key: `${year}-${String(month).padStart(2, '0')}`,
      label: fmtMonth(year, month),
      year, month,
      totalSaidas: a.totalSaidas,
      valorSaidas: a.valorSaidas,
      totalEntradas: a.totalEntradas,
      valorEntradas: a.valorEntradas,
      valorRetMesAnterior: a.valorRetMesAnterior,
      pendenteCount: a.pendenteCount,
      valorPendentes: a.valorPendentes,
      saldoReal: a.saldoReal,
    }
  })
}

// ─── Últimos 3 meses sem devolução ───────────────────────────────────────────

export function getNoReturnLast3Months(rows) {
  // Determina o mês mais recente na base
  let maxDate = null
  for (const r of rows) {
    if (r._dataEmissao && (!maxDate || r._dataEmissao > maxDate)) {
      maxDate = r._dataEmissao
    }
  }
  if (!maxDate) return { rows: [], cutoff: null, maxDate: null }

  // 3 meses atrás a partir do mês mais recente do arquivo
  const cutoff = new Date(maxDate.getFullYear(), maxDate.getMonth() - 2, 1)

  // Pendente REAL = apenas SEM RETORNO (mesma lógica da aba Análise por Mês)
  // NF MÊS POSTERIOR = devolvida em mês futuro → NÃO é pendente
  // Erros → ficam na aba Erros
  const isSemRetorno = (r) =>
    r._anotacao === 'SEM RETORNO' || r._anotacao === 'NF SEM RETORNO'

  const filteredRows = rows.filter(r => {
    if (!r._dataEmissao) return false
    if (r._dataEmissao < cutoff) return false
    if (r._especie !== 'SAIDA') return false
    return isSemRetorno(r)
  }).map(r => ({
    nf: r['NF'],
    loja: r['Loja'],
    cliente: r['Nome da Cliente'],
    consultora: r['Nome da Consultora'],
    dataEmissao: r._dataEmissao ? r._dataEmissao.toLocaleDateString('pt-BR') : '—',
    valor: r._valor,
    anotacao: r['Anotações'] || '—',
    diasPendente: r._dataEmissao
      ? Math.floor((new Date() - r._dataEmissao) / 86400000)
      : null,
  })).sort((a, b) => b.diasPendente - a.diasPendente)

  return { rows: filteredRows, cutoff, maxDate }
}

// ─── Erros ────────────────────────────────────────────────────────────────────

const ERRO_KEYWORDS = [
  'ERRO', 'SEM RETORNO', 'NF SEM RETORNO', 'SEM REMESSA',
  'NF CANCELADA', 'RETORNO MENOR', 'RETIRADA',
]

export function classifyError(anotacao) {
  const a = norm(anotacao)
  if (!a) return null
  if (a === 'NF MES ANTERIOR' || a === 'NF MES POSTERIOR' || a === 'PROCESSO OK') return null
  if (ERRO_KEYWORDS.some(k => a.includes(k))) return a
  return null
}

export function getErrors(rows) {
  return rows.filter(r => {
    const err = classifyError(r['Anotações'])
    return err !== null
  })
}

export function getErrorSummary(rows) {
  const errRows = getErrors(rows)

  // Por tipo de erro
  const byType = {}
  for (const r of errRows) {
    const tipo = norm(r['Anotações']) || 'SEM DESCRIÇÃO'
    if (!byType[tipo]) byType[tipo] = { tipo, count: 0, valor: 0, lojas: new Set() }
    byType[tipo].count++
    byType[tipo].valor += r._valor
    if (r['Loja']) byType[tipo].lojas.add(r['Loja'])
  }

  const tipoList = Object.values(byType).map(e => ({
    ...e,
    lojas: e.lojas.size,
  })).sort((a, b) => b.valor - a.valor)

  // Por loja
  const byLoja = {}
  for (const r of errRows) {
    const loja = r['Loja'] || 'Sem loja'
    if (!byLoja[loja]) byLoja[loja] = { loja, count: 0, valor: 0 }
    byLoja[loja].count++
    byLoja[loja].valor += r._valor
  }
  const lojaList = Object.values(byLoja).sort((a, b) => b.valor - a.valor)

  return {
    total: errRows.length,
    totalValor: errRows.reduce((s, r) => s + r._valor, 0),
    byType: tipoList,
    byLoja: lojaList,
    rows: errRows,
  }
}

// ─── Ranking Clientes ────────────────────────────────────────────────────────

export function getClientRanking(rows) {
  const today = new Date()
  const byCliente = {}

  for (const r of rows) {
    if (r._especie !== 'SAIDA') continue
    if (r._anotacao !== 'SEM RETORNO' && r._anotacao !== 'NF SEM RETORNO') continue

    const nome = (r['Nome da Cliente'] || 'Sem nome').trim()
    if (!byCliente[nome]) {
      byCliente[nome] = {
        cliente: nome,
        qtd: 0,
        valor: 0,
        lojas: new Set(),
        consultoras: new Set(),
        notaMaisAntiga: null,
        notas: [],
      }
    }
    const c = byCliente[nome]
    c.qtd++
    c.valor += r._valor
    if (r['Loja']) c.lojas.add(r['Loja'])
    if (r['Nome da Consultora']) c.consultoras.add(String(r['Nome da Consultora']).trim())
    if (r._dataEmissao) {
      if (!c.notaMaisAntiga || r._dataEmissao < c.notaMaisAntiga) {
        c.notaMaisAntiga = r._dataEmissao
      }
    }
    c.notas.push({
      nf: r['NF'],
      loja: r['Loja'],
      dataEmissao: r._dataEmissao,
      valor: r._valor,
      anotacao: r['Anotações'],
    })
  }

  return Object.values(byCliente).map(c => ({
    ...c,
    lojas: [...c.lojas],
    consultoras: [...c.consultoras],
    diasMaximo: c.notaMaisAntiga
      ? Math.floor((today - c.notaMaisAntiga) / 86400000)
      : null,
    notas: c.notas.sort((a, b) => (a.dataEmissao || 0) - (b.dataEmissao || 0)),
  }))
}

// ─── Ranking Lojas ────────────────────────────────────────────────────────────

export function getStoreRanking(rows) {
  const byLoja = {}
  for (const r of rows) {
    const loja = r['Loja'] || 'Sem loja'
    if (!byLoja[loja]) byLoja[loja] = { loja, saidas: 0, entradas: 0, pendentes: 0, valorPendente: 0 }
    if (r._especie === 'SAIDA') byLoja[loja].saidas += r._valor
    if (r._especie === 'ENTRADA') byLoja[loja].entradas += r._valor
    if (r._especie === 'SAIDA' && (r._anotacao === 'SEM RETORNO' || r._anotacao === 'NF SEM RETORNO')) {
      byLoja[loja].pendentes++
      byLoja[loja].valorPendente += r._valor
    }
  }
  return Object.values(byLoja)
    .map(e => ({ ...e, saldo: e.saidas - e.entradas }))
    .sort((a, b) => b.valorPendente - a.valorPendente)
}
