export default function HeroBackground() {
  const flowGradientH =
    'linear-gradient(90deg, transparent, rgb(var(--primary-soft-rgb)/0.95), transparent)'
  const flowGradientV =
    'linear-gradient(180deg, transparent, rgb(var(--primary-soft-rgb)/0.95), transparent)'
  const flowGlow =
    'drop-shadow(0 0 6px rgb(var(--primary-soft-rgb)/0.8)) drop-shadow(0 0 14px rgb(var(--primary-rgb)/0.5))'

  const horizontalFlows = [
    { top: 168, duration: 11, delay: 0 },
    { top: 336, duration: 14, delay: -5 },
    { top: 504, duration: 10, delay: -2 },
    { top: 672, duration: 13, delay: -7 },
    { top: 840, duration: 12, delay: -3 },
    { top: 1008, duration: 11, delay: -9 },
  ]

  const verticalFlows = [
    { left: 224, duration: 12, delay: -1 },
    { left: 560, duration: 14, delay: -6 },
    { left: 896, duration: 11, delay: -3 },
    { left: 1232, duration: 13, delay: -8 },
  ]

  return (
    <>
      <style>{`
        @keyframes flow-h {
          from { transform: translateX(-320px); }
          to { transform: translateX(calc(100vw + 320px)); }
        }
        @keyframes flow-v {
          from { transform: translateY(-320px); }
          to { transform: translateY(calc(110vh + 320px)); }
        }
      `}</style>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[110vh] overflow-hidden mask-[radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
      >
        {/* Static grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        {horizontalFlows.map((f) => (
          <span
            key={`h-${f.top}`}
            className="absolute left-0 h-px w-72"
            style={{
              top: f.top,
              background: flowGradientH,
              filter: flowGlow,
              animation: `flow-h ${f.duration}s linear ${f.delay}s infinite`,
            }}
          />
        ))}

        {verticalFlows.map((f) => (
          <span
            key={`v-${f.left}`}
            className="absolute top-0 h-72 w-px"
            style={{
              left: f.left,
              background: flowGradientV,
              filter: flowGlow,
              animation: `flow-v ${f.duration}s linear ${f.delay}s infinite`,
            }}
          />
        ))}
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-10%] z-0 h-120 w-205 -translate-x-1/2 rounded-full opacity-50 blur-[140px]"
        style={{
          background:
            'radial-gradient(circle, rgb(var(--primary-rgb) / 0.32), transparent 70%)',
        }}
      />
    </>
  )
}
