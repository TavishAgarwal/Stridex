import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadialBarChart, RadialBar, PolarAngleAxis,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label
} from 'recharts';
import { FiGitMerge, FiUpload, FiZap, FiTrendingUp, FiTrendingDown, FiMinus, FiAlertTriangle } from 'react-icons/fi';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// ── Helpers ──────────────────────────────────────────────────────────────────
function getDeltaColor(label) {
  if (label === 'Improved') return '#10b981';
  if (label === 'Worsened') return '#ef4444';
  return '#f59e0b';
}
function getDeltaArrow(label) {
  if (label === 'Improved') return <FiTrendingUp />;
  if (label === 'Worsened') return <FiTrendingDown />;
  return <FiMinus />;
}
function pctDisplay(val) {
  const pct = Math.round(Math.abs(val) * 100);
  return `${pct}%`;
}
function getImprovementLabel(score) {
  if (score >= 75) return 'Elite Improvement';
  if (score >= 50) return 'Strong Improvement';
  if (score >= 25) return 'Moderate Improvement';
  if (score >= 10) return 'Minimal Change';
  return 'No Change Detected';
}
function getQuadrantLabel(perf, risk) {
  const highPerf = perf > 0.5;
  const highRisk = risk > 0.5;
  if (highPerf && highRisk) return 'High Performance / High Risk';
  if (highPerf && !highRisk) return '✅ Optimal Zone';
  if (!highPerf && highRisk) return '⚠ Danger Zone';
  return 'Inefficient Zone';
}

// ── Sub-components ────────────────────────────────────────────────────────────
function DeltaCard({ metric, value, label }) {
  const color = getDeltaColor(label);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        background: `linear-gradient(135deg, ${color}18 0%, rgba(15,23,42,0.9) 100%)`,
        border: `1px solid ${color}40`,
        borderRadius: '16px',
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{metric}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '2rem', fontWeight: '900', color }}>{pctDisplay(value)}</span>
        <span style={{ fontSize: '1.4rem', color }}>{getDeltaArrow(label)}</span>
      </div>
      <div style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '999px',
        background: `${color}25`,
        color,
        fontSize: '11px',
        fontWeight: '700',
        width: 'fit-content',
      }}>{label}</div>
    </motion.div>
  );
}

function ImprovementGauge({ score }) {
  const data = [{ value: score, fill: score >= 50 ? '#10b981' : score >= 25 ? '#f59e0b' : '#64748b' }];
  return (
    <div style={{ textAlign: 'center' }}>
      <ResponsiveContainer width="100%" height={220}>
        <RadialBarChart cx="50%" cy="70%" innerRadius="65%" outerRadius="95%" startAngle={180} endAngle={0} data={data} barSize={18}>
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background={{ fill: 'rgba(255,255,255,0.05)' }} dataKey="value" angleAxisId={0} cornerRadius={8} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{ marginTop: '-60px' }}>
        <div style={{ fontSize: '3.2rem', fontWeight: '900', color: score >= 50 ? '#10b981' : score >= 25 ? '#f59e0b' : '#94a3b8' }}>{score}</div>
        <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '700', marginTop: '4px' }}>{getImprovementLabel(score)}</div>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Overall Biomechanical Improvement</div>
      </div>
    </div>
  );
}

const QuadrantTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, performance, risk } = payload[0].payload;
  return (
    <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px' }}>
      <div style={{ fontWeight: '700', color: 'white', marginBottom: '4px' }}>Video {name}</div>
      <div style={{ fontSize: '12px', color: '#94a3b8' }}>Performance: <b style={{ color: 'white' }}>{(performance * 100).toFixed(1)}%</b></div>
      <div style={{ fontSize: '12px', color: '#94a3b8' }}>Risk: <b style={{ color: 'white' }}>{(risk * 100).toFixed(1)}%</b></div>
      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{getQuadrantLabel(performance, risk)}</div>
    </div>
  );
};

