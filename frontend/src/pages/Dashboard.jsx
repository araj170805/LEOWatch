import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageHeader from '../components/common/PageHeader.jsx';
import StatCard from '../components/common/StatCard.jsx';
import Card from '../components/common/Card.jsx';
import OrbitGraphic from '../components/common/OrbitGraphic.jsx';
import { apiGet } from '../lib/api.js';
import { SEED_IDS } from '../lib/seed.js';
import { formatDateTime, countdownFrom } from '../utils/formatTime.js';
import { useMission } from '../context/MissionContext.jsx';

const EASE = [0.16, 1, 0.3, 1];
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } };

const RISK_TEXT = {
  LOW: 'text-emerald-400', MEDIUM: 'text-amber-400', HIGH: 'text-red-400', CRITICAL: 'text-red-500',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { events, runScreening, loading } = useMission();
  const [cat, setCat] = useState({ loading: true, error: null, total: 0, counts: {} });

  useEffect(() => {
    let alive = true;
    apiGet('/catalog?page_size=1')
      .then((data) => {
        if (!alive) return;
        setCat({ loading: false, error: null, total: data.total_unfiltered ?? data.total ?? 0, counts: data.counts || {} });
      })
      .catch((err) => alive && setCat({ loading: false, error: err.message, total: 0, counts: {} }));
    if (events.length === 0) runScreening(SEED_IDS.slice(0, 6), 24, 5);
    return () => { alive = false; };
    // eslint-disable-next-line
  }, []);

  const sortedByDist = useMemo(
    () => [...events].sort((a, b) => a.minimum_distance_km - b.minimum_distance_km),
    [events]
  );
  const highRisk = events.filter((e) => e.risk === 'HIGH' || e.risk === 'CRITICAL');
  const nextEvent = useMemo(
    () => [...events].sort((a, b) => new Date(a.tca) - new Date(b.tca))[0],
    [events]
  );

  const debris = cat.counts.DEBRIS ?? 0;
  const rockets = cat.counts['ROCKET BODY'] ?? 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <PageHeader
          eyebrow="MISSION CONTROL"
          title="Space Situational Awareness"
          description="Latest available orbital data from CelesTrak, propagated locally with SGP4. All statistics are computed from live backend data."
          action={
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/orbit-view')}
              className="bg-gradient-to-r from-[#00f0ff] to-[#a200ff] text-[#050816] font-bold text-xs px-5 py-2.5 rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center gap-2"
            >
              <span>Launch 3D Screening</span><span>→</span>
            </motion.button>
          }
        />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div variants={item}>
          <StatCard
            label="TRACKED OBJECTS"
            value={cat.loading ? 0 : cat.total}
            footnote={cat.loading ? 'loading catalog…' : `${debris.toLocaleString()} debris · ${rockets.toLocaleString()} R/B`}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard label="ACTIVE CONJUNCTIONS" value={loading ? 0 : events.length} footnote="seed-set screening · 24h" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard label="HIGH-PRIORITY EVENTS" value={loading ? 0 : highRisk.length} accent={highRisk.length ? 'text-risk-high' : 'text-[#00f0ff]'} footnote="HIGH / CRITICAL tier" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard label="DEBRIS TRACKED" value={cat.loading ? 0 : debris} accent="text-[#00f0ff]" footnote="fragmentation + inactive" />
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <motion.div variants={item} className="lg:col-span-3">
          <Card
            title="Top Risk Events"
            eyebrow="SORTED BY MISS DISTANCE"
            action={<button onClick={() => navigate('/conjunctions')} className="text-xs font-mono text-track">View all →</button>}
          >
            {events.length === 0 ? (
              <p className="text-xs text-dim py-8 text-center">
                {loading ? 'Running screening…' : 'No conjunctions in the current window.'}
              </p>
            ) : (
              <ul className="divide-y divide-line/60 -mx-5 -my-5">
                {sortedByDist.slice(0, 5).map((e, i) => (
                  <li
                    key={i}
                    onClick={() => navigate('/conjunctions')}
                    className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-[rgba(0,240,255,0.06)] transition-colors"
                  >
                    <div>
                      <p className="text-sm text-primary">{e.object_a?.name} <span className="text-faint">×</span> {e.object_b?.name}</p>
                      <p className="font-mono text-[11px] text-faint mt-0.5">
                        T-{countdownFrom(e.tca)} · miss {Number(e.minimum_distance_km).toFixed(2)} km
                      </p>
                    </div>
                    <span className={`font-mono text-xs font-bold ${RISK_TEXT[e.risk] || 'text-dim'}`}>
                      {e.risk_score ?? '—'} · {e.risk}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </motion.div>

        <motion.div variants={item} className="lg:col-span-2">
          <Card title="Next Close Approach" eyebrow="NEAREST TCA">
            {nextEvent ? (
              <div className="text-center py-4">
                <p className="font-mono text-2xl text-track">{countdownFrom(nextEvent.tca)}</p>
                <p className="text-xs text-dim mt-1">{formatDateTime(nextEvent.tca)}</p>
                <p className="text-xs text-primary mt-3">{nextEvent.object_a?.name} × {nextEvent.object_b?.name}</p>
              </div>
            ) : (
              <div className="aspect-square rounded-xl relative overflow-hidden flex items-center justify-center" style={{ background: 'rgba(5,8,22,0.6)', border: '1px solid rgba(0,240,255,0.18)' }}>
                <OrbitGraphic />
              </div>
            )}
            <button
              onClick={() => navigate('/orbit-view')}
              className="mt-3 w-full text-xs font-mono text-[#00f0ff] border border-[rgba(0,240,255,0.3)] rounded-xl py-2"
            >
              Open 3D orbit view →
            </button>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
