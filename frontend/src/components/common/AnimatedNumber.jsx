import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion';

// Counts up to `value` on mount/update. Falls back to a static render
// for non-numeric values (e.g. "1h 42m" countdown strings) and respects
// prefers-reduced-motion.
export default function AnimatedNumber({ value, duration = 1.1 }) {
  const isNumeric = typeof value === 'number';
  const shouldReduceMotion = useReducedMotion();
  const count = useMotionValue(shouldReduceMotion || !isNumeric ? value : 0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    if (!isNumeric) return;
    // If the previous value was a non-numeric placeholder (e.g. "…"), the
    // motion value is NaN — reset it so we animate from a real number.
    if (!Number.isFinite(count.get())) count.set(0);
    if (shouldReduceMotion) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return controls.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, shouldReduceMotion]);

  if (!isNumeric) return <>{value}</>;
  return <motion.span>{rounded}</motion.span>;
}
