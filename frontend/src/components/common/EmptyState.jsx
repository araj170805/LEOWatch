export default function EmptyState({ title = 'No data in this window', hint }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="h-10 w-10 rounded-full border border-line-bright mb-4 flex items-center justify-center">
        <span className="h-1.5 w-1.5 rounded-full bg-faint" />
      </div>
      <p className="text-sm text-dim">{title}</p>
      {hint && <p className="text-xs text-faint mt-1 max-w-xs">{hint}</p>}
    </div>
  );
}
