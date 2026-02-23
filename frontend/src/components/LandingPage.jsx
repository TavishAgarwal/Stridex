import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiActivity, FiShield, FiTrendingUp, FiZap, FiArrowRight, FiPlay, FiCheckCircle, FiLogIn } from 'react-icons/fi';

const stats = [
  { value: '94%', label: 'Detection Accuracy', sub: 'Pose landmark precision' },
  { value: '8s', label: 'Analysis Time', sub: 'Per video processed' },
  { value: '8', label: 'Risk Metrics', sub: 'Knee · Stride · Posture + 5 more' },
  { value: '∞', label: 'Athletes Supported', sub: 'Any sport, any level' },
];

const features = [
  {
    icon: '🦵',
    title: 'Knee Valgus Detection',
    desc: 'MediaPipe tracks 33 skeletal landmarks in real-time to detect inward knee collapse — the #1 predictor of ACL injuries.',
    color: '#8b5cf6',
  },
  {
    icon: '⚖️',
    title: 'Stride Asymmetry',
    desc: 'Measures left-right step imbalance frame by frame. Even 10% asymmetry significantly elevates injury risk over time.',
    color: '#06b6d4',
  },
  {
    icon: '🎯',
    title: 'Posture Alignment',
    desc: 'Scores spinal alignment and hip-shoulder balance against biomechanical gold standards across every frame.',
    color: '#10b981',
  },
  {
    icon: '🔮',
    title: 'Predictive Risk Modeling',
    desc: 'Trend analysis across sessions forecasts injury probability. Intervene before the injury happens.',
    color: '#f97316',
  },
  {
    icon: '📊',
    title: 'Side-by-Side Comparison',
    desc: 'Compare before/after videos with radar charts, overlaid timelines, and a full performance scorecard.',
    color: '#ef4444',
  },
  {
    icon: '💊',
    title: 'Exercise Prescriptions',
    desc: 'Every analysis ends with specific exercises targeting detected weaknesses — not just a diagnosis, a treatment plan.',
    color: '#a855f7',
  },
];

const sports = ['🏃 Running', '⚽ Football', '🏀 Basketball', '🏋️ Weightlifting', '🚴 Cycling', '🎾 Tennis', '🏊 Swimming', '⛹️ Volleyball'];

