import { motion } from 'framer-motion';

export default function GlowingPlanet({ className = '' }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Warm outer glow behind the planet */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle at center, rgba(245,166,35,0.35) 0%, rgba(232,137,43,0.1) 40%, transparent 70%)',
          filter: 'blur(45px)',
          transform: 'scale(1.4)'
        }}
      />
      
      {/* The planet body itself */}
      <div 
        className="relative rounded-full overflow-hidden shadow-2xl"
        style={{
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 45% 10%, #f5a623 0%, #7a4010 25%, #2a1a08 65%, #0D0C0A 100%)',
          boxShadow: 'inset 0px 8px 40px rgba(245,166,35,0.5), inset 0px -20px 40px rgba(0,0,0,0.85), 0 0 60px rgba(245,166,35,0.2)'
        }}
      >
        {/* Subtle texture / atmospheric lines */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(255,220,120,0.12) 5px, rgba(255,220,120,0.12) 6px)'
          }}
        />
        
        {/* Warm specular highlight at top — simulating star illumination */}
        <motion.div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1/4 rounded-[100%]"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255,240,180,0.9) 0%, rgba(245,166,35,0.4) 50%, transparent 75%)',
            filter: 'blur(10px)',
            transform: 'translateY(-50%)'
          }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      
      {/* Orbital rings — warm tinted */}
      <div
        className="absolute rounded-full border border-amber-500/10"
        style={{ width: '130%', height: '38%', transform: 'rotate(-15deg)' }}
      />
      <div
        className="absolute rounded-full border-t border-amber-400/25"
        style={{ width: '130%', height: '38%', transform: 'rotate(-15deg)', boxShadow: '0 0 12px rgba(245,166,35,0.3)' }}
      />
    </div>
  );
}
