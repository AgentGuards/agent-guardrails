const proofItems = [
  {
    label: (
      <>
        <strong className="text-white font-semibold">&lt; 3s</strong>
        &ensp;pause latency
      </>
    ),
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 opacity-60">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: (
      <>
        Built on <strong className="text-white font-semibold">Solana</strong>
      </>
    ),
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 opacity-60">
        <path
          d="M10 2l2.5 5 5.5.8-4 3.9 1 5.3L10 14.5 4.5 17l1-5.3-4-3.9 5.5-.8L10 2z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: (
      <>
        Powered by <strong className="text-white font-semibold">Guardian Agent</strong>
      </>
    ),
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 opacity-60">
        <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: (
      <>
        <strong className="text-white font-semibold">Solana Frontier</strong>
        &ensp;Hackathon
      </>
    ),
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 opacity-60">
        <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export default function SocialProofBar() {
  return (
    <div className="border-t border-b border-border bg-background-mid py-12">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-6 px-6 sm:gap-12 sm:px-10 lg:px-12">
        {proofItems.map((item, i) => (
          <div key={i} className="contents">
            {i > 0 && (
              <span className="hidden h-6 w-px bg-border sm:block" />
            )}
            <div className="flex items-center gap-2.5 whitespace-nowrap text-sm text-foreground-dim">
              {item.icon}
              <span>{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