function PerformanceRiskQuadrant({ dataA, dataB }) {
  const scatter = [
    { name: 'A', performance: dataA.performance, risk: dataA.risk, fill: '#06b6d4' },
    { name: 'B', performance: dataB.performance, risk: dataB.risk, fill: '#8b5cf6' },
  ];
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis type="number" dataKey="performance" name="Performance" domain={[0, 1]} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `${Math.round(v * 100)}%`}>
          <Label value="Performance →" position="insideBottom" offset={-24} style={{ fill: '#64748b', fontSize: 11 }} />
        </XAxis>
        <YAxis type="number" dataKey="risk" name="Risk" domain={[0, 1]} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `${Math.round(v * 100)}%`}>
          <Label value="Risk ↑" angle={-90} position="insideLeft" offset={10} style={{ fill: '#64748b', fontSize: 11 }} />
        </YAxis>
        <ReferenceLine x={0.5} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
        <ReferenceLine y={0.5} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
        <Tooltip content={<QuadrantTooltip />} cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={scatter} shape={(props) => {
          const { cx, cy, payload } = props;
          return (
            <g>
              <circle cx={cx} cy={cy} r={14} fill={payload.fill} opacity={0.25} />
              <circle cx={cx} cy={cy} r={7} fill={payload.fill} />
              <text x={cx + 12} y={cy - 8} fontSize="12" fontWeight="700" fill={payload.fill}>{payload.name}</text>
            </g>
          );
        }} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function InsightCard({ insights }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(15,23,42,0.95))', border: '1px solid rgba(14,165,233,0.25)', borderRadius: '18px', padding: '28px 32px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <FiZap style={{ color: '#0ea5e9', fontSize: '1.2rem' }} />
        <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '1.15rem', fontWeight: '800' }}>{insights.headline}</h3>
      </div>

      {insights.positives?.length > 0 && !insights.positives[0].startsWith('No major') && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>✅ Positives</div>
          {insights.positives.map((p, i) => (
            <div key={i} style={{ fontSize: '13px', color: '#d1fae5', marginBottom: '6px', display: 'flex', gap: '8px' }}>
              <span style={{ color: '#10b981', flexShrink: 0 }}>•</span> {p}
            </div>
          ))}
        </div>
      )}

      {insights.concerns?.length > 0 && !insights.concerns[0].startsWith('No significant') && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>⚠ Concerns</div>
          {insights.concerns.map((c, i) => (
            <div key={i} style={{ fontSize: '13px', color: '#fecaca', marginBottom: '6px', display: 'flex', gap: '8px' }}>
              <span style={{ color: '#ef4444', flexShrink: 0 }}>•</span> {c}
            </div>
          ))}
        </div>
      )}

      <div style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: '10px', padding: '14px 16px', marginTop: '6px' }}>
        <div style={{ fontSize: '11px', color: '#0ea5e9', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>→ Recommendation</div>
        <div style={{ fontSize: '13px', color: '#bae6fd' }}>{insights.recommendation}</div>
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
function ComparisonMode() {
  const [videoA, setVideoA] = useState(null);
  const [videoB, setVideoB] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [criticalMode, setCriticalMode] = useState(false);

  const vidARef = useRef(null);
  const vidBRef = useRef(null);

  const handleCompare = useCallback(async () => {
    if (!videoA || !videoB) { setError('Please upload both videos.'); return; }
    setError('');
    setAnalyzing(true);
    setResult(null);
    setCriticalMode(false);
    try {
      const fd = new FormData();
      fd.append('video_a', videoA);
      fd.append('video_b', videoB);
      const { data } = await axios.post(`${BACKEND_URL}/compare-sessions`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      });
      setResult(data);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Analysis failed. Ensure both videos contain a visible person.');
    } finally {
      setAnalyzing(false);
    }
  }, [videoA, videoB]);

  const handleCriticalMoment = useCallback(() => {
    if (!result || !vidARef.current || !vidBRef.current) return;
    const fps = 5; // we sample every 5th frame, so each index ≈ 1s
    const timeA = result.video_A.peak_risk_frame / fps;
    const timeB = result.video_B.peak_risk_frame / fps;
    vidARef.current.currentTime = timeA;
    vidBRef.current.currentTime = timeB;
    setCriticalMode(true);
    setTimeout(() => setCriticalMode(false), 5000);
  }, [result]);

  const videoPreviewStyle = (active) => ({
    width: '100%',
    borderRadius: '12px',
    border: `2px solid ${active ? '#ef4444' : 'transparent'}`,
    boxShadow: active ? '0 0 24px rgba(239,68,68,0.5)' : 'none',
    transition: 'all 0.4s ease',
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #0891b2 100%)', padding: '36px 44px', borderRadius: '22px', marginBottom: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid rgba(6,182,212,0.25)', textAlign: 'center' }}
      >
        <h2 style={{ color: 'white', margin: '0 0 10px', fontSize: '2.2rem', fontWeight: '900', letterSpacing: '-0.5px' }}>
          <FiGitMerge style={{ marginRight: '14px', verticalAlign: 'middle' }} />
          Biomechanical Intelligence Comparison
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.75)', margin: 0, fontSize: '15px' }}>
          Upload two sessions to get composite improvement scores, delta analysis, and AI coaching insights
        </p>
      </motion.div>

      {/* Upload Row — explicit order: A | VS | B */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: '20px', marginBottom: '24px', alignItems: 'center' }}>

        {/* Video A */}
        <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', padding: '22px', borderRadius: '18px', border: '1px solid rgba(6,182,212,0.2)' }}>
          <h3 style={{ color: '#06b6d4', margin: '0 0 14px', fontSize: '1.1rem', fontWeight: '700' }}>📹 Video A — Baseline</h3>
          {videoA ? (
            <div>
              <video ref={vidARef} src={URL.createObjectURL(videoA)} controls style={videoPreviewStyle(criticalMode)} />
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>✅ {videoA.name}</div>
            </div>
          ) : (
            <label style={{ display: 'block', padding: '48px 16px', background: 'rgba(6,182,212,0.06)', border: '2px dashed rgba(6,182,212,0.3)', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(6,182,212,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(6,182,212,0.06)'}
            >
              <FiUpload style={{ fontSize: '2rem', color: '#06b6d4', marginBottom: '10px' }} />
              <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>Click to upload</p>
              <input type="file" accept="video/*" onChange={e => setVideoA(e.target.files[0])} style={{ display: 'none' }} />
            </label>
          )}
        </div>

        {/* VS — centre column */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: '900', background: 'linear-gradient(135deg,#f97316,#ea580c)', borderRadius: '50%', width: '58px', height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 8px 24px rgba(249,115,22,0.5)' }}>
            VS
          </div>
        </div>

        {/* Video B */}
        <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', padding: '22px', borderRadius: '18px', border: '1px solid rgba(139,92,246,0.2)' }}>
          <h3 style={{ color: '#8b5cf6', margin: '0 0 14px', fontSize: '1.1rem', fontWeight: '700' }}>📹 Video B — Comparison</h3>
          {videoB ? (
            <div>
              <video ref={vidBRef} src={URL.createObjectURL(videoB)} controls style={videoPreviewStyle(criticalMode)} />
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>✅ {videoB.name}</div>
            </div>
          ) : (
            <label style={{ display: 'block', padding: '48px 16px', background: 'rgba(139,92,246,0.06)', border: '2px dashed rgba(139,92,246,0.3)', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(139,92,246,0.06)'}
            >
              <FiUpload style={{ fontSize: '2rem', color: '#8b5cf6', marginBottom: '10px' }} />
              <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>Click to upload</p>
              <input type="file" accept="video/*" onChange={e => setVideoB(e.target.files[0])} style={{ display: 'none' }} />
            </label>
          )}
        </div>

      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '12px 18px', marginBottom: '16px', color: '#fca5a5', fontSize: '13px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <FiAlertTriangle /> {error}
        </div>
      )}

      {/* Compare Button */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleCompare}
          disabled={!videoA || !videoB || analyzing}
          style={{
            padding: '16px 52px',
            fontSize: '16px',
            background: videoA && videoB && !analyzing ? 'linear-gradient(135deg,#10b981,#059669)' : '#334155',
            color: 'white',
            border: 'none',
            borderRadius: '14px',
            cursor: videoA && videoB && !analyzing ? 'pointer' : 'not-allowed',
            fontWeight: '700',
            boxShadow: videoA && videoB && !analyzing ? '0 8px 32px rgba(16,185,129,0.45)' : 'none',
            transition: 'all 0.3s',
          }}
        >
          {analyzing ? '⏳ Analyzing Both Videos…' : '🔬 Run Biomechanical Comparison'}
        </motion.button>
      </div>

      {/* Intelligence Dashboard */}
      <AnimatePresence>
        {result && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

            {/* ── Row 1: Improvement Score + Critical Moment ─────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              {/* Gauge */}
              <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', borderRadius: '18px', padding: '28px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>📊 Biomechanical Improvement Score</div>
                <ImprovementGauge score={result.improvement_score} />
              </div>

              {/* Critical Moment + Peak Stats */}
              <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', borderRadius: '18px', padding: '28px', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>⚡ Critical Moment Analysis</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  {[
                    { label: 'Video A Peak Risk', value: `${result.video_A.peak_risk}%`, color: '#06b6d4' },
                    { label: 'Video B Peak Risk', value: `${result.video_B.peak_risk}%`, color: '#8b5cf6' },
                    { label: 'A Consistency', value: `${result.video_A.consistency_index.toFixed(0)}/100`, color: '#06b6d4' },
                    { label: 'B Consistency', value: `${result.video_B.consistency_index.toFixed(0)}/100`, color: '#8b5cf6' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>{label}</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '800', color }}>{value}</div>
                    </div>
                  ))}
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCriticalMoment}
                  disabled={!videoA || !videoB}
                  style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg,rgba(239,68,68,0.8),rgba(220,38,38,0.8))', color: 'white', border: '1px solid rgba(239,68,68,0.5)', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', boxShadow: '0 6px 20px rgba(239,68,68,0.3)' }}
                >
                  🎯 Compare Critical Moment — Seek to Peak Risk
                </motion.button>
                {criticalMode && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '10px', fontSize: '12px', color: '#fca5a5', textAlign: 'center', fontWeight: '600' }}>
                    ⚡ Both videos seeked to peak risk frame — red glow highlights critical moment
                  </motion.div>
                )}
              </div>
            </div>

            {/* ── Row 2: Delta Cards ─────────────────────────────────────────── */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '14px', letterSpacing: '0.5px' }}>📉 Delta Intelligence — A vs B</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                {[
                  { metric: 'Injury Risk', ...result.deltas.risk },
                  { metric: 'Movement Asymmetry', ...result.deltas.asymmetry },
                  { metric: 'Fatigue Accumulation', ...result.deltas.fatigue },
                  { metric: 'Form Consistency', ...result.deltas.consistency },
                ].map(d => <DeltaCard key={d.metric} metric={d.metric} value={d.value} label={d.label} />)}
              </div>
            </div>

            {/* ── Row 3: Quadrant + AI Insights ─────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              {/* Quadrant */}
              <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', borderRadius: '18px', padding: '24px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>🎯 Performance vs Risk Quadrant</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '16px' }}>
                  <span style={{ color: '#06b6d4', fontWeight: '700' }}>● A</span> &nbsp;
                  <span style={{ color: '#8b5cf6', fontWeight: '700' }}>● B</span> — Bottom-right is optimal
                </div>
                <PerformanceRiskQuadrant dataA={result.performance_risk.A} dataB={result.performance_risk.B} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                  {['A', 'B'].map(v => {
                    const d = result.performance_risk[v];
                    const color = v === 'A' ? '#06b6d4' : '#8b5cf6';
                    return (
                      <div key={v} style={{ background: `${color}10`, border: `1px solid ${color}30`, borderRadius: '8px', padding: '8px 12px' }}>
                        <span style={{ color, fontWeight: '700', fontSize: '12px' }}>Video {v}: </span>
                        <span style={{ color: '#94a3b8', fontSize: '11px' }}>{getQuadrantLabel(d.performance, d.risk)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Insights */}
              <InsightCard insights={result.insights} />
            </div>

            {/* ── Row 4: Raw metrics mini-table ─────────────────────────────── */}
            <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', borderRadius: '18px', padding: '24px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>📋 Raw Session Metrics</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      {['Metric', 'Video A', 'Video B', 'Winner'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 14px', color: '#64748b', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Avg Risk', a: `${result.video_A.avg_risk}%`, b: `${result.video_B.avg_risk}%`, winner: result.video_A.avg_risk > result.video_B.avg_risk ? 'B' : 'A', invert: false },
                      { label: 'Peak Risk', a: `${result.video_A.peak_risk}%`, b: `${result.video_B.peak_risk}%`, winner: result.video_A.peak_risk > result.video_B.peak_risk ? 'B' : 'A', invert: false },
                      { label: 'Avg Asymmetry', a: `${result.video_A.avg_asymmetry}%`, b: `${result.video_B.avg_asymmetry}%`, winner: result.video_A.avg_asymmetry > result.video_B.avg_asymmetry ? 'B' : 'A', invert: false },
                      { label: 'Fatigue Score', a: result.video_A.fatigue_score.toFixed(1), b: result.video_B.fatigue_score.toFixed(1), winner: result.video_A.fatigue_score > result.video_B.fatigue_score ? 'B' : 'A', invert: false },
                      { label: 'Consistency Index', a: result.video_A.consistency_index.toFixed(1), b: result.video_B.consistency_index.toFixed(1), winner: result.video_A.consistency_index < result.video_B.consistency_index ? 'B' : 'A', invert: true },
                    ].map(({ label, a, b, winner }) => (
                      <tr key={label} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{label}</td>
                        <td style={{ padding: '10px 14px', color: winner === 'A' ? '#10b981' : '#e2e8f0', fontWeight: winner === 'A' ? '800' : '400' }}>{a}</td>
                        <td style={{ padding: '10px 14px', color: winner === 'B' ? '#10b981' : '#e2e8f0', fontWeight: winner === 'B' ? '800' : '400' }}>{b}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ background: winner === 'A' ? 'rgba(6,182,212,0.2)' : 'rgba(139,92,246,0.2)', color: winner === 'A' ? '#06b6d4' : '#8b5cf6', borderRadius: '999px', padding: '2px 10px', fontSize: '11px', fontWeight: '700' }}>
                            Video {winner} ✦
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ComparisonMode;