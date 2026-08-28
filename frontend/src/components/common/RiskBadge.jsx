import { RISK_META, tierFromScore } from '../../utils/riskColor.js';

// score: 0-100. If tier is not passed explicitly, it's derived from score.
export default function RiskBadge({ score, tier, showScore = true, pulse = false }) {
  const t = tier ?? tierFromScore(score);
  const meta = RISK_META[t];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[11px] tracking-wide ${meta.bg} ${meta.border} ${meta.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} ${pulse && t === 'high' ? 'animate-pulse_dot' : ''}`} />
      {meta.label}
      {showScore && typeof score === 'number' && <span className="text-primary/70">· {score}</span>}
    </span>
  );
}
