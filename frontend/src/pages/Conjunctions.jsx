import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageHeader from '../components/common/PageHeader.jsx';
import Card from '../components/common/Card.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ConjunctionTable from '../components/tables/ConjunctionTable.jsx';
import RiskFactorCard from '../components/common/RiskFactorCard.jsx';
import { SEED_IDS } from '../lib/seed.js';
import { useMission } from '../context/MissionContext.jsx';
import { container, item } from '../utils/motion.js';

const HORIZONS = [6, 12, 24];

export default function Conjunctions() {
  const navigate = useNavigate();
  const { events, selectedEvent, loading, error, runScreening, selectEvent } = useMission();
  const [horizon, setHorizon] = useState(24);
  const [catalogError, setCatalogError] = useState(null);
  const [ran, setRan] = useState(false);

  async function screen(h) {
    setCatalogError(null);
    try {
      await runScreening(SEED_IDS.slice(0, 6), h, h <= 6 ? 1 : 5);
      setRan(true);
    } catch (err) {
      setCatalogError(err.message || 'Screening failed.');
    }
  }

  useEffect(() => { screen(horizon); /* eslint-disable-next-line */ }, []);

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <PageHeader
          eyebrow="DETERMINISTIC CONJUNCTION ENGINE"
          title="Conjunction Center"
          description="SGP4 trajectories → broad-phase screening → TCA refinement → miss distance & relative velocity → heuristic risk priority. Every number is computed by the engine, not AI."
        />
      </motion.div>

      <motion.div variants={item} className="mb-5 flex items-center gap-2">
        <span className="font-mono text-[10px] text-faint uppercase tracking-wider">Window</span>
        {HORIZONS.map((h) => (
          <button
            key={h}
            onClick={() => { setHorizon(h); screen(h); }}
            className={[
              'px-3 py-1 rounded-lg border text-xs font-mono transition-colors',
              horizon === h ? 'border-track text-track bg-track/10' : 'border-line text-faint hover:text-dim',
            ].join(' ')}
          >
            {h}H
          </button>
        ))}
        {loading && <span className="font-mono text-[11px] text-track animate-pulse ml-2">Propagating orbits…</span>}
      </motion.div>

      {(catalogError || (error && ran)) && (
        <motion.div variants={item}>
          <EmptyState title="Screening unavailable" hint={catalogError || String(error?.message || error)} />
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={item} className="lg:col-span-2">
          <Card bodyClassName="p-4 md:p-5">
            <ConjunctionTable data={events} onRowClick={(c) => selectEvent(c)} />
          </Card>
        </motion.div>
        <motion.div variants={item}>
          {selectedEvent ? (
            <RiskFactorCard
              event={selectedEvent}
              onFlyToTca={() => navigate('/orbit-view')}
            />
          ) : (
            <Card title="Risk Priority" eyebrow="SELECT AN EVENT">
              <p className="text-xs text-dim py-6 text-center">
                Select a conjunction to see its contributing risk factors and open the 3D encounter view.
              </p>
            </Card>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
