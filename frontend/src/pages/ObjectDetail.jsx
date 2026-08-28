import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '../components/common/PageHeader.jsx';
import Card from '../components/common/Card.jsx';
import { formatDateTime } from '../utils/formatTime.js';
import { container, item } from '../utils/motion.js';
import { apiGet, apiPost } from '../lib/api.js';

const TYPE_COLOR = {
  PAYLOAD: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  DEBRIS: 'text-red-400 bg-red-400/10 border-red-400/30',
  'ROCKET BODY': 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  UNKNOWN: 'text-dim bg-white/5 border-white/20',
};

const FRESH_COLOR = {
  FRESH: 'text-emerald-400', AGING: 'text-amber-400', STALE: 'text-red-400', UNKNOWN: 'text-slate-500',
};

const SUGGESTED = [
  'What is this object?',
  'What was this object used for?',
  'Why is it still in orbit?',
  'Explain its orbit.',
  'How reliable is this prediction?',
];

export default function ObjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [object, setObject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiAnswer, setAiAnswer] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    apiGet(`/object/${id}`)
      .then((data) => { if (alive) { setObject(data); setLoading(false); } })
      .catch(() => { if (alive) { setNotFound(true); setLoading(false); } });
    return () => { alive = false; };
  }, [id]);

  async function ask(question) {
    setAiOpen(true);
    setAiLoading(true);
    setAiError(null);
    setAiAnswer(null);
    try {
      const st = object?.orbital_state || {};
      const data = await apiPost('/chat', {
        question,
        event: {
          object_a: { norad_id: object?.norad_id, name: object?.name },
          object_type: object?.type,
          altitude_km: object?.altitudeKm,
          inclination_deg: object?.inclinationDeg,
          period_min: st.period_min,
          eccentricity: st.eccentricity,
          apogee_km: st.apogee_km,
          perigee_km: st.perigee_km,
          tle_epoch: object?.tle_epoch,
          tle_age_days: object?.tle_age_days,
          data_source: object?.data_source,
        },
      });
      setAiAnswer(data.answer);
    } catch {
      setAiError('AI service temporarily unavailable.');
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return <div className="max-w-lg mx-auto mt-20 text-center text-dim font-mono animate-pulse">Fetching latest available orbital data for NORAD {id}…</div>;
  }

  if (notFound || !object) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-lg mx-auto mt-20 text-center">
        <motion.div variants={item}>
          <div className="text-6xl mb-4">🛰️</div>
          <PageHeader eyebrow="CATALOG" title="Object not found" description={`No orbital data available for NORAD ID ${id} (not in the CelesTrak catalog, or the catalog is unreachable).`} />
          <button onClick={() => navigate('/objects')} className="mt-4 text-sm font-mono text-track hover:underline">← Back to catalog</button>
        </motion.div>
      </motion.div>
    );
  }

  const st = object.orbital_state || {};
  const typeClass = TYPE_COLOR[object.type] ?? TYPE_COLOR.UNKNOWN;

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <Link to="/objects" className="text-xs font-mono text-faint hover:text-track transition-colors">← BACK TO CATALOG</Link>
        <PageHeader
          eyebrow={`NORAD ID ${object.norad_id}`}
          title={object.name}
          description={`${object.type}${object.international_designator ? ` · ${object.international_designator}` : ''} · ${object.note}`}
        />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <motion.div variants={item}>
          <Card title="Orbital State" eyebrow="SGP4 · TEME/ECI">
            <dl className="space-y-2.5">
              {[
                ['Altitude', st.altitude_km != null ? `${st.altitude_km} km` : '—'],
                ['Velocity', st.speed_km_s != null ? `${st.speed_km_s} km/s` : '—'],
                ['Inclination', st.inclination_deg != null ? `${st.inclination_deg}°` : '—'],
                ['Eccentricity', st.eccentricity ?? '—'],
                ['Apogee', st.apogee_km != null ? `${st.apogee_km} km` : '—'],
                ['Perigee', st.perigee_km != null ? `${st.perigee_km} km` : '—'],
                ['Orbital period', st.period_min != null ? `${st.period_min} min` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-white/5 pb-2">
                  <dt className="text-xs text-faint">{k}</dt>
                  <dd className="font-mono text-sm text-primary">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex justify-center">
              <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border uppercase ${typeClass}`}>{object.type}</span>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card title="Data Quality" eyebrow="PROVENANCE">
            <dl className="space-y-2.5">
              {[
                ['Data source', object.data_source],
                ['TLE epoch', object.tle_epoch ? formatDateTime(object.tle_epoch) : '—'],
                ['TLE age', object.tle_age_days != null ? `${object.tle_age_days} days` : '—'],
                ['Coordinate frame', st.frame || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-white/5 pb-2">
                  <dt className="text-xs text-faint">{k}</dt>
                  <dd className="font-mono text-sm text-primary text-right">{v}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between pt-1">
                <dt className="text-xs text-faint">Freshness</dt>
                <dd className={`font-mono text-sm font-bold ${FRESH_COLOR[object.freshness] || 'text-slate-500'}`}>{object.freshness}</dd>
              </div>
            </dl>
            <p className="text-[10px] text-faint mt-3 leading-relaxed">
              TLE = orbital elements for propagation, not spacecraft telemetry.
            </p>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={item}>
        <Card
          title="Ask Orbital AI"
          eyebrow="GEMINI · GROUNDED ON VERIFIED DATA"
          action={<span className="text-[10px] font-mono text-indigo-400">RAG + object context</span>}
        >
          <div className="flex flex-wrap gap-1.5 mb-3">
            {SUGGESTED.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                className="text-[11px] font-medium text-dim bg-white/5 border border-line rounded-lg px-2.5 py-1.5 hover:border-indigo-500/40 hover:text-primary transition-all"
              >
                {q}
              </button>
            ))}
          </div>
          <AnimatePresence>
            {aiOpen && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                {aiLoading && <p className="text-xs font-mono text-indigo-400 animate-pulse">Retrieving knowledge + asking Gemini…</p>}
                {aiError && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg p-3 border border-red-400/20">{aiError}</p>}
                {aiAnswer && (
                  <div className="text-xs text-dim leading-relaxed bg-void/60 rounded-xl p-3 border border-white/5 max-h-60 overflow-y-auto">
                    <p className="font-mono text-[9px] text-faint mb-1.5 uppercase tracking-wider">
                      Verified object data (CelesTrak) · SGP4 propagation · Knowledge base · Gemini explanation
                    </p>
                    {aiAnswer}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      <motion.div variants={item} className="mt-4">
        <Card title="Conjunctions" eyebrow="SCREENING">
          <p className="text-xs text-dim py-4 text-center">
            Run multi-object screening on the{' '}
            <button onClick={() => navigate('/conjunctions')} className="text-track hover:underline">Conjunction Center</button>{' '}
            or the <button onClick={() => navigate('/orbit-view')} className="text-track hover:underline">3D Orbit View</button> to
            evaluate close approaches involving this object.
          </p>
        </Card>
      </motion.div>
    </motion.div>
  );
}
