import { createContext, useContext, useMemo, useState } from 'react';

const TimeRangeContext = createContext(null);

// Range presets in hours. "custom" is handled separately with explicit start/end.
export const RANGE_PRESETS = [
  { id: '6h', label: '6h', hours: 6 },
  { id: '10h', label: '10h', hours: 10 },
  { id: '24h', label: '24h', hours: 24 },
];

export const INTERVAL_OPTIONS = [
  { id: '10min', label: 'Every 10 min', minutes: 10 },
  { id: '20min', label: 'Every 20 min', minutes: 20 },
  { id: '30min', label: 'Every 30 min', minutes: 30 },
  { id: '60min', label: 'Every 1 hr', minutes: 60 },
];

// Sensible default interval for a given range, so a 24h window doesn't
// default to a 10-minute sample and return thousands of points.
function defaultIntervalFor(hours) {
  if (hours <= 6) return '10min';
  if (hours <= 10) return '20min';
  return '30min';
}

export function TimeRangeProvider({ children }) {
  const [rangeId, setRangeId] = useState('24h');
  const [customRange, setCustomRange] = useState(null); // { start: Date, end: Date }
  const [intervalId, setIntervalId] = useState('30min');

  const activeHours = useMemo(() => {
    if (rangeId === 'custom' && customRange?.start && customRange?.end) {
      return Math.max(
        1,
        Math.round((customRange.end - customRange.start) / (1000 * 60 * 60))
      );
    }
    return RANGE_PRESETS.find((r) => r.id === rangeId)?.hours ?? 24;
  }, [rangeId, customRange]);

  function selectRange(id) {
    setRangeId(id);
    if (id !== 'custom') {
      setIntervalId(defaultIntervalFor(RANGE_PRESETS.find((r) => r.id === id)?.hours ?? 24));
    }
  }

  function selectCustomRange(start, end) {
    setRangeId('custom');
    setCustomRange({ start, end });
    setIntervalId(defaultIntervalFor(Math.round((end - start) / (1000 * 60 * 60))));
  }

  const value = {
    rangeId,
    customRange,
    intervalId,
    activeHours,
    selectRange,
    selectCustomRange,
    setIntervalId,
  };

  return <TimeRangeContext.Provider value={value}>{children}</TimeRangeContext.Provider>;
}

export function useTimeRange() {
  const ctx = useContext(TimeRangeContext);
  if (!ctx) throw new Error('useTimeRange must be used within TimeRangeProvider');
  return ctx;
}
