import { useState } from 'react';
import { useTimeRange, RANGE_PRESETS, INTERVAL_OPTIONS } from '../../context/TimeRangeContext.jsx';

export default function TimeRangeSelector({ compact = false }) {
  const { rangeId, intervalId, selectRange, setIntervalId, activeHours } = useTimeRange();
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div
      className={`flex flex-col gap-3 ${compact ? '' : 'p-3 rounded-2xl backdrop-blur-xl'}`}
      style={compact ? {} : { background: 'rgba(5, 8, 22, 0.55)', border: '1px solid rgba(0, 240, 255, 0.18)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <span className="font-mono text-[10px] tracking-[0.12em] text-[#00f0ff] font-semibold mr-1 hidden sm:inline">
            WINDOW
          </span>
          <div className="flex rounded-xl border border-[rgba(0,240,255,0.2)] overflow-hidden bg-[#050816]">
            {RANGE_PRESETS.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  selectRange(r.id);
                  setShowCustom(false);
                }}
                className={[
                  'px-3.5 py-1.5 text-xs font-mono transition-all',
                  rangeId === r.id
                    ? 'bg-[#00f0ff] text-[#050816] font-bold shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                    : 'bg-transparent text-slate-300 hover:text-white hover:bg-[rgba(0,240,255,0.08)]',
                ].join(' ')}
              >
                {r.label}
              </button>
            ))}
            <button
              onClick={() => setShowCustom((s) => !s)}
              className={[
                'px-3.5 py-1.5 text-xs font-mono border-l border-[rgba(0,240,255,0.2)] transition-all',
                rangeId === 'custom'
                  ? 'bg-[#00f0ff] text-[#050816] font-bold shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                  : 'bg-transparent text-slate-300 hover:text-white hover:bg-[rgba(0,240,255,0.08)]',
              ].join(' ')}
            >
              Custom ▾
            </button>
          </div>
        </div>

        <span className="font-mono text-[11px] text-faint">{activeHours}h window</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] tracking-[0.12em] text-[#00f0ff] font-semibold hidden sm:inline">
          INTERVAL
        </span>
        <select
          value={intervalId}
          onChange={(e) => setIntervalId(e.target.value)}
          className="bg-[#050816] border border-[rgba(0,240,255,0.2)] rounded-lg text-xs font-mono text-white px-3 py-1.5 focus:outline-none focus:border-[#00f0ff] cursor-pointer"
        >
          {INTERVAL_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {showCustom && (
        <div className="border-t border-line pt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-dim">
            Start
            <input
              type="datetime-local"
              className="bg-raised border border-line rounded-sm text-xs font-mono text-primary px-2 py-1 focus:outline-none focus:border-track"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-dim">
            End
            <input
              type="datetime-local"
              className="bg-raised border border-line rounded-sm text-xs font-mono text-primary px-2 py-1 focus:outline-none focus:border-track"
            />
          </label>
          <p className="font-mono text-[10px] text-faint w-full sm:w-auto">
            Custom range wiring pending backend — presets are fully live.
          </p>
        </div>
      )}
    </div>
  );
}
