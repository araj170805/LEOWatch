import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Rendered once at the app root. When a guest triggers a protected action,
 * AuthContext.requireAuth() sets `guestGate` and this modal appears.
 * Scientific exploration is never blocked — only personal/persistent features.
 */
export default function GuestGateModal() {
  const { guestGate, closeGuestGate } = useAuth();
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {guestGate && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#050816]/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeGuestGate}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm border border-[rgba(0,240,255,0.25)] bg-[#0b1026]/95 rounded-2xl p-6 shadow-2xl"
          >
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#00f0ff] uppercase mb-2">
              Account required
            </p>
            <h2 className="text-lg font-semibold text-white mb-1">Sign in to {guestGate}</h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-5">
              Tracking, propagation, conjunction screening and AI explanations stay
              free for guests. An account only adds watchlists, saved analyses,
              reports and history.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { closeGuestGate(); navigate('/login'); }}
                className="w-full bg-[#00f0ff] text-[#050816] font-semibold text-sm rounded-xl py-2.5 hover:opacity-90 transition-opacity"
              >
                Log in
              </button>
              <button
                onClick={() => { closeGuestGate(); navigate('/signup'); }}
                className="w-full border border-[rgba(0,240,255,0.4)] text-[#00f0ff] font-semibold text-sm rounded-xl py-2.5 hover:bg-[rgba(0,240,255,0.08)] transition-colors"
              >
                Create account
              </button>
              <button
                onClick={closeGuestGate}
                className="w-full text-xs font-mono text-slate-400 hover:text-slate-200 py-2 transition-colors"
              >
                Continue as guest
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
