import ArchitectureSection from './components/architecture-section'
import DefenseLayersSection from './components/defense-layers-section'
import HeroBackground from './components/hero-background'
import HeroSection from './components/hero-section'
import ProblemSection from './components/problem-section'
import SiteFooter from './components/site-footer'
import SiteHeader from './components/site-header'

const guardrailLayers = [
  {
    id: '01',
    title: 'Program allow-listing',
    copy: 'Every agent transaction is constrained to approved Solana programs only. Unknown destinations never get execution rights.',
  },
  {
    id: '02',
    title: 'Spending budgets',
    copy: 'Per-transaction ceilings and rolling daily limits stop treasury drain attempts before they become catastrophic.',
  },
  {
    id: '03',
    title: 'AI kill switch',
    copy: 'Realtime monitoring evaluates behavior, flags anomalies, and can pause an agent on-chain in under three seconds.',
  },
]

const operatingFlow = [
  'Agent signs intent',
  'Guardrails PDA validates policy',
  'Approved CPI reaches target program',
  'Helius streams events to the monitor',
  'Claude judges anomalies and can trigger PAUSE',
]

export default function Home() {
  return (
    <main className="relative overflow-x-hidden bg-[radial-gradient(circle_at_top,rgb(var(--primary-rgb)/0.18),transparent_32%),linear-gradient(180deg,var(--background-deep)_0%,var(--background-mid)_48%,var(--background)_100%)] text-foreground">
      <HeroBackground />
      <SiteHeader />
      <HeroSection />
      <ProblemSection />
      <DefenseLayersSection guardrailLayers={guardrailLayers} />
      <ArchitectureSection operatingFlow={operatingFlow} />
      <SiteFooter />
    </main>
  )
}
