import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * LEO Watch — Orbital Pipeline
 * Horizontal connected process flow on desktop (scrolls if it overflows),
 * vertical connected timeline on mobile. Frontend-only, no new dependencies.
 */

const STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };

const STAGES = [
  {
    n: '01',
    title: 'TLE Data',
    desc: 'Acquire orbital element sets from CelesTrak / Space-Track.',
    icon: (
      <svg viewBox="0 0 24 24" {...STROKE} className="w-5 h-5">
        <ellipse cx="12" cy="6" rx="7" ry="3" />
        <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
        <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
      </svg>
    ),
  },
  {
    n: '02',
    title: 'TLE Parsing',
    desc: 'Extract inclination, eccentricity, mean motion and epoch from each record.',
    icon: (
      <svg viewBox="0 0 24 24" {...STROKE} className="w-5 h-5">
        <path d="M8 4 3 12l5 8" />
        <path d="m16 4 5 8-5 8" />
        <path d="M13.5 4 10 20" />
      </svg>
    ),
  },
  {
    n: '03',
    title: 'SGP4 Propagation',
    desc: 'Propagate position and velocity over time with the SGP4 model.',
    icon: (
      <svg viewBox="0 0 24 24" {...STROKE} className="w-5 h-5">
        <path d="m5 15 4-4" />
        <rect x="2.5" y="12.5" width="6" height="6" rx="1" transform="rotate(-45 5.5 15.5)" />
        <path d="M14 6a4 4 0 0 1 4 4" />
        <path d="M14 2a8 8 0 0 1 8 8" />
        <circle cx="13" cy="11" r="1.6" />
      </svg>
    ),
  },
  {
    n: '04',
    title: 'Trajectory Generation',
    desc: 'Build predicted ground tracks for LEO satellites and tracked objects.',
    icon: (
      <svg viewBox="0 0 24 24" {...STROKE} className="w-5 h-5">
        <path d="M3 17c4-10 14-10 18 0" strokeDasharray="0.1 3.4" />
        <circle cx="7.5" cy="12.7" r="1.8" />
        <circle cx="18" cy="15" r="1.4" />
      </svg>
    ),
  },
  {
    n: '05',
    title: 'Conjunction Analysis',
    desc: 'Compare object trajectories to identify potential close approaches.',
    icon: (
      <svg viewBox="0 0 24 24" {...STROKE} className="w-5 h-5">
        <path d="M4 4c8 4 8 12 16 16" />
        <path d="M20 4C12 8 12 16 4 20" />
        <circle cx="12" cy="12" r="2.2" />
      </svg>
    ),
  },
  {
    n: '06',
    title: 'TCA + Minimum Separation',
    desc: 'Compute Time of Closest Approach and the minimum separation distance.',
    icon: (
      <svg viewBox="0 0 24 24" {...STROKE} className="w-5 h-5">
        <circle cx="9" cy="9" r="5.5" />
        <path d="M9 6v3l2 2" />
        <path d="M15 15h6M15 15l2-2M15 15l2 2M21 15l-2-2M21 15l-2 2" />
      </svg>
    ),
  },
  {
    n: '07',
    title: '3D / 2D Visualization',
    desc: 'Render orbits, objects and encounters in interactive 3D and 2D views.',
    icon: (
      <svg viewBox="0 0 24 24" {...STROKE} className="w-5 h-5">
        <path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3z" />
        <path d="M3 7.5 12 12l9-4.5M12 12v9" />
      </svg>
    ),
  },
  {
    n: '08',
    title: 'AI Risk Explanation',
    desc: 'Turn the computed conjunction metrics into plain-language risk insight.',
    icon: (
      <svg viewBox="0 0 24 24" {...STROKE} className="w-5 h-5">
        <path d="M20 15a3 3 0 0 1-3 3H8l-4 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z" />
        <path d="M12 8v3.5" />
        <path d="M12 14.4v.1" />
      </svg>
    ),
  },
];

