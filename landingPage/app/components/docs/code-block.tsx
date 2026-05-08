export default function CodeBlock({
  filename,
  children,
}: {
  filename?: string
  children: string
}) {
  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border bg-background-mid">
      {filename && (
        <div className="flex items-center gap-2 border-b border-border bg-white/2 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
          <span className="ml-2 font-mono text-xs text-white/30">
            {filename}
          </span>
        </div>
      )}
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-[1.8] text-foreground-dim">
        <code>{children}</code>
      </pre>
    </div>
  )
}
