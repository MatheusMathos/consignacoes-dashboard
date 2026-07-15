// Gráficos simples desenhados em <canvas>, fundo branco, para embutir como
// imagem PNG no relatório Word (o Word não roda componentes React/SVG).

function makeCanvas(width, height) {
  const dpr = 2
  const canvas = document.createElement('canvas')
  canvas.width = width * dpr
  canvas.height = height * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)
  return { canvas, ctx }
}

async function canvasToPngBytes(canvas) {
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  const buf = await blob.arrayBuffer()
  return new Uint8Array(buf)
}

function niceCeil(value) {
  if (value <= 0) return 1
  const exp = Math.floor(Math.log10(value))
  const base = Math.pow(10, exp)
  const frac = value / base
  const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10
  return niceFrac * base
}

function fmtShortBRL(v) {
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
  return String(Math.round(v))
}

// Gráfico de barras agrupadas — usado para Saídas vs Retornos vs Pendente por mês
export async function renderGroupedBarChartPNG(categories, series, { width = 640, height = 320, title } = {}) {
  const { canvas, ctx } = makeCanvas(width, height)
  const padding = { top: title ? 46 : 30, right: 20, bottom: 40, left: 64 }
  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom

  const maxVal = Math.max(1, ...categories.flatMap(c => series.map(s => c[s.key] || 0)))
  const niceMax = niceCeil(maxVal)

  if (title) {
    ctx.fillStyle = '#2C2825'
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(title, 0, 0)
  }

  // grid + eixo Y
  ctx.strokeStyle = '#E5DDD1'
  ctx.fillStyle = '#6B5F54'
  ctx.font = '11px Arial'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  const ySteps = 4
  for (let i = 0; i <= ySteps; i++) {
    const v = (niceMax / ySteps) * i
    const y = padding.top + plotH - (v / niceMax) * plotH
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(width - padding.right, y)
    ctx.stroke()
    ctx.fillText(`R$ ${fmtShortBRL(v)}`, padding.left - 8, y)
  }

  // barras
  const groupW = plotW / Math.max(1, categories.length)
  const barW = Math.min(20, groupW / (series.length + 1.5))
  categories.forEach((c, gi) => {
    const groupX = padding.left + gi * groupW + groupW / 2
    series.forEach((s, si) => {
      const val = c[s.key] || 0
      const barH = (val / niceMax) * plotH
      const x = groupX - (series.length * barW) / 2 + si * barW
      const y = padding.top + plotH - barH
      ctx.fillStyle = s.color
      ctx.fillRect(x, y, barW - 2, Math.max(0, barH))
    })
    ctx.fillStyle = '#6B5F54'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.font = '10px Arial'
    ctx.fillText(c.name, groupX, padding.top + plotH + 8)
  })

  // eixo X base
  ctx.strokeStyle = '#C9B99A'
  ctx.beginPath()
  ctx.moveTo(padding.left, padding.top + plotH)
  ctx.lineTo(width - padding.right, padding.top + plotH)
  ctx.stroke()

  // legenda
  let lx = padding.left
  const ly = title ? 26 : 12
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  series.forEach(s => {
    ctx.fillStyle = s.color
    ctx.fillRect(lx, ly - 5, 10, 10)
    ctx.fillStyle = '#2C2825'
    ctx.font = 'bold 11px Arial'
    ctx.fillText(s.key, lx + 14, ly)
    lx += ctx.measureText(s.key).width + 36
  })

  const data = await canvasToPngBytes(canvas)
  return { data, width, height }
}

// Gráfico de barras horizontais — usado para ranking de lojas
export async function renderHorizontalBarChartPNG(items, { width = 640, height = 320, color = '#D14B3A', title, valueFmt = v => String(Math.round(v)) } = {}) {
  const { canvas, ctx } = makeCanvas(width, height)
  const padding = { top: title ? 40 : 16, right: 70, bottom: 16, left: 160 }
  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom

  if (title) {
    ctx.fillStyle = '#2C2825'
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(title, 0, 0)
  }

  const maxVal = Math.max(1, ...items.map(i => i.value))
  const niceMax = niceCeil(maxVal)
  const rowH = plotH / Math.max(1, items.length)
  const barH = Math.min(22, rowH * 0.6)

  items.forEach((it, i) => {
    const y = padding.top + i * rowH + rowH / 2
    const barW = (it.value / niceMax) * plotW

    ctx.fillStyle = '#2C2825'
    ctx.font = '11px Arial'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    const label = it.label.length > 22 ? `${it.label.slice(0, 20)}…` : it.label
    ctx.fillText(label, padding.left - 10, y)

    ctx.fillStyle = color
    ctx.fillRect(padding.left, y - barH / 2, Math.max(1, barW), barH)

    ctx.fillStyle = '#6B5F54'
    ctx.font = 'bold 11px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(valueFmt(it.value), padding.left + barW + 8, y)
  })

  const data = await canvasToPngBytes(canvas)
  return { data, width, height }
}
