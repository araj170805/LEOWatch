import AnimatedNumber from './AnimatedNumber.jsx';

export default function StatCard({ label, value, unit, accent = 'text-primary', footnote }) {
  return (
    <div className="surface p-5">
      <p className="eyebrow mb-2.5">{label}</p>
      <p className={`font-display text-[30px] leading-none font-semibold tracking-tight tabular-nums ${accent}`}>
        <AnimatedNumber value={value} />
        {unit && <span className="text-lg text-dim ml-1.5 font-sans font-medium">{unit}</span>}
      </p>
      {footnote && <p className="font-mono text-[10.5px] text-faint mt-2.5">{footnote}</p>}
    </div>
  );
}
