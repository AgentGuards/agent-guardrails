import ArchitectureFlowSection from './components/architecture-flow-section'
import CodeExampleSection from './components/code-example-section'
import DefenseBentoSection from './components/defense-bento-section'
import FaqSection from './components/faq-section'
import type { FaqItem } from './components/faq-section'
import FinalCtaSection from './components/final-cta-section'
import GlowLine from './components/glow-line'
import HeroBackground from './components/hero-background'
import HeroSection from './components/hero-section'
import HowItWorksSection from './components/how-it-works-section'
import ProblemSection from './components/problem-section'
import SiteFooter from './components/site-footer'
import SiteHeader from './components/site-header'
import SocialProofBar from './components/social-proof-bar'
import TerminalDemoSection from './components/terminal-demo-section'

const faqItems: FaqItem[] = [
  {
    question: 'What happens if the monitoring server goes down?',
    answer:
      'On-chain protections (allow-lists, budgets) are enforced by the Solana program itself and work independently. The AI monitoring layer adds behavioral analysis on top, but core limits never depend on off-chain availability.',
  },
  {
    question: 'Does my agent need to change its logic?',
    answer: (
      <>
        No. Replace your raw transaction call with{' '}
        <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs">
          guard.execute()
        </code>
        . The SDK wraps your existing instructions. Your agent logic stays
        exactly the same.
      </>
    ),
  },
  {
    question: 'Can the agent access the treasury directly?',
    answer: (
      <>
        No. Funds are held in a policy-owned PDA. The agent&apos;s keypair can
        only sign{' '}
        <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs">
          guarded_execute
        </code>{' '}
        instructions — it never has direct access to the SOL.
      </>
    ),
  },
  {
    question: 'Which programs can I whitelist?',
    answer:
      'Any Solana program. Common choices: Jupiter (swaps), Marinade (staking), Drift (perps), Raydium (AMM). The policy owner can update the whitelist at any time.',
  },
  {
    question: 'How does the AI kill switch decide to pause?',
    answer:
      "Guardian Agent evaluates flagged transactions against the agent's policy, recent history, and anomaly signals (burst frequency, new programs, unusual amounts). It returns ALLOW, FLAG, or PAUSE with a confidence score.",
  },
  {
    question: 'Is the program audited?',
    answer:
      'The program is open source and built with Anchor 0.30.1. The on-chain logic is fully inspectable. Community audits are in progress as part of the Solana Frontier hackathon.',
  },
  {
    question: "What's the latency overhead?",
    answer:
      'The on-chain policy check adds ~2ms to transaction processing (one extra CPI). The AI monitoring is asynchronous and does not add latency to the transaction itself.',
  },
  {
    question: 'Can I use this with multisig?',
    answer:
      'Yes. High-value transactions can be escalated to a Squads v4 multisig for human approval before execution, adding an extra authorization layer for critical operations.',
  },
]

export default function Home() {
  return (
    <main className="relative overflow-x-hidden bg-[radial-gradient(circle_at_top,rgb(var(--primary-rgb)/0.18),transparent_32%),linear-gradient(180deg,var(--background-deep)_0%,var(--background-mid)_48%,var(--background)_100%)] text-foreground">
      <HeroBackground />
      <SiteHeader />
      <HeroSection />
      <SocialProofBar />
      <ProblemSection />
      <GlowLine />
      <HowItWorksSection />
      <DefenseBentoSection />
      <GlowLine />
      <CodeExampleSection />
      <ArchitectureFlowSection />
      <GlowLine />
      <TerminalDemoSection />
      <FaqSection items={faqItems} />
      <FinalCtaSection />
      <SiteFooter />
    </main>
  )
}
