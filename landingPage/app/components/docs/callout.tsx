const styles = {
  info: {
    border: 'border-l-primary/60',
    bg: 'bg-[rgb(var(--primary-rgb)/0.04)]',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-primary">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 9v4M10 7h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  warning: {
    border: 'border-l-accent/60',
    bg: 'bg-[rgb(var(--accent-rgb)/0.04)]',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-accent">
        <path d="M10 3l8 14H2L10 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M10 9v3M10 14h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  tip: {
    border: 'border-l-[#27c93f]/60',
    bg: 'bg-[#27c93f]/4',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-[#27c93f]">
        <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
}

export default function Callout({
  type = 'info',
  children,
}: {
  type?: 'info' | 'warning' | 'tip'
  children: React.ReactNode
}) {
  const s = styles[type]
  return (
    <div
      className={`my-6 flex gap-3 rounded-lg border-l-4 px-4 py-3 text-[14px] leading-6 text-foreground-dim ${s.border} ${s.bg}`}
    >
      <div className="mt-0.5 shrink-0">{s.icon}</div>
      <div>{children}</div>
    </div>
  )
}
