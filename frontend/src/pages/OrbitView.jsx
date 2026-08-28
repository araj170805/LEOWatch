import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CesiumViewer from '../components/viewer/CesiumViewer.jsx';
import { useMission } from '../context/MissionContext.jsx';
import { formatDateTime, countdownFrom } from '../utils/formatTime.js';

const DEFAULT_CATALOG = [
  { noradId: 25544, name: 'ISS (ZARYA)' },
  { noradId: 43013, name: 'NOAA 20' },
  { noradId: 48274, name: 'STARLINK-3012' },
  { noradId: 44714, name: 'STARLINK-1130' },
  { noradId: 37820, name: 'SL-16 R/B' },
  { noradId: 22675, name: 'COSMOS 2251 DEB' },
  { noradId: 28654, name: 'IRIDIUM 33 DEB' },
];

const HORIZON_OPTIONS = [
  { hours: 24, stepMinutes: 1, label: '24H' },
  { hours: 12, stepMinutes: 1, label: '12H' },
  { hours: 6, stepMinutes: 1, label: '6H' },
];

const RISK_STYLES = {
  LOW: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  HIGH: 'text-red-400 bg-red-500/15 border-red-500/40',
  CRITICAL: 'text-red-500 bg-red-500/20 border-red-500/60 font-bold animate-pulse',
};

