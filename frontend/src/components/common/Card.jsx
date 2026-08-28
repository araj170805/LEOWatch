export default function Card({ title, eyebrow, action, children, className = '', bodyClassName = '', accent = true }) {
  return (
    <section
      className={`group relative overflow-hidden rounded-2xl backdrop-blur-xl shadow-panel glass-panel-hover ${className}`}
      style={{ background: 'rgba(5, 8, 22, 0.55)', border: '1px solid rgba(0, 240, 255, 0.18)' }}
    >
      {accent && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00f0ff]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
      {(title || eyebrow || action) && (
        <div className="relative z-10 flex items-start justify-between gap-3 px-5 md:px-6 py-4 border-b border-[rgba(0,240,255,0.12)]">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow text-[10px] mb-1">{eyebrow}</p>}
            {title && (
              <h2 className="font-display text-lg font-semibold text-primary tracking-tight truncate">{title}</h2>
            )}
          </div>
          {action && <div className="shrink-0 mt-0.5">{action}</div>}
        </div>
      )}
      <div className={`relative z-10 p-5 md:p-6 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
