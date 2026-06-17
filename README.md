# 👠 Consignações — Dashboard React

Dashboard de análise de consignações, substituindo o Streamlit por React + Vite.

## Stack

- **React 18** + **Vite** — build rápido
- **Recharts** — gráficos
- **SheetJS (xlsx)** — leitura do Excel direto no browser
- **Lucide React** — ícones

## Rodando localmente

```bash
cd consignei-react
npm install
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173), faça upload do `Consignacoes_Acumulado.xlsx` e pronto.

---

## Deploy gratuito no Vercel (recomendado)

### 1. Suba para o GitHub

Coloque apenas a pasta `consignei-react` num repositório GitHub (ou deixe o projeto inteiro e configure o diretório raiz no Vercel).

```bash
# Exemplo: repositório só com o React
cd consignei-react
git init
git add .
git commit -m "feat: dashboard consignações react"
git remote add origin https://github.com/SEU_USUARIO/consignacoes-dashboard.git
git push -u origin main
```

### 2. Importe no Vercel

1. Acesse [vercel.com](https://vercel.com) → **Add New Project**
2. Conecte sua conta GitHub e selecione o repositório
3. Em **Root Directory**, coloque `consignei-react` (se o repo tiver outras pastas)
4. Framework: **Vite** (detectado automaticamente)
5. Clique em **Deploy**

Em ~1 minuto você terá uma URL como `https://consignacoes-dashboard.vercel.app` — gratuita e com HTTPS.

### 3. Atualizações

Basta fazer `git push` — o Vercel redeploya automaticamente.

---

## Estrutura do projeto

```
consignei-react/
├── src/
│   ├── App.jsx               # Layout principal + upload
│   ├── index.css             # Design tokens e estilos base
│   ├── components/
│   │   ├── KPICards.jsx      # Resumo geral + gráfico mensal
│   │   ├── MonthAnalysis.jsx # Análise detalhada por mês com narrativa
│   │   ├── NoReturnPanel.jsx # Últimos 3 meses sem devolução
│   │   ├── ErrorsPanel.jsx   # Erros por tipo + detalhamento
│   │   └── StoreRanking.jsx  # Ranking por loja
│   └── utils/
│       └── dataProcessing.js # Toda lógica de dados
├── index.html
├── vite.config.js
└── package.json
```

## Colunas esperadas no Excel

| Coluna | Descrição |
|--------|-----------|
| NF | Número da nota fiscal |
| Espécie | `Entrada` ou `Saída` |
| Loja | Nome da loja |
| Data Emissão | Data no formato YYYY-MM-DD |
| Total da Nota | Valor numérico |
| Nome da Cliente | Nome da cliente |
| Nome da Consultora | Nome da consultora |
| Anotações | Ex: `PROCESSO OK`, `SEM RETORNO`, `ERRO OPERACIONAL`... |
| Pareado | `OK` ou `Não pareado` |