export default function OrbitView() {
  const {
    forecast,
    events,
    selectedEvent,
    loading,
    error,
    runScreening,
    selectEvent,
    clearError,
  } = useMission();

  const [catalog, setCatalog] = useState(DEFAULT_CATALOG);
  const [selectedIds, setSelectedIds] = useState([25544, 43013]);
  const [horizonHours, setHorizonHours] = useState(24);

  // Panel collapse states
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);

  // Custom object input state
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customNoradId, setCustomNoradId] = useState('');
  const [customName, setCustomName] = useState('');
  const [customError, setCustomError] = useState('');

  const isOffline = error instanceof TypeError;
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.minimum_distance_km - b.minimum_distance_km),
    [events]
  );
  const objectsForViewer = forecast?.objects || [];

  function toggle(id) {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );
  }

  function handleRun() {
    if (selectedIds.length < 2) return;
    clearError();
    const horizon = HORIZON_OPTIONS.find((h) => h.hours === horizonHours);
    runScreening(selectedIds, horizon.hours, horizon.stepMinutes);
  }

  function handleAddCustom() {
    setCustomError('');
    const noradId = parseInt(customNoradId.trim(), 10);
    if (!customNoradId.trim() || isNaN(noradId) || noradId <= 0) {
      setCustomError('Enter a valid positive NORAD ID.');
      return;
    }
    const name = customName.trim() || `OBJECT-${noradId}`;
    if (catalog.some((o) => o.noradId === noradId)) {
      setCustomError('NORAD ID already in catalog.');
      return;
    }
    const newObj = { noradId, name, custom: true };
    setCatalog((prev) => [...prev, newObj]);
    setSelectedIds((prev) => [...prev, noradId]);
    setCustomNoradId('');
    setCustomName('');
    setShowCustomInput(false);
  }

  function handleRemoveCustom(noradId) {
    setCatalog((prev) => prev.filter((o) => o.noradId !== noradId));
    setSelectedIds((prev) => prev.filter((id) => id !== noradId));
  }

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] min-h-[650px] overflow-hidden bg-[#050816]">
      
      {/* ── 3D Full Screen Globe Center (Edge-to-Edge) ── */}
      <div className="absolute inset-0 z-0">
        <CesiumViewer objects={objectsForViewer} selectedEvent={selectedEvent} />

        {objectsForViewer.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#050816]/40 backdrop-blur-[2px] pointer-events-none z-10">
            <div className="h-14 w-14 rounded-2xl bg-[#0b1026]/90 border border-[rgba(0,240,255,0.2)] flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(0,240,255,0.2)]">
              🌍
            </div>
            <p className="font-mono text-xs text-white text-center px-6 max-w-sm drop-shadow-md bg-[#050816]/80 p-3 rounded-xl border border-[rgba(0,240,255,0.15)]">
              Select at least two objects and click{' '}
              <span className="text-[#00f0ff] font-bold">RUN SCREENING</span> to propagate 3D trajectories.
            </p>
          </div>
        )}

        {loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 font-mono text-xs text-[#00f0ff] border border-[rgba(0,240,255,0.4)] bg-[#050816]/90 backdrop-blur-md px-4 py-2 rounded-xl animate-pulse z-20 shadow-lg">
            ⚡ PROPAGATING ORBITAL TRAJECTORIES…
          </div>
        )}
      </div>

      {/* ── Left Collapsible Floating Card: Debris Selection ── */}
      <div className="absolute top-4 left-4 z-20">
        {!isLeftOpen ? (
          <button
            onClick={() => setIsLeftOpen(true)}
            className="flex items-center gap-2 font-mono text-xs text-[#00f0ff] bg-[#0b1026]/90 border border-[rgba(0,240,255,0.3)] backdrop-blur-xl px-3.5 py-2 rounded-xl shadow-xl hover:bg-[rgba(0,240,255,0.15)] transition-all"
          >
            <span>🛰️ Debris Selection ({selectedIds.length})</span>
            <span>›</span>
          </button>
        ) : (
          <div className="w-72 max-h-[calc(100vh-6rem)] overflow-y-auto border border-[rgba(0,240,255,0.25)] bg-[#0b1026]/90 backdrop-blur-2xl rounded-2xl p-4 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-[rgba(0,240,255,0.15)] pb-2.5">
              <div>
                <p className="font-mono text-[10px] text-[#00f0ff] tracking-[0.2em] uppercase font-bold">
                  ORBITAL SELECTION
                </p>
                <h2 className="text-xs font-bold text-white tracking-tight">Select Satellites & Debris</h2>
              </div>
              <button
                onClick={() => setIsLeftOpen(false)}
                className="h-6 w-6 rounded-lg border border-[rgba(0,240,255,0.2)] text-[#00f0ff] hover:bg-[rgba(0,240,255,0.1)] flex items-center justify-center text-xs transition-colors"
                title="Collapse Panel"
              >
                ‹
              </button>
            </div>

            {/* Catalog Checklist */}
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {catalog.map((obj) => {
                const active = selectedIds.includes(obj.noradId);
                return (
                  <div key={obj.noradId} className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggle(obj.noradId)}
                      className={[
                        'flex-1 flex items-center justify-between text-left px-2.5 py-1.5 rounded-xl border transition-all duration-200 text-xs',
                        active
                          ? 'border-[rgba(0,240,255,0.5)] bg-[rgba(0,240,255,0.12)] text-white font-semibold shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                          : 'border-[rgba(255,255,255,0.08)] bg-[#050816]/60 text-slate-300 hover:text-white hover:border-[rgba(0,240,255,0.3)]',
                      ].join(' ')}
                    >
                      <span className="truncate max-w-[140px]">{obj.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="font-mono text-[9px] text-slate-400">{obj.noradId}</span>
                        {active && <span className="text-[#00f0ff] text-[10px]">●</span>}
                      </div>
                    </button>
                    {obj.custom && (
                      <button
                        onClick={() => handleRemoveCustom(obj.noradId)}
                        className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-red-400 rounded-lg border border-transparent hover:border-red-500/30 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Custom NORAD ID */}
            <button
              onClick={() => { setShowCustomInput((s) => !s); setCustomError(''); }}
              className="w-full flex items-center justify-center gap-1.5 border border-dashed border-[rgba(0,240,255,0.3)] hover:border-[#00f0ff] hover:bg-[rgba(0,240,255,0.08)] text-slate-300 hover:text-white rounded-xl py-1.5 text-xs font-medium transition-all"
            >
              <span>+ Add Custom NORAD ID</span>
            </button>

            <AnimatePresence>
              {showCustomInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border border-[rgba(0,240,255,0.3)] bg-[#050816]/90 rounded-xl p-2.5 space-y-2">
                    <input
                      type="number"
                      value={customNoradId}
                      onChange={(e) => { setCustomNoradId(e.target.value); setCustomError(''); }}
                      placeholder="NORAD ID (e.g. 25544)"
                      className="w-full bg-[#0b1026] border border-[rgba(0,240,255,0.2)] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 font-mono outline-none"
                    />
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Custom Label (optional)"
                      className="w-full bg-[#0b1026] border border-[rgba(0,240,255,0.2)] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 font-mono outline-none"
                    />
                    {customError && <p className="text-[10px] text-red-400 font-mono">{customError}</p>}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleAddCustom}
                        className="flex-1 bg-gradient-to-r from-[#00f0ff] to-[#3b82f6] text-[#050816] font-bold text-xs rounded-lg py-1"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setShowCustomInput(false)}
                        className="px-2.5 text-xs text-slate-400 hover:text-white border border-[rgba(255,255,255,0.1)] rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Forecast Horizon */}
            <div className="space-y-1">
              <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Window</p>
              <div className="flex rounded-xl border border-[rgba(0,240,255,0.2)] overflow-hidden">
                {HORIZON_OPTIONS.map((h) => (
                  <button
                    key={h.hours}
                    onClick={() => setHorizonHours(h.hours)}
                    className={[
                      'flex-1 py-1 text-xs font-mono transition-all',
                      horizonHours === h.hours
                        ? 'bg-[#00f0ff] text-[#050816] font-bold'
                        : 'text-slate-300 hover:bg-[rgba(0,240,255,0.1)]',
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
              className="w-full bg-gradient-to-r from-[#00f0ff] to-[#3b82f6] text-[#050816] font-bold text-xs rounded-xl py-2 shadow-[0_0_20px_rgba(0,240,255,0.3)] disabled:opacity-40 transition-all hover:scale-[1.02]"
            >
              {loading ? 'PROPAGATING…' : 'RUN SCREENING'}
            </button>
          </div>
        )}
      </div>

      {/* ── Right Collapsible Floating Card: Risk & Alerts ── */}
      <div className="absolute top-16 right-4 z-20">
        {!isRightOpen ? (
          <button
            onClick={() => setIsRightOpen(true)}
            className="flex items-center gap-2 font-mono text-xs text-[#00f0ff] bg-[#0b1026]/90 border border-[rgba(0,240,255,0.3)] backdrop-blur-xl px-3.5 py-2 rounded-xl shadow-xl hover:bg-[rgba(0,240,255,0.15)] transition-all"
          >
            <span>‹ ⚠️ Alerts ({sortedEvents.length})</span>
          </button>
        ) : (
          <div className="w-76 max-h-[calc(100vh-6rem)] overflow-y-auto border border-[rgba(0,240,255,0.25)] bg-[#0b1026]/90 backdrop-blur-2xl rounded-2xl p-4 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-[rgba(0,240,255,0.15)] pb-2.5">
              <div>
                <p className="font-mono text-[10px] text-[#00f0ff] tracking-[0.2em] uppercase font-bold">
                  CONJUNCTION ALERTS
                </p>
                <h2 className="text-xs font-bold text-white tracking-tight">Close Encounters ({sortedEvents.length})</h2>
              </div>
              <button
                onClick={() => setIsRightOpen(false)}
                className="h-6 w-6 rounded-lg border border-[rgba(0,240,255,0.2)] text-[#00f0ff] hover:bg-[rgba(0,240,255,0.1)] flex items-center justify-center text-xs transition-colors"
                title="Collapse Panel"
              >
                ›
              </button>
            </div>

            {/* Conjunction list */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {sortedEvents.length === 0 && !loading && (
                <p className="font-mono text-xs text-slate-400 text-center py-3">
                  No active events — run screening.
                </p>
              )}
              {sortedEvents.map((ev) => {
                const active = selectedEvent === ev;
                return (
                  <button
                    key={`${ev.object_a?.norad_id}-${ev.object_b?.norad_id}-${ev.tca}`}
                    onClick={() => selectEvent(ev)}
                    className={[
                      'w-full text-left p-2 rounded-xl border transition-all text-xs',
                      active
                        ? 'border-[#00f0ff] bg-[rgba(0,240,255,0.12)] text-white shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                        : 'border-[rgba(255,255,255,0.08)] bg-[#050816]/60 text-slate-300 hover:border-[rgba(0,240,255,0.3)]',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white truncate max-w-[130px]">
                        {ev.object_a?.name} × {ev.object_b?.name}
                      </span>
                      <span className={`border rounded-md px-1.5 py-0.5 text-[9px] font-mono ${RISK_STYLES[ev.risk] || ''}`}>
                        {ev.risk}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 mt-1 flex justify-between">
                      <span>Miss: {Number(ev.minimum_distance_km).toFixed(2)} km</span>
                      <span>T-{countdownFrom(ev.tca)}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Risk Telemetry Card */}
            {selectedEvent && (
              <div className="border-t border-[rgba(0,240,255,0.15)] pt-3 space-y-2">
                <p className="font-mono text-[10px] text-[#00f0ff] tracking-[0.15em] uppercase font-bold">
                  TELEMETRY DETAILS
                </p>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <dt className="font-mono text-[10px] text-slate-400">OBJECT A</dt>
                    <dd className="font-semibold text-white">{selectedEvent.object_a?.name}</dd>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <dt className="font-mono text-[10px] text-slate-400">OBJECT B</dt>
                    <dd className="font-semibold text-white">{selectedEvent.object_b?.name}</dd>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <dt className="font-mono text-[10px] text-slate-400">TCA (UTC)</dt>
                    <dd className="font-mono text-white text-right">
                      <div>{formatDateTime(selectedEvent.tca)}</div>
                      <div className="text-[10px] text-[#00f0ff]">T-{countdownFrom(selectedEvent.tca)}</div>
                    </dd>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <dt className="font-mono text-[10px] text-slate-400">MIN SEPARATION</dt>
                    <dd className="font-mono font-bold text-[#00f0ff]">{Number(selectedEvent.minimum_distance_km).toFixed(2)} km</dd>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <dt className="font-mono text-[10px] text-slate-400">REL VELOCITY</dt>
                    <dd className="font-mono text-slate-200">
                      {selectedEvent.relative_velocity_km_s != null ? `${Number(selectedEvent.relative_velocity_km_s).toFixed(1)} km/s` : '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <dt className="font-mono text-[10px] text-slate-400">RISK TIER</dt>
                    <dd>
                      <span className={`font-mono text-[10px] border rounded-md px-2 py-0.5 ${RISK_STYLES[selectedEvent.risk] || ''}`}>
                        {selectedEvent.risk}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
