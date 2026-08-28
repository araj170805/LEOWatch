import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import EmptyState from '../common/EmptyState.jsx';
import { formatDateTime, countdownFrom } from '../../utils/formatTime.js';
import { container, item } from '../../utils/motion.js';

const RISK_STYLES = {
  LOW: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  HIGH: 'text-red-400 bg-red-500/15 border-red-500/40',
  CRITICAL: 'text-red-500 bg-red-500/20 border-red-500/60 font-bold',
};

const COLUMNS = [
  { key: 'pair', label: 'Object Pair', sortable: false },
  { key: 'tca', label: 'TCA', sortable: true },
  { key: 'minimum_distance_km', label: 'Miss Distance', sortable: true },
  { key: 'relative_velocity_km_s', label: 'Rel. Velocity', sortable: true },
  { key: 'risk_score', label: 'Risk Priority', sortable: true },
];

/**
 * data: backend screening events. Deterministic engine computes every number;
 * `risk_score` is an operational heuristic ranking, NOT Probability of Collision.
 */
export default function ConjunctionTable({ data, onRowClick }) {
  const [sortKey, setSortKey] = useState('risk_score');
  const [sortDir, setSortDir] = useState('desc');
  const [riskFilter, setRiskFilter] = useState('ALL');

  const filtered = useMemo(
    () => (riskFilter === 'ALL' ? data : data.filter((c) => c.risk === riskFilter)),
    [data, riskFilter]
  );

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = sortKey === 'tca' ? new Date(a[sortKey]).getTime() : a[sortKey] ?? 0;
      const bv = sortKey === 'tca' ? new Date(b[sortKey]).getTime() : b[sortKey] ?? 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="font-mono text-[10px] tracking-[0.12em] text-faint mr-1">FILTER</span>
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((tier) => (
          <button
            key={tier}
            onClick={() => setRiskFilter(tier)}
            className={[
              'px-2.5 py-1 rounded-sm border text-[11px] font-mono uppercase transition-colors',
              riskFilter === tier
                ? 'border-track text-track bg-track/10'
                : 'border-line text-faint hover:text-dim hover:border-line-bright',
            ].join(' ')}
          >
            {tier}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <EmptyState title="No conjunctions in this window" hint="Widen the time window or clear the risk filter." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="border-b border-line text-left">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && toggleSort(col.key)}
                    className={`font-mono text-[10px] tracking-[0.12em] text-faint px-3 py-2.5 ${
                      col.sortable ? 'cursor-pointer select-none hover:text-dim' : ''
                    }`}
                  >
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span className="text-track ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <motion.tbody variants={container} initial="hidden" animate="show">
              {sorted.map((c, i) => (
                <motion.tr
                  key={`${c.object_a?.norad_id}-${c.object_b?.norad_id}-${i}`}
                  variants={item}
                  layout
                  whileHover={{ backgroundColor: 'rgba(24,33,48,0.55)' }}
                  onClick={() => onRowClick?.(c)}
                  className="border-b border-line/60 cursor-pointer"
                >
                  <td className="px-3 py-3">
                    <div className="text-primary">{c.object_a?.name}</div>
                    <div className="text-faint text-xs">× {c.object_b?.name}</div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">
                    <div className="text-primary">{formatDateTime(c.tca)}</div>
                    <div className="text-faint">T-{countdownFrom(c.tca)}</div>
                  </td>
                  <td className="px-3 py-3 font-mono tabular-nums">{Number(c.minimum_distance_km).toFixed(2)} km</td>
                  <td className="px-3 py-3 font-mono tabular-nums text-dim">
                    {c.relative_velocity_km_s != null ? `${Number(c.relative_velocity_km_s).toFixed(1)} km/s` : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] ${RISK_STYLES[c.risk] || ''}`}>
                      {c.risk_score ?? '—'} · {c.risk}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      )}
    </div>
  );
}
