import { useState } from 'react';
import Card from './Card.jsx';
import { apiPost } from '../../lib/api.js';
import { formatDateTime, countdownFrom } from '../../utils/formatTime.js';

const LEVEL_STYLES = {
  LOW: 'text-emerald-400',
  MEDIUM: 'text-amber-400',
  HIGH: 'text-red-400',
  CRITICAL: 'text-red-500',
};

const FACTOR_LABELS = {
  miss_distance: 'MISS DISTANCE',
  relative_velocity: 'RELATIVE VELOCITY',
  time_to_tca: 'TIME TO TCA',
  object_type: 'OBJECT TYPE',
};

function Bar({ value }) {
  const filled = Math.round((value || 0) * 10);
  return (
    <span className="font-mono text-[11px] tracking-tight text-track">
      {'█'.repeat(filled)}
      <span className="text-line">{'░'.repeat(10 - filled)}</span>
    </span>
  );
}

/**
 * Detailed, explainable risk card. Numbers come from the backend engine
 * (event.risk_score / risk_factors). Gemini is only used, on click, to
 * explain *why* the event matters — never to compute anything.
 */
export default function RiskFactorCard({ event, onFlyToTca }) {
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const factors = event.risk_factors || {};
  const score = event.risk_score ?? '—';
  const level = event.risk || 'UNKNOWN';

  async function explain() {
    if (aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const data = await apiPost('/chat', {
        question: 'Why is this conjunction important and how should it be interpreted?',
        event,
      });
      setAi(data.answer);
    } catch {
      setAiError('AI service temporarily unavailable.');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <Card title="Risk Priority" eyebrow="HEURISTIC RANKING">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-mono text-3xl font-bold text-primary">{score}</span>
        <span className="font-mono text-xs text-faint">/ 100</span>
        <span className={`font-mono text-sm font-bold ml-auto ${LEVEL_STYLES[level] || 'text-dim'}`}>{level}</span>
      </div>
      <p className="text-[10px] text-faint mb-4">
        {event.risk_method || 'Operational heuristic risk ranking — not formal Probability of Collision (Pc).'}
      </p>

      <div className="space-y-2 mb-4">
        {Object.entries(FACTOR_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] text-faint w-32">{label}</span>
            <Bar value={factors[key]} />
          </div>
        ))}
      </div>

      <dl className="space-y-1.5 text-xs border-t border-line/60 pt-3 mb-4">
        <div className="flex justify-between"><dt className="text-faint">TCA</dt><dd className="font-mono text-primary">{formatDateTime(event.tca)} · T-{countdownFrom(event.tca)}</dd></div>
        <div className="flex justify-between"><dt className="text-faint">Miss distance</dt><dd className="font-mono text-track">{Number(event.minimum_distance_km).toFixed(2)} km</dd></div>
        <div className="flex justify-between"><dt className="text-faint">Rel. velocity</dt><dd className="font-mono text-dim">{event.relative_velocity_km_s != null ? `${Number(event.relative_velocity_km_s).toFixed(1)} km/s` : '—'}</dd></div>
      </dl>

      <div className="flex gap-2 mb-3">
        <button
          onClick={onFlyToTca}
          className="flex-1 text-xs font-mono border border-track/40 text-track rounded-lg py-2 hover:bg-track/10 transition-colors"
        >
          Fly to TCA (3D) →
        </button>
        <button
          onClick={explain}
          disabled={aiLoading}
          className="flex-1 text-xs font-mono border border-indigo-500/40 text-indigo-300 rounded-lg py-2 hover:bg-indigo-500/10 transition-colors disabled:opacity-50"
        >
          {aiLoading ? 'Asking AI…' : 'Why it matters'}
        </button>
      </div>

      {aiError && <p className="text-[11px] text-red-400">{aiError}</p>}
      {ai && (
        <div className="text-xs text-dim leading-relaxed bg-void/60 rounded-xl p-3 border border-white/5 max-h-52 overflow-y-auto">
          <p className="font-mono text-[9px] text-faint mb-1.5 uppercase tracking-wider">AI explanation · Gemini · grounded on engine output</p>
          {ai}
        </div>
      )}
    </Card>
  );
}