function Node({ stage, active, onEnter, onLeave, vertical }) {
  return (
    <motion.div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      whileHover={{ y: vertical ? 0 : -4 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={[
        'relative flex gap-3',
        vertical ? 'flex-row items-start' : 'w-[150px] shrink-0 flex-col items-center text-center',
      ].join(' ')}
    >
      {/* Node circle */}
      <div className="relative shrink-0">
        <span
          className={[
            'absolute -top-1.5 -left-1.5 z-10 grid h-5 w-5 place-items-center rounded-md font-mono text-[10px] font-bold transition-colors duration-200',
            active ? 'bg-[#00f0ff] text-[#050816]' : 'bg-[#0b1026] text-[#00f0ff] border border-[rgba(0,240,255,0.3)]',
          ].join(' ')}
        >
          {stage.n}
        </span>
        <motion.div
          animate={active ? { rotate: [0, -6, 6, 0] } : { rotate: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className={[
            'grid h-14 w-14 place-items-center rounded-2xl backdrop-blur-xl transition-all duration-200',
            active
              ? 'bg-[rgba(0,240,255,0.12)] border border-[#00f0ff] text-white shadow-[0_0_24px_-4px_rgba(0,240,255,0.5)]'
              : 'bg-[rgba(5,8,22,0.7)] border border-[rgba(0,240,255,0.2)] text-[#00f0ff]',
          ].join(' ')}
        >
          {stage.icon}
        </motion.div>
      </div>

      {/* Text */}
      <div className={vertical ? 'pt-0.5' : 'mt-3'}>
        <h3 className={`text-xs font-bold tracking-tight transition-colors duration-200 ${active ? 'text-white' : 'text-slate-200'}`}>
          {stage.title}
        </h3>
        <p className="mt-1 text-[11px] leading-snug text-slate-400 max-w-[190px]">{stage.desc}</p>
      </div>
    </motion.div>
  );
}

export default function OrbitalPipeline() {
  const [active, setActive] = useState(null);

  return (
    <div>
      {/* ── Desktop / tablet: two connected rows of four (left-to-right flow) ── */}
      <div className="hidden md:block">
        {[[0, 1, 2, 3], [4, 5, 6, 7]].map((rowIdx, r) => (
          <div key={r} className={r === 1 ? 'mt-4' : ''}>
            <div className="relative grid grid-cols-4 gap-3 lg:gap-6">
              {/* dashed rail through the circle centres (h-14 -> 28px) */}
              <div className="pointer-events-none absolute inset-x-8 top-7 border-t border-dashed border-[rgba(0,240,255,0.28)]" aria-hidden />
              {rowIdx.map((i, col) => (
                <div key={STAGES[i].n} className="relative flex justify-center">
                  <Node
                    stage={STAGES[i]}
                    active={active === i}
                    onEnter={() => setActive(i)}
                    onLeave={() => setActive(null)}
                  />
                  {col < 3 && (
                    <span
                      className={`pointer-events-none absolute -right-2 lg:-right-4 top-7 -translate-y-1/2 text-lg leading-none transition-colors duration-200 ${
                        active === i || active === i + 1 ? 'text-[#00f0ff]' : 'text-[rgba(0,240,255,0.4)]'
                      }`}
                      aria-hidden
                    >
                      ›
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* row-to-row / row-to-endpoint connector */}
            <div className="flex justify-center pt-1">
              <span className="text-[rgba(0,240,255,0.4)] text-lg leading-none" aria-hidden>
                ↓
              </span>
            </div>
          </div>
        ))}

        {/* LEO WATCH endpoint */}
        <div className="flex justify-center">
          <div className="grid place-content-center rounded-xl bg-[#0b1e3d] border border-[rgba(0,240,255,0.3)] px-5 py-3 shadow-lg text-center">
            <p className="font-display text-sm font-bold tracking-wide text-white leading-none">LEO WATCH</p>
            <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-[#00f0ff]/70 leading-none">Orbital Intelligence</p>
          </div>
        </div>
      </div>

      {/* ── Mobile: vertical connected timeline ── */}
      <div className="md:hidden">
        <ol className="relative ml-7 space-y-6 border-l border-dashed border-[rgba(0,240,255,0.28)]">
          {STAGES.map((stage, i) => (
            <li key={stage.n} className="-ml-7 pl-1">
              <Node
                stage={stage}
                vertical
                active={active === i}
                onEnter={() => setActive(i)}
                onLeave={() => setActive(null)}
              />
            </li>
          ))}
          <li className="-ml-7 flex items-center gap-3 pl-1">
            <span className="h-14 w-14 shrink-0 grid place-items-center rounded-2xl bg-[#0b1e3d] border border-[rgba(0,240,255,0.3)] text-[#00f0ff] text-xl">✦</span>
            <div className="rounded-xl bg-[#0b1e3d] border border-[rgba(0,240,255,0.3)] px-4 py-2.5">
              <p className="font-display text-sm font-bold tracking-wide text-white">LEO WATCH</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#00f0ff]/70">Orbital Intelligence</p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
