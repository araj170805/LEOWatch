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

const COLS = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'norad_id', label: 'NORAD ID', sortable: true },
  { key: 'type', label: 'Type', sortable: false },
  { key: 'altitude_km', label: 'Altitude', sortable: true },
  { key: 'inclination_deg', label: 'Inclination', sortable: true },
  { key: 'tle_age_days', label: 'TLE Age', sortable: true },
  { key: 'freshness', label: 'Freshness', sortable: false },
];

/**
 * Presentational. `rows` is already the current server page.
 * Sorting is server-side via onSort(key).
 */
export default function ObjectTable({ rows, sort, order, onSort }) {
  const navigate = useNavigate();

  if (!rows.length) {
    return <EmptyState title="No objects match" hint="Try a different search, type or group." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="border-b border-line text-left">
            {COLS.map((c) => (
              <th
                key={c.key}
                onClick={() => c.sortable && onSort(c.key)}
                className={`font-mono text-[10px] tracking-[0.12em] text-faint px-3 py-2.5 ${
                  c.sortable ? 'cursor-pointer select-none hover:text-dim' : ''
                }`}
              >
                {c.label}
                {c.sortable && sort === c.key && (
                  <span className="text-track ml-1">{order === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <motion.tbody variants={container} initial="hidden" animate="show">
          {rows.map((o) => (
            <motion.tr
              key={o.norad_id}
              variants={item}
              whileHover={{ backgroundColor: 'rgba(24,33,48,0.55)' }}
              onClick={() => navigate(`/objects/${o.norad_id}`)}
              className="border-b border-line/60 cursor-pointer"
            >
              <td className="px-3 py-2.5 text-primary">{o.name}</td>
              <td className="px-3 py-2.5 font-mono text-xs text-dim">{o.norad_id}</td>
              <td className={`px-3 py-2.5 font-mono text-xs uppercase ${TYPE_STYLES[o.type] ?? 'text-dim'}`}>{o.type}</td>
              <td className="px-3 py-2.5 font-mono tabular-nums text-xs">{o.altitude_km != null ? `${o.altitude_km.toLocaleString()} km` : '—'}</td>
              <td className="px-3 py-2.5 font-mono tabular-nums text-xs">{o.inclination_deg != null ? `${o.inclination_deg}°` : '—'}</td>
              <td className="px-3 py-2.5 font-mono tabular-nums text-xs">{o.tle_age_days != null ? `${o.tle_age_days.toFixed(1)} d` : '—'}</td>
              <td className={`px-3 py-2.5 font-mono text-xs ${FRESH_STYLES[o.freshness] ?? 'text-slate-500'}`}>{o.freshness ?? 'UNKNOWN'}</td>
            </motion.tr>
          ))}
        </motion.tbody>
      </table>
    </div>
  );
}
