import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import EmptyState from '../common/EmptyState.jsx';
import { container, item } from '../../utils/motion.js';

const TYPE_STYLES = {
  PAYLOAD: 'text-track',
  DEBRIS: 'text-risk-high',
  'ROCKET BODY': 'text-risk-med',
  UNKNOWN: 'text-dim',
};

const FRESH_STYLES = {
  FRESH: 'text-emerald-400',
  AGING: 'text-amber-400',
  STALE: 'text-red-400',
  UNKNOWN: 'text-slate-500',
};

const TYPES = ['ALL', 'PAYLOAD', 'DEBRIS', 'ROCKET BODY', 'UNKNOWN'];

/**
 * data: [{ norad_id, name, type, tle_age_days, freshness, source }]
 * Rows link to /objects/:norad_id (Object Intelligence).
 */
export default function ObjectTable({ data, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState('norad_id');
  const navigate = useNavigate();

  useEffect(() => setQuery(initialQuery), [initialQuery]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = data.filter((o) => {
      const matchesQuery =
        q === '' || o.name.toLowerCase().includes(q) || String(o.norad_id).includes(q);
      const matchesType = typeFilter === 'ALL' || o.type === typeFilter;
      return matchesQuery && matchesType;
    });
    return [...rows].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'tle_age_days') return (a.tle_age_days ?? 1e9) - (b.tle_age_days ?? 1e9);
      return a.norad_id - b.norad_id;
    });
  }, [data, query, typeFilter, sortKey]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or NORAD ID…"
          className="flex-1 bg-raised border border-line rounded-sm text-sm px-3 py-2 placeholder:text-faint focus:outline-none focus:border-track"
        />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="bg-raised border border-line rounded-sm text-xs font-mono px-2 py-2 text-dim focus:outline-none focus:border-track"
        >
          <option value="norad_id">Sort: NORAD ID</option>
          <option value="name">Sort: Name</option>
          <option value="tle_age_days">Sort: TLE age</option>
        </select>
        <div className="flex gap-1.5 overflow-x-auto">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={[
                'px-2.5 py-1 rounded-sm border text-[11px] font-mono uppercase whitespace-nowrap transition-colors',
                typeFilter === t
                  ? 'border-track text-track bg-track/10'
                  : 'border-line text-faint hover:text-dim hover:border-line-bright',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No objects match your search" hint="Try a different name or NORAD ID." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-line text-left">
                {['Name', 'NORAD ID', 'Type', 'TLE Age', 'Data Freshness'].map((h) => (
                  <th key={h} className="font-mono text-[10px] tracking-[0.12em] text-faint px-3 py-2.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <motion.tbody variants={container} initial="hidden" animate="show">
              {filtered.map((o) => (
                <motion.tr
                  key={o.norad_id}
                  variants={item}
                  layout
                  whileHover={{ backgroundColor: 'rgba(24,33,48,0.55)' }}
                  onClick={() => navigate(`/objects/${o.norad_id}`)}
                  className="border-b border-line/60 cursor-pointer"
                >
                  <td className="px-3 py-3 text-primary">{o.name}</td>
                  <td className="px-3 py-3 font-mono text-xs text-dim">{o.norad_id}</td>
                  <td className={`px-3 py-3 font-mono text-xs uppercase ${TYPE_STYLES[o.type] ?? 'text-dim'}`}>
                    {o.type}
                  </td>
                  <td className="px-3 py-3 font-mono tabular-nums text-xs">
                    {o.tle_age_days != null ? `${o.tle_age_days.toFixed(1)} d` : '—'}
                  </td>
                  <td className={`px-3 py-3 font-mono text-xs ${FRESH_STYLES[o.freshness] ?? 'text-slate-500'}`}>
                    {o.freshness ?? 'UNKNOWN'}
                    {o.source && <span className="text-slate-500"> · {o.source === 'live' ? 'LIVE' : o.source.toUpperCase()}</span>}
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
