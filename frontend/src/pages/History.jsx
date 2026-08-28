import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import PageHeader from '../components/common/PageHeader.jsx';
import Card from '../components/common/Card.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { apiGet } from '../lib/api.js';
import { formatDateTime } from '../utils/formatTime.js';
import { container, item } from '../utils/motion.js';

const RISK_TEXT = {
  LOW: 'text-emerald-400', MEDIUM: 'text-amber-400', HIGH: 'text-red-400', CRITICAL: 'text-red-500',
};

export default function History() {
  const [state, setState] = useState({ loading: true, error: null, rows: [] });

  useEffect(() => {
    apiGet('/history')
      .then((rows) => setState({ loading: false, error: null, rows }))
      .catch((err) => setState({ loading: false, error: err.message || 'Failed to load history', rows: [] }));
  }, []);

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <PageHeader eyebrow="PERSONAL" title="Saved Analyses" description="Conjunction analyses you saved to your account." />
      </motion.div>
      <motion.div variants={item}>
        <Card bodyClassName="p-4 md:p-5">
          {state.loading && <p className="text-center text-dim font-mono text-xs py-10 animate-pulse">Loading…</p>}
          {state.error && !state.loading && <EmptyState title="Could not load history" hint={state.error} />}
          {!state.loading && !state.error && state.rows.length === 0 && (
            <EmptyState title="Nothing saved yet" hint="Save a conjunction analysis from the Conjunction Center." />
          )}
          {!state.loading && state.rows.length > 0 && (
            <ul className="divide-y divide-line/60">
              {state.rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm text-primary">{r.object_a_name} <span className="text-faint">×</span> {r.object_b_name}</p>
                    <p className="font-mono text-[11px] text-faint mt-0.5">
                      TCA {formatDateTime(r.tca)} · miss {Number(r.minimum_distance_km).toFixed(2)} km · saved {formatDateTime(r.created_at)}
                    </p>
                  </div>
                  <span className={`font-mono text-xs font-bold ${RISK_TEXT[r.risk] || 'text-dim'}`}>{r.risk}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
