// Botão de exportação reutilizável (Excel, Word, etc.)
export default function ExportButton({ onClick, children, variant = 'excel' }) {
  const colors = {
    excel: { border: 'var(--success)', color: 'var(--success)' },
    word:  { border: 'var(--info)',    color: 'var(--info)' },
  }[variant]

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        fontSize: '0.75rem', fontWeight: 600,
        padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-sm)',
        border: `1.5px solid ${colors.border}`, background: 'var(--surface)',
        color: colors.color, cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {children}
    </button>
  )
}
