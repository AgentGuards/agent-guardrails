export default function GlowLine() {
  return (
    <>
      <style>{`
        @keyframes glow-slide {
          0% { left: -80px; }
          100% { left: 100%; }
        }
      `}</style>
      <div
        aria-hidden
        className="relative h-px w-full overflow-hidden"
      >
        <div className="absolute inset-0 bg-border" />
        <div
          className="absolute top-0 h-px w-20"
          style={{
            background:
              'linear-gradient(90deg, transparent, var(--primary), transparent)',
            animation: 'glow-slide 4s linear infinite',
          }}
        />
      </div>
    </>
  )
}
