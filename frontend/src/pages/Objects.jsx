import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageHeader from '../components/common/PageHeader.jsx';
import Card from '../components/common/Card.jsx';
import ObjectTable from '../components/tables/ObjectTable.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { apiGet } from '../lib/api.js';
import { container, item } from '../utils/motion.js';

export default function Objects() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: true, refreshing: false, error: null, objects: [], label: '', live: 0 });

  const load = useCallback((isRefresh = false) => {
    setState((s) => ({ ...s, refreshing: isRefresh, loading: !isRefresh && s.objects.length === 0 }));
    apiGet('/catalog')
      .then((data) =>
        setState({
          loading: false,
          refreshing: false,
          error: null,
          objects: data.objects || [],
          label: data.data_label || '',
          live: data.live_count ?? 0,
        })
      )
      .catch((err) =>
        setState((s) => ({ ...s, loading: false, refreshing: false, error: err.message || 'Failed to load catalog' }))
      );
  }, []);

  useEffect(() => { load(false); }, [load]);

  const total = state.objects.length;

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <PageHeader
          eyebrow="LIVE CATALOG DATA"
          title="Objects & Debris"
          description="Tracked satellites, rocket bodies and debris from CelesTrak orbital elements (TLE). Object type is classified from catalog metadata — TLE data alone cannot confirm operational status. Click a row for Object Intelligence."
        />
      </motion.div>

      <motion.div variants={item}>
        <Card bodyClassName="p-4 md:p-5">
          {state.loading && (
            <p className="text-center text-dim font-mono text-xs py-10 animate-pulse">Fetching latest available orbital data from CelesTrak…</p>
          )}
          {state.error && !state.loading && total === 0 && (
            <EmptyState title="Catalog unavailable" hint={state.error} />
          )}
          {!state.loading && total > 0 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p className="font-mono text-[10px] text-faint uppercase tracking-wider">
                  {state.label} · <span className="text-track">{state.live}/{total} live</span>
                  {state.live < total && ' · remainder from cached / bundled elements'}
                </p>
                <button
                  onClick={() => load(true)}
                  disabled={state.refreshing}
                  className="text-[11px] font-mono border border-track/40 text-track rounded-lg px-3 py-1.5 hover:bg-track/10 transition-colors disabled:opacity-50"
                >
                  {state.refreshing ? 'Refreshing…' : 'Refresh live data'}
                </button>
              </div>
              {state.error && (
                <p className="font-mono text-[11px] text-amber-400 mb-2">Live refresh failed: {state.error}. Showing last known data.</p>
              )}
              <ObjectTable data={state.objects} initialQuery={params.get('q') || ''} />
            </>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
