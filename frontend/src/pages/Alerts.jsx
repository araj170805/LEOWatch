import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '../components/common/PageHeader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { apiGet } from '../lib/api.js';
import { useMission } from '../context/MissionContext.jsx';
import { formatDateTime, countdownFrom } from '../utils/formatTime.js';
import { container, item } from '../utils/motion.js';

const RISK_STYLES = {
  HIGH: 'text-red-400 bg-red-500/15 border-red-500/40',
  CRITICAL: 'text-red-500 bg-red-500/20 border-red-500/60',
};

export default function Alerts() {
  const { events, loading, error, runScreening } = useMission();
  const [dismissed, setDismissed] = useState(new Set());
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (events.length > 0) return;
    apiGet('/catalog')
      .then((data) => {
        const ids = (data.objects || []).map((o) => o.norad_id).slice(0, 6);
        if (ids.length >= 2) runScreening(ids, 24, 5);
      })
      .catch((err) => setLocalError(err.message || 'Failed to load catalog'));
    // eslint-disable-next-line
  }, []);

  const highRisk = events.filter((e) => e.risk === 'HIGH' || e.risk === 'CRITICAL');
  const visible = highRisk.filter((e) => !dismissed.has(`${e.object_a?.norad_id}-${e.object_b?.norad_id}-${e.tca}`));

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <PageHeader
          eyebrow="ACTION REQUIRED"
          title="High-Risk Alerts"
          description="Conjunctions the engine ranked HIGH or CRITICAL in the current screening window."
        />
      </motion.div>

      {loading && <p className="font-mono text-xs text-track animate-pulse">Screening catalog…</p>}
      {(localError || error) && !loading && (
        <motion.div variants={item}>
          <EmptyState title="Alerts unavailable" hint={localError || String(error?.message || error)} />
        </motion.div>
      )}

      {!loading && !localError && visible.length === 0 ? (
        <motion.div variants={item}>
          <EmptyState title="No active high-risk alerts" hint="No HIGH/CRITICAL conjunctions in the current window." />
        </motion.div>
      ) : (
        <motion.ul variants={container} initial="hidden" animate="show" className="space-y-3">
          <AnimatePresence>
            {visible.map((c) => {
              const key = `${c.object_a?.norad_id}-${c.object_b?.norad_id}-${c.tca}`;
              return (
                <motion.li
                  key={key}
                  variants={item}
                  exit={{ opacity: 0, x: 24, transition: { duration: 0.25 } }}
                  layout
                  className="border border-risk-high/30 bg-risk-high/[0.06] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`font-mono text-[11px] border rounded-md px-2 py-0.5 ${RISK_STYLES[c.risk] || ''}`}>
                        {c.risk_score ?? '—'} · {c.risk}
                      </span>
                      <span className="font-mono text-[11px] text-faint">
                        T-{countdownFrom(c.tca)} · TCA {formatDateTime(c.tca)}
                      </span>
                    </div>
                    <p className="text-sm text-primary">
                      {c.object_a?.name} <span className="text-faint">×</span> {c.object_b?.name}
                    </p>
                    <p className="font-mono text-xs text-dim mt-0.5">
                      Miss {Number(c.minimum_distance_km).toFixed(2)} km
                      {c.relative_velocity_km_s != null && ` · ${Number(c.relative_velocity_km_s).toFixed(1)} km/s`}
                    </p>
                  </div>
                  <button
                    onClick={() => setDismissed((prev) => new Set(prev).add(key))}
                    className="self-start sm:self-auto shrink-0 text-xs font-mono border border-line rounded-lg px-3 py-1.5 text-dim hover:text-primary hover:border-line-bright transition-colors"
                  >
                    Acknowledge
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}
    </motion.div>
  );
}
