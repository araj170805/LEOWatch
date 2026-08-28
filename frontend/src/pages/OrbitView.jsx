import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CesiumViewer from '../components/viewer/CesiumViewer.jsx';
import { useMission } from '../context/MissionContext.jsx';
import { apiGet } from '../lib/api.js';
import { SEED_CATALOG } from '../lib/seed.js';
import { formatDateTime, countdownFrom } from '../utils/formatTime.js';

const DEFAULT_CATALOG = SEED_CATALOG;

const HORIZON_OPTIONS = [
  { hours: 24, stepMinutes: 5, label: '24H' },
  { hours: 12, stepMinutes: 3, label: '12H' },
  { hours: 6, stepMinutes: 1, label: '6H' },
];

const RISK_STYLES = {
  LOW: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  HIGH: 'text-red-400 bg-red-500/15 border-red-500/40',
  CRITICAL: 'text-red-500 bg-red-500/20 border-red-500/60 font-bold animate-pulse',
};

export default function OrbitView() {
  const { forecast, events, selectedEvent, loading, error, runScreening, selectEvent, clearError } = useMission();

  const [catalog, setCatalog] = useState(DEFAULT_CATALOG);
  const [selectedIds, setSelectedIds] = useState([25544, 43013]);
  const [horizonHours, setHorizonHours] = useState(24);

  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);

  // Unified add-by-name / add-by-NORAD-id search
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const debounceRef = useRef(null);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.minimum_distance_km - b.minimum_distance_km),
    [events]
  );
  const objectsForViewer = forecast?.objects || [];

  const didAutoRun = useRef(false);
  useEffect(() => {
    if (didAutoRun.current) return;
    didAutoRun.current = true;
    if (objectsForViewer.length === 0 && !loading) runScreening([25544, 43013], 24, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced catalog search (name OR NORAD id).
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const term = search.trim();
    if (!term) { setResults([]); setSearchError(''); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const data = await apiGet(`/catalog?q=${encodeURIComponent(term)}&page_size=12`);
        let rows = (data.objects || []).map((o) => ({ noradId: o.norad_id, name: o.name, type: o.type }));
        // Pure NORAD id not in the grouped catalog? resolve it directly.
        if (rows.length === 0 && /^\d{1,6}$/.test(term)) {
          const obj = await apiGet(`/object/${term}`);
          rows = [{ noradId: obj.norad_id, name: obj.name, type: obj.type }];
        }
        setResults(rows);
        if (rows.length === 0) setSearchError('No object found.');
      } catch {
        setResults([]);
        setSearchError('No object found for that name or NORAD ID.');
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  function toggle(id) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function addObject(obj) {
    setCatalog((prev) => (prev.some((o) => o.noradId === obj.noradId) ? prev : [...prev, { ...obj, custom: true }]));
    setSelectedIds((prev) => (prev.includes(obj.noradId) ? prev : [...prev, obj.noradId]));
    setSearch('');
    setResults([]);
  }

  function removeObject(noradId) {
    setCatalog((prev) => prev.filter((o) => o.noradId !== noradId));
    setSelectedIds((prev) => prev.filter((id) => id !== noradId));
  }

  function handleRun() {
    if (selectedIds.length < 2) return;
    clearError();
    const h = HORIZON_OPTIONS.find((x) => x.hours === horizonHours);
    runScreening(selectedIds, h.hours, h.stepMinutes);
  }

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] min-h-[650px] overflow-hidden bg-[#050816]">
      <div className="absolute inset-0 z-0">
        <CesiumViewer objects={objectsForViewer} selectedEvent={selectedEvent} />

        {objectsForViewer.length === 0 && !loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#050816]/40 backdrop-blur-[2px] pointer-events-none z-10">
            <div className="h-14 w-14 rounded-2xl bg-[#0b1026]/90 border border-[rgba(0,240,255,0.2)] flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(0,240,255,0.2)]">🌍</div>
            <p className="font-mono text-xs text-white text-center px-6 max-w-sm bg-[#050816]/80 p-3 rounded-xl border border-[rgba(0,240,255,0.15)]">
              Select at least two objects and click <span className="text-[#00f0ff] font-bold">RUN SCREENING</span>.
            </p>
          </div>
        )}

        {loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 font-mono text-xs text-[#00f0ff] border border-[rgba(0,240,255,0.4)] bg-[#050816]/90 backdrop-blur-md px-4 py-2 rounded-xl animate-pulse z-20 shadow-lg">
            ⚡ PROPAGATING ORBITAL TRAJECTORIES…
          </div>
        )}

        {error && !loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 max-w-md text-center font-mono text-xs text-red-300 border border-red-500/40 bg-[#050816]/95 backdrop-blur-md px-4 py-3 rounded-xl shadow-lg">
            <p className="font-bold text-red-400 mb-1">SCREENING FAILED</p>
            <p className="text-slate-300">{String(error?.message || error)}</p>
            <button onClick={handleRun} className="mt-2 border border-[rgba(0,240,255,0.4)] text-[#00f0ff] rounded-lg px-3 py-1 hover:bg-[rgba(0,240,255,0.1)] transition-colors">Retry</button>
          </div>
        )}
      </div>

      {/* ── Left: Object selection ── */}
      <div className="absolute top-4 left-4 z-20">
        {!isLeftOpen ? (
          <button onClick={() => setIsLeftOpen(true)} className="flex items-center gap-2 font-mono text-xs text-[#00f0ff] bg-[#0b1026]/90 border border-[rgba(0,240,255,0.3)] backdrop-blur-xl px-3.5 py-2 rounded-xl shadow-xl hover:bg-[rgba(0,240,255,0.15)] transition-all">
            <span>🛰️ Objects ({selectedIds.length})</span><span>›</span>
          </button>
        ) : (
          <div className="w-72 max-h-[calc(100vh-6rem)] overflow-y-auto border border-[rgba(0,240,255,0.25)] bg-[#0b1026]/92 backdrop-blur-2xl rounded-2xl p-3 shadow-2xl space-y-2.5">
            <div className="flex items-center justify-between border-b border-[rgba(0,240,255,0.15)] pb-2">
              <div>
                <p className="font-mono text-[10px] text-[#00f0ff] tracking-[0.2em] uppercase font-bold">ORBITAL SELECTION</p>
                <h2 className="text-xs font-bold text-white">Satellites &amp; Debris ({selectedIds.length})</h2>
              </div>
              <button onClick={() => setIsLeftOpen(false)} className="h-6 w-6 rounded-lg border border-[rgba(0,240,255,0.2)] text-[#00f0ff] hover:bg-[rgba(0,240,255,0.1)] flex items-center justify-center text-xs">‹</button>
            </div>

            {/* Add by name or NORAD id */}
            <div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Add by name or NORAD ID…"
                className="w-full bg-[#050816] border border-[rgba(0,240,255,0.25)] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-[#00f0ff]"
              />
              {(searching || searchError || results.length > 0) && (
                <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[rgba(0,240,255,0.15)] bg-[#050816]/90 divide-y divide-white/5">
                  {searching && <p className="px-2.5 py-1.5 text-[11px] font-mono text-slate-400 animate-pulse">Searching…</p>}
                  {!searching && searchError && <p className="px-2.5 py-1.5 text-[11px] font-mono text-red-400">{searchError}</p>}
                  {results.map((r) => {
                    const added = catalog.some((o) => o.noradId === r.noradId);
                    return (
                      <button
                        key={r.noradId}
                        onClick={() => !added && addObject(r)}
                        disabled={added}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 text-left hover:bg-[rgba(0,240,255,0.08)] transition-colors disabled:opacity-50"
                      >
                        <span className="text-[11px] text-white truncate max-w-[150px]">{r.name}</span>
                        <span className="font-mono text-[9px] text-slate-400">{added ? 'added' : `+ ${r.noradId}`}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected / available list */}
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              {catalog.map((obj) => {
                const active = selectedIds.includes(obj.noradId);
                return (
                  <div key={obj.noradId} className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggle(obj.noradId)}
                      className={[
                        'flex-1 flex items-center justify-between text-left px-2.5 py-1.5 rounded-lg border transition-all text-xs',
                        active
                          ? 'border-[rgba(0,240,255,0.5)] bg-[rgba(0,240,255,0.12)] text-white font-semibold'
                          : 'border-[rgba(255,255,255,0.08)] bg-[#050816]/60 text-slate-300 hover:text-white hover:border-[rgba(0,240,255,0.3)]',
                      ].join(' ')}
                    >
                      <span className="truncate max-w-[150px]">{obj.name}</span>
                      <span className="flex items-center gap-1 shrink-0">
                        <span className="font-mono text-[9px] text-slate-400">{obj.noradId}</span>
                        {active && <span className="text-[#00f0ff] text-[10px]">●</span>}
                      </span>
                    </button>
                    {obj.custom && (
                      <button onClick={() => removeObject(obj.noradId)} className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-red-400 rounded-lg text-xs">✕</button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Window */}
            <div className="space-y-1">
              <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Window</p>
              <div className="flex rounded-lg border border-[rgba(0,240,255,0.2)] overflow-hidden">
                {HORIZON_OPTIONS.map((h) => (
                  <button
                    key={h.hours}
                    onClick={() => setHorizonHours(h.hours)}
                    className={[
                      'flex-1 py-1 text-xs font-mono transition-all',
                      horizonHours === h.hours ? 'bg-[#00f0ff] text-[#050816] font-bold' : 'text-slate-300 hover:bg-[rgba(0,240,255,0.1)]',
                    ].join(' ')}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              disabled={loading || selectedIds.length < 2}
              onClick={handleRun}
              className="w-full bg-gradient-to-r from-[#00f0ff] to-[#3b82f6] text-[#050816] font-bold text-xs rounded-lg py-2 shadow-[0_0_20px_rgba(0,240,255,0.3)] disabled:opacity-40 transition-all hover:scale-[1.02]"
            >
              {loading ? 'PROPAGATING…' : 'RUN SCREENING'}
            </button>
          </div>
        )}
      </div>

      {/* ── Right: Conjunction alerts (compact) ── */}
      <div className="absolute top-16 right-4 z-20">
        {!isRightOpen ? (
          <button onClick={() => setIsRightOpen(true)} className="flex items-center gap-2 font-mono text-xs text-[#00f0ff] bg-[#0b1026]/90 border border-[rgba(0,240,255,0.3)] backdrop-blur-xl px-3.5 py-2 rounded-xl shadow-xl hover:bg-[rgba(0,240,255,0.15)] transition-all">
            <span>‹ ⚠️ Alerts ({sortedEvents.length})</span>
          </button>
        ) : (
          <div className="w-72 max-h-[calc(100vh-6rem)] overflow-y-auto border border-[rgba(0,240,255,0.25)] bg-[#0b1026]/92 backdrop-blur-2xl rounded-2xl p-3 shadow-2xl space-y-2.5">
            <div className="flex items-center justify-between border-b border-[rgba(0,240,255,0.15)] pb-2">
              <div>
                <p className="font-mono text-[10px] text-[#00f0ff] tracking-[0.2em] uppercase font-bold">CONJUNCTION ALERTS</p>
                <h2 className="text-xs font-bold text-white">Close Encounters ({sortedEvents.length})</h2>
              </div>
              <button onClick={() => setIsRightOpen(false)} className="h-6 w-6 rounded-lg border border-[rgba(0,240,255,0.2)] text-[#00f0ff] hover:bg-[rgba(0,240,255,0.1)] flex items-center justify-center text-xs">›</button>
            </div>

            <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
              {sortedEvents.length === 0 && !loading && (
                <p className="font-mono text-[11px] text-slate-400 text-center py-3">No active events — run screening.</p>
              )}
              {sortedEvents.map((ev) => {
                const active = selectedEvent === ev;
                return (
                  <button
                    key={`${ev.object_a?.norad_id}-${ev.object_b?.norad_id}-${ev.tca}`}
                    onClick={() => selectEvent(ev)}
                    className={[
                      'w-full text-left px-2 py-1.5 rounded-lg border transition-all text-xs',
                      active ? 'border-[#00f0ff] bg-[rgba(0,240,255,0.12)] text-white' : 'border-[rgba(255,255,255,0.08)] bg-[#050816]/60 text-slate-300 hover:border-[rgba(0,240,255,0.3)]',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white truncate">{ev.object_a?.name} × {ev.object_b?.name}</span>
                      <span className={`shrink-0 border rounded px-1 py-0.5 text-[9px] font-mono ${RISK_STYLES[ev.risk] || ''}`}>{ev.risk}</span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 mt-0.5 flex justify-between">
                      <span>{Number(ev.minimum_distance_km).toFixed(1)} km</span>
                      <span>T-{countdownFrom(ev.tca)}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedEvent && (
              <div className="border-t border-[rgba(0,240,255,0.15)] pt-2">
                <p className="font-mono text-[10px] text-[#00f0ff] tracking-[0.15em] uppercase font-bold mb-1.5">TELEMETRY</p>
                <dl className="text-[11px] font-mono space-y-1">
                  <div className="flex justify-between"><dt className="text-slate-400">A</dt><dd className="text-white truncate max-w-[180px]">{selectedEvent.object_a?.name}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">B</dt><dd className="text-white truncate max-w-[180px]">{selectedEvent.object_b?.name}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">TCA</dt><dd className="text-white">{formatDateTime(selectedEvent.tca)} · T-{countdownFrom(selectedEvent.tca)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Min sep</dt><dd className="font-bold text-[#00f0ff]">{Number(selectedEvent.minimum_distance_km).toFixed(2)} km</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Rel vel</dt><dd className="text-slate-200">{selectedEvent.relative_velocity_km_s != null ? `${Number(selectedEvent.relative_velocity_km_s).toFixed(1)} km/s` : '—'}</dd></div>
                  <div className="flex justify-between items-center"><dt className="text-slate-400">Risk</dt><dd><span className={`border rounded px-1.5 py-0.5 text-[10px] ${RISK_STYLES[selectedEvent.risk] || ''}`}>{selectedEvent.risk_score ?? '—'} · {selectedEvent.risk}</span></dd></div>
                </dl>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
