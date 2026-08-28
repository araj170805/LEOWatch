import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageHeader from '../components/common/PageHeader.jsx';
import Card from '../components/common/Card.jsx';
import ObjectTable from '../components/tables/ObjectTable.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { apiGet } from '../lib/api.js';
import { container, item } from '../utils/motion.js';

const TYPES = ['ALL', 'PAYLOAD', 'DEBRIS', 'ROCKET BODY', 'UNKNOWN'];
const PAGE_SIZE = 100;

export default function Objects() {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [type, setType] = useState('ALL');
  const [sort, setSort] = useState('norad_id');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ objects: [], total: 0, total_unfiltered: 0, counts: {}, reachable: true });
  const [status, setStatus] = useState({ loading: true, error: null });
  const debounce = useRef(null);

  const fetchPage = useCallback(() => {
    setStatus({ loading: true, error: null });
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(PAGE_SIZE),
      sort,
      order,
      ...(type !== 'ALL' ? { type } : {}),
      ...(q.trim() ? { q: q.trim() } : {}),
    });
    apiGet(`/catalog?${qs}`)
      .then((d) =>
        setData({
          objects: d.objects || [],
          total: d.total || 0,
          total_unfiltered: d.total_unfiltered || 0,
          counts: d.counts || {},
          reachable: d.celestrak_reachable !== false,
        })
      )
      .then(() => setStatus({ loading: false, error: null }))
      .catch((err) => setStatus({ loading: false, error: err.message || 'Failed to load catalog' }));
  }, [page, sort, order, type, q]);

  // Refetch on page / sort / type change immediately; debounce the search box.
  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(fetchPage, q ? 350 : 0);
    return () => clearTimeout(debounce.current);
  }, [fetchPage, q]);

  function onSort(key) {
    if (sort === key) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSort(key); setOrder('asc'); }
    setPage(1);
  }

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const c = data.counts;

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <PageHeader
          eyebrow="LIVE CATALOG DATA"
          title="Objects & Debris"
          description="Full tracking catalog from CelesTrak GP data — space stations, recent launches, the GEO belt and the major tracked debris clouds. Type is classified from catalog group + name; TLE alone cannot confirm operational status."
        />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          ['TOTAL TRACKED', data.total_unfiltered],
          ['PAYLOADS', c.PAYLOAD ?? 0],
          ['DEBRIS', c.DEBRIS ?? 0],
          ['ROCKET BODIES', c['ROCKET BODY'] ?? 0],
        ].map(([label, n]) => (
          <div key={label} className="rounded-xl border border-[rgba(0,240,255,0.15)] bg-[rgba(5,8,22,0.5)] px-4 py-3">
            <p className="font-mono text-[9px] text-faint uppercase tracking-wider">{label}</p>
            <p className="font-display text-xl font-bold text-[#00f0ff] tabular-nums">
              {status.loading ? '…' : Number(n).toLocaleString()}
            </p>
          </div>
        ))}
      </motion.div>

      <motion.div variants={item}>
        <Card bodyClassName="p-4 md:p-5">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search by name or NORAD ID…"
              className="flex-1 bg-raised border border-line rounded-lg text-sm px-3 py-2 placeholder:text-faint focus:outline-none focus:border-track"
            />
            <div className="flex gap-1.5 overflow-x-auto">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => { setType(t); setPage(1); }}
                  className={[
                    'px-2.5 py-1 rounded-lg border text-[11px] font-mono uppercase whitespace-nowrap transition-colors',
                    type === t ? 'border-track text-track bg-track/10' : 'border-line text-faint hover:text-dim',
                  ].join(' ')}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {!data.reachable && (
            <p className="font-mono text-[11px] text-amber-400 mb-3">
              CelesTrak unreachable — showing last cached catalog snapshot.
            </p>
          )}

          {status.error ? (
            <EmptyState title="Catalog unavailable" hint={status.error} />
          ) : status.loading && data.objects.length === 0 ? (
            <p className="text-center text-dim font-mono text-xs py-10 animate-pulse">
              Fetching CelesTrak catalog…
            </p>
          ) : (
            <>
              <ObjectTable rows={data.objects} sort={sort} order={order} onSort={onSort} />
              <div className="flex items-center justify-between mt-4 font-mono text-[11px] text-faint">
                <span>
                  {data.total.toLocaleString()} match{data.total === 1 ? '' : 'es'} · page {page} / {pages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1 || status.loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="border border-line rounded-lg px-3 py-1 hover:text-primary hover:border-line-bright disabled:opacity-40 transition-colors"
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={page >= pages || status.loading}
                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    className="border border-line rounded-lg px-3 py-1 hover:text-primary hover:border-line-bright disabled:opacity-40 transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
