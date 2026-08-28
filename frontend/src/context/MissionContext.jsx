import { createContext, useContext, useState, useCallback } from 'react';
import { apiPost } from '../lib/api.js';

const MissionContext = createContext(null);

export function MissionProvider({ children }) {
  const [forecast, setForecast] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runScreening = useCallback(async (norads, horizonHours = 24, stepMinutes = 1) => {
    setLoading(true);
    setError(null);
    try {
      // Screening returns events only; /forecast supplies trajectory points
      // for the globe, so both are issued together.
      const [screeningData, forecastData] = await Promise.all([
        apiPost('/screening', {
          objects: norads,
          horizon_hours: horizonHours,
          step_minutes: stepMinutes,
        }),
        apiPost('/forecast', {
          objects: norads,
          horizon_hours: horizonHours,
          step_minutes: stepMinutes,
        }).catch(() => null),
      ]);

      setForecast(
        forecastData || {
          start_time: null,
          horizon_hours: horizonHours,
          step_minutes: stepMinutes,
          objects: [],
        }
      );
      setEvents(screeningData.events || []);
      if (screeningData.events?.length) {
        const closest = [...screeningData.events].sort(
          (a, b) => a.minimum_distance_km - b.minimum_distance_km
        )[0];
        setSelectedEvent(closest);
      } else {
        setSelectedEvent(null);
      }
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectEvent = useCallback((event) => setSelectedEvent(event), []);
  const clearError = useCallback(() => setError(null), []);

  const value = {
    forecast,
    events,
    selectedEvent,
    loading,
    error,
    runScreening,
    selectEvent,
    clearError,
  };

  return <MissionContext.Provider value={value}>{children}</MissionContext.Provider>;
}

export function useMission() {
  const ctx = useContext(MissionContext);
  if (!ctx) throw new Error('useMission must be used within MissionProvider');
  return ctx;
}
