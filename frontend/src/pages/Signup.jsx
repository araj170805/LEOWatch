import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import PublicNavbar from '../components/layout/PublicNavbar.jsx';
import OrbitGraphic from '../components/common/OrbitGraphic.jsx';
import { container, item } from '../utils/motion.js';

export default function Signup() {
  const { signup, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [formError, setFormError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (form.password !== form.confirm) {
      setFormError('Passwords do not match.');
      return;
    }

    const ok = await signup(form);
    if (ok) navigate('/dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-14 grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
        <motion.div variants={container} initial="hidden" animate="show" className="lg:col-span-3 w-full max-w-sm mx-auto lg:mx-0">
          <motion.div variants={item} className="mb-6 text-center lg:text-left">
            <p className="font-mono text-[11px] tracking-[0.2em] text-track mb-1">NEW OPERATOR</p>
            <h1 className="font-display text-2xl font-semibold text-primary tracking-tight">Create your account</h1>
          </motion.div>

          <motion.form
            variants={item}
            onSubmit={handleSubmit}
            className="border border-line bg-panel/60 backdrop-blur-xl shadow-panel rounded-2xl p-6 space-y-4"
          >
            {(formError || error) && (
              <div className="text-xs font-mono text-risk-high border border-risk-high/30 bg-risk-high/10 rounded-lg px-3 py-2">
                {formError || error}
              </div>
            )}

            <label className="block">
              <span className="text-xs text-dim">Name</span>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full bg-raised border border-line rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-track transition-colors"
              />
            </label>

            <label className="block">
              <span className="text-xs text-dim">Email</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1 w-full bg-raised border border-line rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-track transition-colors"
              />
            </label>

            <label className="block">
              <span className="text-xs text-dim">Password</span>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="mt-1 w-full bg-raised border border-line rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-track transition-colors"
              />
            </label>

            <label className="block">
              <span className="text-xs text-dim">Confirm Password</span>
              <input
                type="password"
                required
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                className="mt-1 w-full bg-raised border border-line rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-track transition-colors"
              />
            </label>

            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              type="submit"
              className="w-full bg-track hover:bg-track-dim text-void font-mono text-sm font-semibold rounded-xl py-2.5 transition-colors disabled:opacity-60"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </motion.button>
          </motion.form>

          <motion.p variants={item} className="text-center lg:text-left text-xs text-dim mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-track hover:underline">
              Sign in
            </Link>
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="hidden lg:flex lg:col-span-2 justify-center"
        >
          <div className="border border-line-bright bg-panel/60 rounded-2xl p-6 backdrop-blur-sm shadow-panel">
            <p className="font-mono text-[10px] tracking-[0.12em] text-faint mb-3 text-center">
              MISSION CONSOLE
            </p>
            <OrbitGraphic scale={0.7} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
