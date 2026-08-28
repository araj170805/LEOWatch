import { motion } from 'framer-motion';

export default function OrbitGraphic({ scale = 1, className = '' }) {
  return (
    <div
      className={`relative ${className}`}
      style={{ width: 280 * scale, height: 280 * scale }}
    >
      <div
        className="absolute top-0 left-0 flex items-center justify-center"
        style={{ width: 280, height: 280, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(0, 240, 255, 0.15) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />

        <motion.div
          className="absolute inset-0"
          style={{
            background: 'conic-gradient(from 0deg, rgba(0, 240, 255, 0.25), transparent 28%, transparent 100%)',
            borderRadius: '9999px',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />

        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="h-28 w-28 rounded-full border border-[#00f0ff]/40"
        />
        <div className="absolute h-40 w-40 rounded-full border border-[rgba(0,240,255,0.2)]" />
        <div className="absolute h-56 w-56 rounded-full border border-[rgba(0,240,255,0.1)]" />

        <span className="absolute h-2.5 w-2.5 rounded-full bg-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.8)]" />

        <motion.div
          className="absolute inset-0"
          style={{ transformOrigin: 'center' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        >
          <span
            className="absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full bg-[#00f0ff]"
            style={{ transform: 'translate(76px, -3px)' }}
          />
        </motion.div>

        <motion.div
          className="absolute inset-0"
          style={{ transformOrigin: 'center' }}
          animate={{ rotate: -360 }}
          transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
        >
          <span
            className="absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full bg-red-400"
            style={{ transform: 'translate(108px, -3px)' }}
          />
        </motion.div>

        <motion.span
          className="absolute top-10 left-16 h-1.5 w-1.5 rounded-full bg-red-400"
          animate={{ opacity: [1, 0.2, 1], scale: [1, 1.4, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="absolute bottom-14 right-10 h-1.5 w-1.5 rounded-full bg-amber-400" />
      </div>
    </div>
  );
}
