import Image from 'next/image'

const footerLinks = [
  { label: 'GitHub', href: 'https://github.com/AgentGuards/agent-guardrails' },
  { label: 'Documentation', href: '/docs' },
  { label: 'Dashboard', href: '#' },
  { label: 'Twitter', href: 'https://x.com/whoisasx' },
]

export default function SiteFooter() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-4 px-6 text-sm text-white/40 sm:flex-row sm:items-center sm:px-10 lg:px-12">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt=""
            width={20}
            height={20}
            className="h-5 w-5 opacity-50"
          />
          <span>
            Agent Guardrails &middot; Solana Frontier Hackathon 2025
          </span>
        </div>
        <div className="flex gap-6">
          {footerLinks.map((link) => {
            const isExternal = link.href.startsWith('http')
            return (
              <a
                key={link.label}
                href={link.href}
                {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
                className="text-[13px] text-white/40 transition hover:text-foreground-dim"
              >
                {link.label}
              </a>
            )
          })}
        </div>
      </div>
    </footer>
  )
}
