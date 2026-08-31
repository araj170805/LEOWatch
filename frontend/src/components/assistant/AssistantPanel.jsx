import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useDragControls, useMotionValue } from 'framer-motion';
import { apiPost } from '../../lib/api.js';
import { formatDateTime } from '../../utils/formatTime.js';
import { useMission } from '../../context/MissionContext.jsx';

const RISK_TEXT = {
  LOW: 'text-risk-low',
  MEDIUM: 'text-risk-med',
  HIGH: 'text-risk-high',
  CRITICAL: 'text-risk-high',
};

function riskTextClass(risk) {
  return RISK_TEXT[risk] || 'text-primary';
}

const SUGGESTED = [
  'Explain this conjunction',
  'Why is this risk level assigned?',
  'What is TCA?',
  'What does minimum separation mean?',
];

const POS_KEY = 'leowatch_copilot_pos';
const PANEL_W = 360;

export default function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const { selectedEvent } = useMission();

  // Draggable floating position. Anchored bottom-right; x/y are negative
  // offsets (left / up). Kept inside the viewport and remembered for the session.
  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [constraints, setConstraints] = useState({ left: -400, top: -400, right: 0, bottom: 0 });

  useEffect(() => {
    function recalc() {
      const maxLeft = -(Math.max(0, window.innerWidth - PANEL_W - 24));
      const maxUp = -(Math.max(0, window.innerHeight - 140));
      setConstraints({ left: maxLeft, top: maxUp, right: 0, bottom: 0 });
      // clamp current position back into range on resize
      if (x.get() < maxLeft) x.set(maxLeft);
      if (y.get() < maxUp) y.set(maxUp);
    }
    recalc();
    try {
      const saved = JSON.parse(sessionStorage.getItem(POS_KEY) || 'null');
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
        x.set(saved.x);
        y.set(saved.y);
      }
    } catch {
      /* ignore */
    }
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persistPos() {
    try {
      sessionStorage.setItem(POS_KEY, JSON.stringify({ x: x.get(), y: y.get() }));
    } catch {
      /* ignore */
    }
  }

  async function send(question) {
    if (!question.trim() || sending) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setInput('');
    setSending(true);
    try {
      const data = await apiPost('/chat', {
        question,
        event: selectedEvent ?? null,
        history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
      });
      setMessages((m) => [...m, { role: 'assistant', text: data.answer }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: 'AI explanation temporarily unavailable.' },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0.04}
      dragConstraints={constraints}
      onDragEnd={persistPos}
      style={{ x, y }}
      className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)]"
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="border border-line bg-panel/90 backdrop-blur-2xl rounded-2xl shadow-2xl flex flex-col max-h-[75vh] overflow-hidden"
          >
            {/* Header (drag handle) */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: 'none' }}
              className="flex items-center justify-between px-4 py-3 border-b border-line bg-panel/50 cursor-grab active:cursor-grabbing select-none"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse_dot" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-primary tracking-tight">
                    AI Orbital Copilot
                  </span>
                  <span className="font-mono text-[9px] text-faint">
                    Grounded Telemetry Assistant · drag to move
                  </span>
                </div>
              </div>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setOpen(false)}
                className="h-6 w-6 rounded-lg border border-line flex items-center justify-center text-dim hover:text-primary hover:bg-white/5 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex flex-col gap-3 p-4 overflow-y-auto flex-1 min-h-[160px] text-xs">
              {selectedEvent && (
                <div className="border border-line bg-void/60 rounded-xl p-3">
                  <p className="font-semibold text-primary">
                    {selectedEvent.object_a?.name}{' '}
                    <span className="text-faint font-normal">×</span> {selectedEvent.object_b?.name}
                  </p>
                  <p className="font-mono text-[10px] text-dim mt-1">
                    TCA {formatDateTime(selectedEvent.tca)} · Miss{' '}
                    {Number(selectedEvent.minimum_distance_km).toFixed(2)} km ·{' '}
                    <span className={`font-semibold ${riskTextClass(selectedEvent.risk)}`}>{selectedEvent.risk}</span>
                  </p>
                </div>
              )}
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-dim text-[11px]">
                    Suggested questions regarding orbital mechanics & conjunction telemetry:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED.map((q) => (
                      <button
                        key={q}
                        onClick={() => send(q)}
                        className="text-[11px] font-medium text-dim bg-white/5 border border-line rounded-lg px-2.5 py-1.5 hover:border-indigo-500/40 hover:text-primary hover:bg-white/10 transition-all text-left"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`leading-relaxed rounded-xl p-3 ${
                    msg.role === 'user'
                      ? 'bg-indigo-600/90 text-primary self-end ml-8 shadow-sm font-medium'
                      : 'bg-void/80 border border-line text-dim self-start mr-6'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {sending && (
                <div className="font-mono text-[11px] text-indigo-400 animate-pulse">Analyzing trajectory telemetry…</div>
              )}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2 p-3 border-t border-line bg-panel/40"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about orbital conjunctions…"
                className="flex-1 bg-void/80 border border-line rounded-xl text-xs px-3.5 py-2.5 text-primary placeholder:text-faint focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="bg-accent hover:bg-indigo-500 disabled:opacity-40 text-primary font-medium text-xs rounded-xl px-4 py-2.5 transition-colors shadow-sm"
              >
                Send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onPointerDown={(e) => dragControls.start(e)}
          onClick={() => setOpen(true)}
          style={{ touchAction: 'none' }}
          className="ml-auto flex border border-line bg-panel/90 backdrop-blur-xl rounded-2xl text-xs font-semibold text-primary px-4 py-3 shadow-glow items-center gap-2.5 hover:border-indigo-500/40 transition-all cursor-pointer"
        >
          <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse_dot" />
          <span>AI Copilot</span>
        </motion.button>
      )}
    </motion.div>
  );
}
