const methodColors: Record<string, string> = {
  GET: 'bg-primary/15 text-primary',
  POST: 'bg-[#27c93f]/15 text-[#27c93f]',
  PATCH: 'bg-accent/15 text-accent',
  DELETE: 'bg-danger/15 text-danger',
}

export default function EndpointCard({
  method,
  path,
  description,
  auth = true,
  children,
}: {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  description: string
  auth?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="my-4 rounded-xl border border-border bg-background-mid p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-md px-2.5 py-1 font-mono text-xs font-bold ${methodColors[method] ?? 'bg-white/10 text-white'}`}
        >
          {method}
        </span>
        <code className="font-mono text-sm text-white">{path}</code>
        {auth && (
          <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/40">
            Auth
          </span>
        )}
      </div>
      <p className="mt-2 text-sm leading-6 text-foreground-dim">
        {description}
      </p>
      {children && (
        <div className="mt-3 border-t border-border pt-3 text-sm text-foreground-dim">
          {children}
        </div>
      )}
    </div>
  )
}