function AnimatedCounter({ target, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const isInfinity = target === '∞';

  useEffect(() => {
    if (isInfinity) return;
    const num = parseFloat(target);
    const steps = 60;
    const increment = num / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= num) { setCount(num); clearInterval(timer); }
      else setCount(Math.floor(current * 10) / 10);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, duration, isInfinity]);

  if (isInfinity) return <span>∞</span>;
  return <span>{count}{suffix}</span>;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [sportIndex, setSportIndex] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setSportIndex(i => (i + 1) % sports.length), 1800);
    return () => clearInterval(interval);
  }, []);

  // Already logged in? redirect to app
  useEffect(() => {
    if (isLoggedIn) navigate('/app', { replace: true });
  }, [isLoggedIn, navigate]);

  const handleEnter = () => {
    setStarted(true);
    setTimeout(() => navigate('/login'), 600);
  };

  return (
    <AnimatePresence>
      {!started && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6 }}
          style={{
            minHeight: '100vh',
            background: '#050d1a',
            color: 'white',
            fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
            overflowX: 'hidden',
          }}
        >
          {/* Google Fonts */}
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
            ::-webkit-scrollbar { width: 6px; }
            ::-webkit-scrollbar-track { background: #0a1628; }
            ::-webkit-scrollbar-thumb { background: #1e3a8a; border-radius: 3px; }
            .glow-cyan { text-shadow: 0 0 40px rgba(6,182,212,0.8), 0 0 80px rgba(6,182,212,0.4); }
            .glow-red { text-shadow: 0 0 40px rgba(239,68,68,0.8); }
            .card-hover { transition: transform 0.3s, box-shadow 0.3s; }
            .card-hover:hover { transform: translateY(-6px); box-shadow: 0 30px 60px rgba(0,0,0,0.5) !important; }
            @keyframes pulse-ring {
              0% { transform: scale(1); opacity: 0.8; }
              100% { transform: scale(1.6); opacity: 0; }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-12px); }
            }
            @keyframes scan {
              0% { top: 0; opacity: 1; }
              100% { top: 100%; opacity: 0; }
            }
            @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
          `}</style>

          {/* Nav */}
          <nav style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
            padding: '16px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgba(5,13,26,0.85)', backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(6,182,212,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '10px',
                background: 'linear-gradient(135deg, #1e3a8a, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(6,182,212,0.4)'
              }}>
                <FiActivity style={{ color: 'white', fontSize: '18px' }} />
              </div>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '2px', color: 'white' }}>
                STRIDEX<span style={{ color: '#06b6d4' }}>-AI</span>
              </span>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {['Features', 'How It Works', 'Sports'].map(item => (
                <a key={item} href={`#${item.toLowerCase().replaceAll(' ', '-')}`}
                  style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px', fontWeight: '500', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = '#06b6d4'}
                  onMouseLeave={e => e.target.style.color = '#94a3b8'}>
                  {item}
                </a>
              ))}
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/login')}
                style={{
                  padding: '9px 18px', background: 'transparent',
                  color: '#06b6d4', border: '1px solid rgba(6,182,212,0.4)', borderRadius: '8px',
                  cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                <FiLogIn style={{ fontSize: '14px' }} /> Log In
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/signup')}
                style={{
                  padding: '9px 22px', background: 'linear-gradient(135deg, #1e3a8a, #06b6d4)',
                  color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: '600', boxShadow: '0 0 20px rgba(6,182,212,0.3)'
                }}>
                Sign Up →
              </motion.button>
            </div>
          </nav>

          {/* HERO */}
          <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '120px 48px 80px', position: 'relative', overflow: 'hidden' }}>
            {/* Background grid */}
            <div style={{
              position: 'absolute', inset: 0, zIndex: 0,
              backgroundImage: 'linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)',
              backgroundSize: '60px 60px'
            }} />
            {/* Radial glow */}
            <div style={{
              position: 'absolute', top: '20%', left: '55%', width: '600px', height: '600px',
              background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
              borderRadius: '50%', zIndex: 0
            }} />
            <div style={{
              position: 'absolute', top: '40%', left: '50%', width: '400px', height: '400px',
              background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
              borderRadius: '50%', zIndex: 0
            }} />

            <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center', width: '100%', position: 'relative', zIndex: 1 }}>
              {/* Left */}
              <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '6px 16px', background: 'rgba(6,182,212,0.1)',
                  border: '1px solid rgba(6,182,212,0.3)', borderRadius: '20px',
                  fontSize: '13px', color: '#06b6d4', fontWeight: '600', marginBottom: '28px'
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4', display: 'inline-block', animation: 'blink 1.5s infinite' }} />
                  AI-Powered Biomechanical Analysis
                </div>

                <h1 style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 'clamp(3.5rem, 6vw, 6rem)',
                  lineHeight: 1.0, fontWeight: 400, marginBottom: '12px',
                  letterSpacing: '1px'
                }}>
                  STOP <span className="glow-red" style={{ color: '#ef4444' }}>GUESSING.</span>
                </h1>
                <h1 style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 'clamp(3.5rem, 6vw, 6rem)',
                  lineHeight: 1.0, fontWeight: 400, marginBottom: '32px',
                  letterSpacing: '1px'
                }}>
                  START <span className="glow-cyan" style={{ color: '#06b6d4' }}>MEASURING.</span>
                </h1>

                <p style={{ fontSize: '1.15rem', color: '#94a3b8', lineHeight: 1.7, marginBottom: '20px', maxWidth: '520px' }}>
                  STRIDEX-AI detects injury risk before it becomes an injury. Upload any sports video and get a complete biomechanical breakdown in under 10 seconds.
                </p>

                {/* Sport ticker */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
                  <span style={{ color: '#475569', fontSize: '14px' }}>Works for</span>
                  <AnimatePresence mode="wait">
                    <motion.span key={sportIndex}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      style={{ color: '#06b6d4', fontWeight: '700', fontSize: '16px', minWidth: '140px', display: 'inline-block' }}>
                      {sports[sportIndex]}
                    </motion.span>
                  </AnimatePresence>
                </div>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <motion.button whileHover={{ scale: 1.05, boxShadow: '0 20px 60px rgba(6,182,212,0.5)' }} whileTap={{ scale: 0.95 }}
                    onClick={handleEnter}
                    style={{
                      padding: '18px 40px', fontSize: '17px', fontWeight: '700',
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #06b6d4 100%)',
                      color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '10px',
                      boxShadow: '0 10px 40px rgba(6,182,212,0.35)',
                    }}>
                    <FiPlay /> Analyze Your First Video
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={handleEnter}
                    style={{
                      padding: '18px 32px', fontSize: '17px', fontWeight: '600',
                      background: 'transparent', color: '#94a3b8',
                      border: '1px solid rgba(148,163,184,0.3)', borderRadius: '12px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '10px',
                    }}>
                    Live Camera <FiArrowRight />
                  </motion.button>
                </div>

              </motion.div>

              {/* Right — Skeleton visualization */}
              <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{
                  position: 'relative', width: '420px', height: '520px',
                  background: 'linear-gradient(135deg, rgba(30,58,138,0.15), rgba(6,182,212,0.08))',
                  borderRadius: '28px', border: '1px solid rgba(6,182,212,0.2)',
                  boxShadow: '0 30px 80px rgba(0,0,0,0.5)', overflow: 'hidden',
                  animation: 'float 4s ease-in-out infinite'
                }}>
                  {/* Scan line */}
                  <div style={{
                    position: 'absolute', left: 0, right: 0, height: '2px',
                    background: 'linear-gradient(90deg, transparent, #06b6d4, transparent)',
                    animation: 'scan 2.5s linear infinite', zIndex: 10
                  }} />

                  {/* Risk badge */}
                  <div style={{
                    position: 'absolute', top: '20px', right: '20px', zIndex: 10,
                    padding: '8px 14px', background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px',
                    fontSize: '13px', fontWeight: '700', color: '#ef4444'
                  }}>
                    ⚠️ HIGH RISK 78%
                  </div>

                  {/* Stick figure SVG */}
                  <svg viewBox="0 0 300 450" width="100%" height="100%" style={{ padding: '20px' }}>
                    {/* skeleton lines */}
                    <g stroke="rgba(6,182,212,0.7)" strokeWidth="3" fill="none" strokeLinecap="round">
                      {/* spine */}
                      <line x1="150" y1="80" x2="150" y2="220" />
                      {/* shoulders */}
                      <line x1="90" y1="120" x2="210" y2="120" />
                      {/* left arm */}
                      <line x1="90" y1="120" x2="60" y2="190" />
                      <line x1="60" y1="190" x2="50" y2="255" />
                      {/* right arm */}
                      <line x1="210" y1="120" x2="240" y2="190" />
                      <line x1="240" y1="190" x2="250" y2="255" />
                      {/* hips */}
                      <line x1="110" y1="220" x2="190" y2="220" />
                      {/* left leg — valgus (knee inward) */}
                      <line x1="110" y1="220" x2="140" y2="320" stroke="#ef4444" strokeWidth="3.5" />
                      <line x1="140" y1="320" x2="105" y2="420" stroke="#ef4444" strokeWidth="3.5" />
                      {/* right leg — normal */}
                      <line x1="190" y1="220" x2="190" y2="320" />
                      <line x1="190" y1="320" x2="195" y2="420" />
                    </g>
                    {/* joints */}
                    {[
                      [150, 65, '#06b6d4', 12], // head
                      [150, 120, '#06b6d4', 7], // neck
                      [90, 120, '#06b6d4', 6],  // l shoulder
                      [210, 120, '#06b6d4', 6], // r shoulder
                      [60, 190, '#06b6d4', 5],
                      [240, 190, '#06b6d4', 5],
                      [50, 255, '#06b6d4', 5],
                      [250, 255, '#06b6d4', 5],
                      [150, 220, '#06b6d4', 7], // spine bottom
                      [110, 220, '#06b6d4', 6], // l hip
                      [190, 220, '#06b6d4', 6], // r hip
                      [140, 320, '#ef4444', 8], // l knee VALGUS
                      [190, 320, '#06b6d4', 6], // r knee
                      [105, 420, '#ef4444', 5],
                      [195, 420, '#06b6d4', 5],
                    ].map(([x, y, color, r], i) => (
                      <circle key={i} cx={x} cy={y} r={r} fill={color} opacity="0.9">
                        {color === '#ef4444' && <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.2s" repeatCount="indefinite" />}
                      </circle>
                    ))}
                    {/* valgus annotation */}
                    <line x1="140" y1="320" x2="185" y2="295" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.7" />
                    <rect x="187" y="278" width="90" height="24" rx="5" fill="rgba(239,68,68,0.15)" stroke="rgba(239,68,68,0.4)" strokeWidth="1" />
                    <text x="232" y="294" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="bold">KNEE VALGUS</text>
                  </svg>

                  {/* Bottom metrics */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '16px 20px',
                    background: 'linear-gradient(0deg, rgba(5,13,26,0.95), transparent)',
                    display: 'flex', justifyContent: 'space-between'
                  }}>
                    {[['Knee L', '142°', '#ef4444'], ['Asymmetry', '14.2%', '#f97316'], ['Posture', '0.71', '#10b981']].map(([k, v, c]) => (
                      <div key={k} style={{ textAlign: 'center' }}>
                        <div style={{ color: c, fontWeight: '700', fontSize: '16px' }}>{v}</div>
                        <div style={{ color: '#64748b', fontSize: '11px' }}>{k}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* STATS */}
          <section style={{ padding: '60px 48px', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px' }}>
              {stats.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  style={{ textAlign: 'center' }}>
                  <div style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '3.5rem', color: i % 2 === 0 ? '#06b6d4' : '#8b5cf6',
                    lineHeight: 1, marginBottom: '8px',
                    textShadow: `0 0 30px ${i % 2 === 0 ? 'rgba(6,182,212,0.5)' : 'rgba(139,92,246,0.5)'}`
                  }}>
                    <AnimatedCounter target={s.value} />
                  </div>
                  <div style={{ color: 'white', fontWeight: '600', fontSize: '15px' }}>{s.label}</div>
                  <div style={{ color: '#475569', fontSize: '13px', marginTop: '4px' }}>{s.sub}</div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* FEATURES */}
          <section id="features" style={{ padding: '100px 48px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                style={{ textAlign: 'center', marginBottom: '64px' }}>
                <div style={{ color: '#06b6d4', fontWeight: '600', fontSize: '13px', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
                  CAPABILITIES
                </div>
                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '3.5rem', letterSpacing: '1px' }}>
                  EVERYTHING A PHYSIO <br /><span style={{ color: '#06b6d4' }}>DOES IN 60 MINUTES.</span> WE DO IN 8 SECONDS.
                </h2>
              </motion.div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                {features.map((f, i) => (
                  <motion.div key={i} className="card-hover"
                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                    style={{
                      padding: '32px', borderRadius: '20px',
                      background: `linear-gradient(135deg, ${f.color}12, ${f.color}06)`,
                      border: `1px solid ${f.color}25`,
                      boxShadow: `0 10px 40px ${f.color}10`
                    }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{f.icon}</div>
                    <h3 style={{ color: 'white', fontWeight: '700', fontSize: '1.1rem', marginBottom: '12px' }}>{f.title}</h3>
                    <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.7 }}>{f.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section id="how-it-works" style={{ padding: '80px 48px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '60px' }}>
                <div style={{ color: '#8b5cf6', fontWeight: '600', fontSize: '13px', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>HOW IT WORKS</div>
                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '3rem', letterSpacing: '1px' }}>
                  THREE STEPS TO <span style={{ color: '#8b5cf6' }}>INJURY-FREE</span> PERFORMANCE
                </h2>
              </motion.div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }}>
                {[
                  { step: '01', icon: <FiZap />, title: 'Upload Video', desc: 'Any sports video from your phone, camera or drone. 4K, 1080p, any format — we process it all.', color: '#06b6d4' },
                  { step: '02', icon: <FiShield />, title: 'AI Analyses', desc: 'MediaPipe maps 33 skeletal landmarks per frame. Our algorithms score knee angles, stride balance and posture alignment.', color: '#8b5cf6' },
                  { step: '03', icon: <FiTrendingUp />, title: 'Get Workout Plan', desc: 'Receive your risk score, annotated frames, and a personalised exercise plan to correct detected imbalances.', color: '#10b981' },
                ].map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                    style={{ textAlign: 'center' }}>
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${s.color}30, ${s.color}10)`,
                      border: `2px solid ${s.color}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.8rem', color: s.color, margin: '0 auto 16px',
                      boxShadow: `0 0 30px ${s.color}30`
                    }}>
                      {s.icon}
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '3.5rem', color: `${s.color}30`, lineHeight: 1, marginBottom: '8px' }}>{s.step}</div>
                    <h3 style={{ color: 'white', fontWeight: '700', fontSize: '1.1rem', marginBottom: '10px' }}>{s.title}</h3>
                    <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.7 }}>{s.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* SPORTS */}
          <section id="sports" style={{ padding: '80px 48px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', marginBottom: '40px' }}>
                  BUILT FOR <span style={{ color: '#06b6d4' }}>EVERY SPORT</span>
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
                  {sports.map((sport, i) => (
                    <motion.div key={i} whileHover={{ scale: 1.1, background: 'rgba(6,182,212,0.15)' }}
                      style={{
                        padding: '12px 24px', borderRadius: '30px',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                        fontSize: '15px', fontWeight: '500', cursor: 'default',
                        transition: 'all 0.2s'
                      }}>
                      {sport}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>

          {/* CTA */}
          <section style={{ padding: '100px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: '600px', height: '600px',
              background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
              borderRadius: '50%', pointerEvents: 'none'
            }} />
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', marginBottom: '20px', letterSpacing: '1px' }}>
                YOUR NEXT INJURY IS <br /><span style={{ color: '#ef4444' }}>ALREADY VISIBLE</span> IN YOUR DATA.
              </h2>
              <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px' }}>
                Don't wait for the snap. Detect it now.
              </p>
              <motion.button whileHover={{ scale: 1.06, boxShadow: '0 30px 80px rgba(6,182,212,0.5)' }} whileTap={{ scale: 0.95 }}
                onClick={handleEnter}
                style={{
                  padding: '22px 56px', fontSize: '19px', fontWeight: '800',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #8b5cf6 50%, #06b6d4 100%)',
                  color: 'white', border: 'none', borderRadius: '16px', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '12px',
                  boxShadow: '0 15px 50px rgba(6,182,212,0.35)',
                  fontFamily: "'DM Sans', sans-serif"
                }}>
                <FiActivity /> Start Free Analysis Now
              </motion.button>
            </motion.div>
          </section>

          {/* Footer */}
          <footer style={{ padding: '32px 48px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', color: '#475569', letterSpacing: '2px' }}>
              STRIDEX<span style={{ color: '#06b6d4' }}>-AI</span>
            </span>
            <span style={{ color: '#334155', fontSize: '13px' }}>
              Powered by MediaPipe + FastAPI · Built for Athletes
            </span>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
