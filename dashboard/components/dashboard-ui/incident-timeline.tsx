export function IncidentTimeline({
  items,
}: {
  items: Array<{ time: string; title: string; detail: string; tone: "green" | "amber" | "red" | "blue" }>;
}) {
  const toneClasses: Record<"green" | "amber" | "red" | "blue", string> = {
    green: "bg-teal-500 shadow-[0_0_0_1px_hsl(var(--teal)),0_0_12px_hsl(var(--teal)/0.45)]",
    amber: "bg-amber-500 shadow-[0_0_0_1px_hsl(var(--amber)),0_0_12px_hsl(var(--amber)/0.45)]",
    red: "bg-crimson-500 shadow-[0_0_0_1px_hsl(var(--crimson)),0_0_12px_hsl(var(--crimson)/0.45)]",
    blue: "bg-primary shadow-[0_0_0_1px_hsl(var(--primary)),0_0_12px_hsl(var(--primary)/0.45)]",
  };

  return (
    <div className="relative pl-8 before:absolute before:bottom-1.5 before:left-[7px] before:top-1.5 before:w-px before:bg-border before:content-['']">
      {items.map((item) => (
        <div key={`${item.time}-${item.title}`} className="relative pb-4 last:pb-0">
          <span className={`absolute -left-8 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background ${toneClasses[item.tone]}`} />
          <div className="font-mono text-[11.5px] tracking-[0.04em] text-muted-foreground">{item.time}</div>
          <div className="mt-0.5 text-[13px] font-medium text-foreground">{item.title}</div>
          <div className="mt-1 font-mono text-[12.5px] text-muted-foreground">{item.detail}</div>
        </div>
      ))}
    </div>
  );
}
