import { motion } from 'framer-motion';
import PageHeader from '../components/common/PageHeader.jsx';
import Card from '../components/common/Card.jsx';
import { container, item } from '../utils/motion.js';

const SECTIONS = [
  {
    title: 'Data Source',
    eyebrow: 'INGESTION',
    body: "Orbital data is pulled from CelesTrak's public TLE catalog — free, no-signup, updated regularly for thousands of tracked objects. No licensing blocker, no API key required for the demo dataset.",
  },
  {
    title: 'Risk Scoring',
    eyebrow: 'METHODOLOGY',
    body: 'Each pair of tracked objects is propagated forward across the selected window. Pairs whose predicted separation drops below a configurable threshold are flagged as conjunctions, scored 0–100 from predicted miss distance and relative velocity.',
  },
  {
    title: 'Propagation',
    eyebrow: 'CORE LOGIC',
    body: 'TLEs are propagated using standard orbital mechanics (SGP4). Positions are sampled at the selected interval — 10 to 60 minutes — across the chosen time window, from 6 to 24 hours or a custom range.',
  },
  {
    title: 'Scope',
    eyebrow: 'THIS BUILD',
    body: 'This is a hackathon prototype. The 2D orbit plot and conjunction table demonstrate the concept end-to-end; a full 3D globe view is a stretch goal, not a requirement.',
  },
];

export default function About() {
  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <PageHeader eyebrow="REFERENCE" title="About & Methodology" />
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTIONS.map((s) => (
          <motion.div key={s.title} variants={item} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
            <Card title={s.title} eyebrow={s.eyebrow}>
              <p className="text-sm text-dim leading-relaxed">{s.body}</p>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
