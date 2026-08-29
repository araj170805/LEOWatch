export default function Card({ title, eyebrow, action, children, className = '', bodyClassName = '' }) {
  return (
    <section className={`relative overflow-hidden rounded-xl surface ${className}`}>
      {(title || eyebrow || action) && (
        <div className="flex items-start justify-between gap-3 px-5 md:px-6 py-4 border-b border-line">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
            {title && (
              <h2 className="font-display text-[15px] font-semibold text-primary tracking-tight truncate">{title}</h2>
            )}
          </div>
          {action && <div className="shrink-0 mt-0.5">{action}</div>}
        </div>
      )}
      <div className={`p-5 md:p-6 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
