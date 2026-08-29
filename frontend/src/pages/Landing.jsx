import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PublicNavbar from '../components/layout/PublicNavbar.jsx';
import SplineScene from '../components/common/SplineScene.jsx';
import OrbitalPipeline from '../components/OrbitalPipeline.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { container, item } from '../utils/motion.js';

const FEATURES = [
  {
    title: 'Live Orbital Tracking',
    eyebrow: '01',
    icon: '🛰️',
    body: 'Ingests free, public TLE data from CelesTrak for thousands of tracked satellites and debris objects, refreshed on a near-live cadence.',
  },
  {
    title: 'Conjunction Detection',
    eyebrow: '02',
    icon: '⚡',
    body: 'Propagates every tracked pair forward across your chosen window and flags close approaches before they become a problem.',
  },
  {
    title: 'Risk Visualization',
    eyebrow: '03',
    icon: '📡',
    body: 'A 3D interactive globe with flagged pairs highlighted, sortable risk tables, and simple real-time alerts for critical events.',
  },
];

const AI_FEATURES = [
  {
    icon: '🔍',
    title: 'Hybrid RAG Retrieval',
    desc: 'BM25 keyword search + Gemini dense vector embeddings fused via Reciprocal Rank Fusion for domain-accurate answers.',
  },
  {
    icon: '🧠',
    title: 'Google Gemini LLM Engine',
    desc: 'Grounded answers from Google Gemini — never fabricates orbital numbers, only references real telemetry data.',
  },
  {
    icon: '📚',
    title: 'Orbital Knowledge Base',
    desc: 'Comprehensive RAG corpus covering TCA, SGP4, CDM, screening volumes, TLE accuracy, and collision probability.',
  },
  {
    icon: '💬',
    title: 'AI Orbital Copilot',
    desc: 'Ask about any object, conjunction, or orbital mechanic concept — powered by contextual grounding with live screening data.',
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [sceneLoaded, setSceneLoaded] = useState(false);

  const handleLoad = useCallback(() => {
    setSceneLoaded(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative text-white">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative w-full min-h-[90vh] flex items-center justify-center pt-24 pb-16 overflow-hidden">
        
        {/* Background 3D Spline Scene or Glowing Backdrop */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none"
          style={{ 
            maskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)'
          }}
        >
          <SplineScene
            scene="/scene.splinecode"
            className="w-full h-full"
            onLoad={handleLoad}
          />
          <div 
            className="absolute inset-0 pointer-events-none" 
            style={{ 
              background: 'radial-gradient(circle at center, transparent 0%, rgba(5,8,22,0.6) 100%), linear-gradient(to bottom, rgba(5,8,22,0.3) 0%, rgba(5,8,22,0.8) 100%)' 
            }} 
          />
        </div>

        {/* Foreground Hero Text & Call to Action */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative z-10 w-full max-w-5xl mx-auto px-6 flex flex-col items-center text-center mt-[-2rem]"
        >
          <motion.h1
            variants={item}
            className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.08] tracking-tight mb-6 uppercase text-white drop-shadow-2xl max-w-4xl text-center"
          >
            ORBITAL DATA <br />
            INTO <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-[#3b82f6]">
              INTELLIGENCE
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="text-lg sm:text-xl lg:text-2xl font-medium leading-relaxed max-w-2xl mb-10 text-[#00f0ff] font-sans text-center"
            style={{ textShadow: '0 0 20px rgba(0,240,255,0.4)' }}
          >
            From live orbital data to trajectory prediction, conjunction detection and explainable risk analysis.
          </motion.p>

          <motion.div variants={item} className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <Link
              to="/orbit-view"
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-full font-bold text-xs tracking-[0.15em] uppercase transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #00f0ff, #3b82f6)',
                color: '#050816',
                boxShadow: '0 0 35px rgba(0,240,255,0.5)',
              }}
            >
              <span>EXPLORE LIVE DATA →</span>
            </Link>

            <Link
              to="/dashboard"
              className="group inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-full font-bold text-xs tracking-[0.15em] uppercase transition-all duration-300 backdrop-blur-md hover:bg-[rgba(0,240,255,0.15)] border border-[rgba(0,240,255,0.4)] text-white bg-[rgba(5,8,22,0.5)]"
            >
              <span>RUN ANALYSIS →</span>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-6xl mx-auto w-full px-4 md:px-8 py-20">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          <motion.p variants={item} className="font-mono text-xs tracking-[0.2em] text-[#00f0ff] mb-2 text-center uppercase">
            SYSTEM CAPABILITIES
          </motion.p>
          <motion.h2 variants={item} className="text-3xl font-bold text-white text-center mb-16 tracking-tight">
            High-Precision Space Situational Awareness
          </motion.h2>

          {/* Staggered Cards Grid — matching reference layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {[
              {
                title: 'Live Orbital Tracking',
                eyebrow: '01',
                iconBg: 'linear-gradient(135deg, #00f0ff, #0ea5e9)',
                iconColor: '#050816',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5">
                    <circle cx="12" cy="12" r="3" /><path d="M12 2a10 10 0 0 1 10 10" /><path d="M2 12a10 10 0 0 1 10-10" /><path d="M12 22a10 10 0 0 1-10-10" /><path d="M22 12a10 10 0 0 1-10 10" />
                  </svg>
                ),
                body: 'Ingests free, public TLE data from CelesTrak for thousands of tracked satellites and debris objects, refreshed on a near-live cadence.',
                cardBg: 'rgba(0, 240, 255, 0.06)',
                border: 'rgba(0, 240, 255, 0.22)',
                offset: 'md:mt-0',
              },
              {
                title: 'Conjunction Detection',
                eyebrow: '02',
                iconBg: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                iconColor: '#fff',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                body: 'Propagates every tracked pair forward across your chosen window and flags close approaches before they become a problem.',
                cardBg: 'rgba(168, 85, 247, 0.07)',
                border: 'rgba(168, 85, 247, 0.25)',
                offset: 'md:mt-10',
              },
              {
                title: 'Risk Visualization',
                eyebrow: '03',
                iconBg: 'linear-gradient(135deg, #10b981, #059669)',
                iconColor: '#fff',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                body: 'A 3D interactive globe with flagged pairs highlighted, sortable risk tables, and real-time alerts for critical events.',
                cardBg: 'rgba(16, 185, 129, 0.06)',
                border: 'rgba(16, 185, 129, 0.22)',
                offset: 'md:mt-5',
              },
            ].map((f) => (
              <motion.div
                key={f.title}
                variants={item}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={`group rounded-3xl p-6 backdrop-blur-xl shadow-xl cursor-default ${f.offset}`}
                style={{ background: f.cardBg, border: `1px solid ${f.border}` }}
              >
                {/* Top row: number (left) + icon box (right) */}
                <div className="flex items-start justify-between mb-6">
                  <span
                    className="font-mono text-5xl font-extrabold leading-none select-none"
                    style={{ color: f.border, opacity: 0.9 }}
                  >
                    {f.eyebrow}
                  </span>
                  <div
                    className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
                    style={{ background: f.iconBg, color: f.iconColor }}
                  >
                    {f.icon}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white mb-2 tracking-tight">{f.title}</h3>

                {/* Body */}
                <p className="text-sm text-slate-300 leading-relaxed">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>


      {/* Orbital Pipeline Section */}
      <section id="pipeline" className="scroll-mt-24 border-t border-[rgba(0,240,255,0.15)] bg-[rgba(5,8,22,0.35)]">
        <div className="max-w-6xl mx-auto w-full px-4 md:px-8 py-20">
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }}>
            <motion.p variants={item} className="font-mono text-xs tracking-[0.2em] text-[#00f0ff] mb-2 text-center uppercase">
              Orbital Pipeline
            </motion.p>
            <motion.h2 variants={item} className="text-3xl font-bold text-white text-center mb-3 tracking-tight">
              From raw orbital data to AI risk insight
            </motion.h2>
            <motion.p variants={item} className="text-sm text-slate-400 text-center max-w-2xl mx-auto mb-14">
              Every LEO Watch analysis runs through the same deterministic pipeline — public element sets in,
              conjunction geometry and plain-language risk out.
            </motion.p>
            <motion.div variants={item}>
              <OrbitalPipeline />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* AI Section — VYOMNETRA Branding */}
      <section id="ai-section" className="border-t border-[rgba(0,240,255,0.15)] bg-gradient-to-b from-[rgba(0,240,255,0.06)] to-transparent">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          className="max-w-6xl mx-auto px-4 md:px-8 py-20"
        >
          <motion.div variants={item} className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-[1.08] uppercase mb-6">
              THE ORBIT<br />
              HAS DATA.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-[#3b82f6]">
                WE GIVE IT INTELLIGENCE.
              </span>
            </h2>
            <p className="text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              From raw orbital telemetry to understandable decisions — VYOMNETRA combines retrieval, scientific knowledge and live conjunction data to explain what is happening above Earth.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14 items-start">
            {[
              {
                eyebrow: '01',
                label: 'RETRIEVE',
                desc: 'Find the right orbital knowledge and live analysis context.',
                iconBg: 'linear-gradient(135deg, #00f0ff, #0ea5e9)',
                iconColor: '#050816',
                cardBg: 'rgba(0, 240, 255, 0.06)',
                border: 'rgba(0, 240, 255, 0.22)',
                offset: 'lg:mt-0',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5">
                    <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                  </svg>
                ),
              },
              {
                eyebrow: '02',
                label: 'UNDERSTAND',
                desc: 'Transform complex orbital data into human-readable intelligence.',
                iconBg: 'linear-gradient(135deg, #ec4899, #a855f7)',
                iconColor: '#fff',
                cardBg: 'rgba(236, 72, 153, 0.07)',
                border: 'rgba(236, 72, 153, 0.25)',
                offset: 'lg:mt-8',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
              },
              {
                eyebrow: '03',
                label: 'GROUND',
                desc: 'Connect answers with actual telemetry, calculations and trusted sources.',
                iconBg: 'linear-gradient(135deg, #10b981, #059669)',
                iconColor: '#fff',
                cardBg: 'rgba(16, 185, 129, 0.06)',
                border: 'rgba(16, 185, 129, 0.22)',
                offset: 'lg:mt-4',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
              },
              {
                eyebrow: '04',
                label: 'INTERACT',
                desc: 'Ask the Orbital Copilot about objects, trajectories and conjunction events.',
                iconBg: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                iconColor: '#fff',
                cardBg: 'rgba(245, 158, 11, 0.06)',
                border: 'rgba(245, 158, 11, 0.22)',
                offset: 'lg:mt-12',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                ),
              },
            ].map((f) => (
              <motion.div
                key={f.label}
                variants={item}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={`group rounded-3xl p-5 backdrop-blur-xl shadow-xl cursor-default ${f.offset}`}
                style={{ background: f.cardBg, border: `1px solid ${f.border}` }}
              >
                {/* Top row: number (left) + icon box (right) */}
                <div className="flex items-start justify-between mb-5">
                  <span
                    className="font-mono text-4xl font-extrabold leading-none select-none"
                    style={{ color: f.border, opacity: 0.9 }}
                  >
                    {f.eyebrow}
                  </span>
                  <div
                    className="h-11 w-11 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
                    style={{ background: f.iconBg, color: f.iconColor }}
                  >
                    {f.icon}
                  </div>
                </div>
                <p className="font-mono text-[10px] tracking-[0.2em] uppercase mb-1" style={{ color: f.border }}>
                  {f.label}
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div variants={item} className="text-center">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-3 rounded-full px-10 py-3.5 text-xs font-bold uppercase tracking-[0.15em] transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(90deg, #00f0ff, #3b82f6)',
                color: '#050816',
                boxShadow: '0 0 30px rgba(0,240,255,0.4)',
              }}
            >
              ENTER ORBITAL AI →
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(0,240,255,0.15)] bg-[rgba(5,8,22,0.8)] backdrop-blur-xl mt-auto">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#00f0ff]" />
            <span className="font-mono text-xs tracking-[0.2em] text-white uppercase font-bold">ORBITAL GUARDIAN</span>
          </div>
          <p className="font-mono text-[11px] text-slate-400 text-center">
            Space Situational Awareness System · CelesTrak TLE Data · Google Gemini AI
          </p>
        </div>
      </footer>
    </div>
  );
}
