import { motion } from 'framer-motion';
import AnimatedNumber from './AnimatedNumber.jsx';

export default function StatCard({ label, value, unit, accent = 'text-[#00f0ff]', footnote }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="rounded-2xl p-5 md:p-6 relative overflow-hidden group backdrop-blur-xl"
      style={{ background: 'rgba(5, 8, 22, 0.55)', border: '1px solid rgba(0, 240, 255, 0.18)' }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00f0ff]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-[#00f0ff]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#00f0ff] relative z-10 mb-2.5">{label}</p>
      
      <p className={`relative z-10 font-display text-4xl font-bold tracking-tight tabular-nums ${accent}`}>
        <AnimatedNumber value={value} />
        {unit && <span className="text-xl text-slate-400 ml-1.5 font-sans font-medium">{unit}</span>}
      </p>
      
      {footnote && <p className="relative z-10 text-xs text-slate-400 mt-2 font-sans">{footnote}</p>}
    </motion.div>
  );
}

