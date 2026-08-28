export default function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow text-[11px] mb-1.5">{eyebrow}</p>}
        <h1 className="font-display text-2xl md:text-3xl font-bold text-primary tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm md:text-[15px] text-dim mt-2 max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
