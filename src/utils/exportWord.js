import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, ImageRun, AlignmentType, BorderStyle, ShadingType,
} from 'docx'
import {
  computeKPIs, computeMonthSummaryTable, getStoreRanking,
  getStoreDelayInsights, getMissingPDVDataByStore,
  fmtBRL, MONTHS_PT, norm,
} from './dataProcessing.js'
import { renderGroupedBarChartPNG, renderHorizontalBarChartPNG } from './canvasChart.js'

const pct = v => `${Math.round(v * 100)}%`

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ text, heading: level, spacing: { before: 300, after: 150 } })
}

function paragraph(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    spacing: { after: 160 },
  })
}

function cell(text, { header = false, align = AlignmentType.LEFT } = {}) {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    shading: header ? { type: ShadingType.CLEAR, fill: 'F0EBE3' } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold: header })],
    })],
  })
}

function kpiTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: 'DDD5C8' },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: 'DDD5C8' },
      left: { style: BorderStyle.SINGLE, size: 2, color: 'DDD5C8' },
      right: { style: BorderStyle.SINGLE, size: 2, color: 'DDD5C8' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'DDD5C8' },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'DDD5C8' },
    },
    rows: [
      new TableRow({ children: [cell('Indicador', { header: true }), cell('Valor', { header: true, align: AlignmentType.RIGHT })] }),
      ...rows.map(([label, value]) => new TableRow({
        children: [cell(label), cell(value, { align: AlignmentType.RIGHT })],
      })),
    ],
  })
}

function imageParagraph({ data, width, height }) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 220 },
    children: [new ImageRun({ type: 'png', data, transformation: { width, height } })],
  })
}

function buildNarrative(delay, pdv) {
  const paragraphs = []

  if (delay.worst) {
    const w = delay.worst
    paragraphs.push(paragraph(
      `A loja que mais atrasa no retorno das NFs atualmente é a ${w.loja}, com ${pct(w.recentRate)} das saídas ` +
      `dos meses mais recentes ainda sem devolução registrada (${w.recentPendentes} de ${w.recentSaidas} notas). ` +
      `Esse é o ponto que mais merece atenção no momento.`
    ))
  } else {
    paragraphs.push(paragraph(
      'Não há, no momento, uma loja com volume suficiente de saídas recentes para apontar um atraso concentrado — ' +
      'as pendências estão distribuídas de forma mais equilibrada entre as lojas.'
    ))
  }

  if (delay.improved) {
    const im = delay.improved
    paragraphs.push(paragraph(
      `Por outro lado, podemos perceber uma melhora significativa na loja ${im.loja}: a taxa de notas sem retorno caiu de ` +
      `${pct(im.olderRate)} para ${pct(im.recentRate)} nos meses mais recentes — a loja passou a devolver as notas dentro do período correto.`
    ))
  } else {
    paragraphs.push(paragraph(
      'Não identificamos, no período analisado, uma loja com melhora expressiva e sustentada na taxa de pendências — ' +
      'vale acompanhar de perto a evolução mês a mês.'
    ))
  }

  const domLuis = pdv.find(s => norm(s.loja).includes('DOM LUIS'))
  if (domLuis) {
    paragraphs.push(paragraph(
      `A loja ${domLuis.loja}, na maioria dos períodos analisados, não coloca o nome da consultora e da cliente no PDV: ` +
      `${pct(domLuis.pctSemConsultora)} das saídas estão sem essas informações preenchidas, o que dificulta a cobrança e ` +
      `o acompanhamento individual dessas notas.`
    ))
  }

  paragraphs.push(paragraph(
    'De forma geral, o cenário é equilibrado, com a maior parte das lojas dentro do esperado. ' +
    'Os pontos destacados acima são pontuais e podem ser resolvidos com ações direcionadas nas lojas mencionadas.'
  ))

  return paragraphs
}

export async function exportOverviewWord(data) {
  const kpis = computeKPIs(data)
  const summary = computeMonthSummaryTable(data)
  const storeRanking = getStoreRanking(data)
  const delay = getStoreDelayInsights(data)
  const pdv = getMissingPDVDataByStore(data)

  const periodoLabel = summary.length
    ? `${MONTHS_PT[summary[0].month]} de ${summary[0].year} a ${MONTHS_PT[summary[summary.length - 1].month]} de ${summary[summary.length - 1].year}`
    : '—'

  const chartData = summary.map(s => ({
    name: `${MONTHS_PT[s.month].slice(0, 3)}/${String(s.year).slice(2)}`,
    Saídas: s.valorSaidas,
    Retornos: s.valorEntradas,
    Pendente: s.valorPendentes,
  }))

  const monthlyChart = await renderGroupedBarChartPNG(chartData, [
    { key: 'Saídas', color: '#C9B99A' },
    { key: 'Retornos', color: '#3A8C5C' },
    { key: 'Pendente', color: '#D14B3A' },
  ], { width: 620, height: 300 })

  const rankingItems = storeRanking.slice(0, 8).map(r => ({ label: r.loja, value: r.valorPendente }))
  const rankingChart = await renderHorizontalBarChartPNG(rankingItems, {
    width: 620, height: 260, color: '#D14B3A', valueFmt: v => fmtBRL(v),
  })

  const doc = new Document({
    creator: 'Meia Sola — Dashboard Consignações',
    title: 'Consignações — Visão Geral',
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'Consignações — Visão Geral', bold: true, size: 40 })],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [new TextRun({
            text: `Período analisado: ${periodoLabel} · Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
            italics: true, color: '6B5F54', size: 20,
          })],
          spacing: { after: 300 },
        }),

        heading('Resumo dos Indicadores'),
        paragraph(
          `No período analisado, saíram ${fmtBRL(kpis.valorSaidas)} em consignações e retornaram ${fmtBRL(kpis.valorEntradas)}, ` +
          `resultando em um saldo de ${fmtBRL(kpis.saldo)}. Atualmente há ${kpis.semRetornoCount} notas SEM RETORNO ` +
          `(${fmtBRL(kpis.semRetornoValor)}) e ${kpis.comErroCount} notas com erro operacional (${fmtBRL(kpis.comErroValor)}).`
        ),
        kpiTable([
          ['Total de Registros', String(kpis.total)],
          ['Saídas', fmtBRL(kpis.valorSaidas)],
          ['Retornos', fmtBRL(kpis.valorEntradas)],
          ['Saldo Geral', fmtBRL(kpis.saldo)],
          ['SEM RETORNO', `${fmtBRL(kpis.semRetornoValor)} (${kpis.semRetornoCount} notas)`],
          ['Com Erro', `${fmtBRL(kpis.comErroValor)} (${kpis.comErroCount} notas)`],
        ]),

        heading('Saídas vs Retornos por Mês'),
        imageParagraph(monthlyChart),

        heading('Ranking de Lojas — Valor Pendente'),
        imageParagraph(rankingChart),

        heading('Pontos de Atenção e Melhorias'),
        ...buildNarrative(delay, pdv),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  const dateStr = new Date().toISOString().slice(0, 10)
  saveBlob(blob, `Consignacoes_Visao_Geral_${dateStr}.docx`)
}
