import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';

import TopNavbar from '../components/layout/TopNavbar';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';
import StatusBadge from '../components/shared/StatusBadge';
import SectionHeader from '../components/shared/SectionHeader';
import ProgressBar from '../components/shared/ProgressBar';
import CircularGauge from '../components/shared/CircularGauge';
import ComparisonMode from '../components/ComparisonMode';
import {
    BRAND, RISK_LEVELS, AI_FEATURES, PRO_TIPS,
    FEATURE_PILLS, INFO_CARDS, MODE_TABS,
} from '../config/siteConfig';
import useVideoAnalysis from '../hooks/useVideoAnalysis';
import useFrameAnalysis from '../hooks/useFrameAnalysis';
import EnhancedLiveCamera from '../components/EnhancedLiveCamera';

/* ── MediaPipe pose skeleton connections ── */
const POSE_CONNECTIONS = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],   // arms
    [11, 23], [12, 24], [23, 24],                     // torso
    [23, 25], [25, 27], [24, 26], [26, 28],             // legs
    [27, 29], [29, 31], [28, 30], [30, 32],             // feet
    [15, 17], [15, 19], [15, 21], [16, 18], [16, 20], [16, 22], // hands
];

/* ─────────────────────────────────────────────
   SUB-PANEL: Video Analysis (upload) + inline preview
   ───────────────────────────────────────────── */
function VideoAnalysisPanel() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [result, setResult] = useState(null);
    const { analyze, loading, progress, error } = useVideoAnalysis();
    const navigate = useNavigate();
    const { isGuest } = useAuth();

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) { setSelectedFile(acceptedFiles[0]); setResult(null); }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'video/*': ['.mp4', '.avi', '.mov', '.mkv'] },
        maxFiles: 1,
    });

    const handleAnalyze = async () => {
        if (!selectedFile) return;
        try {
            const res = await analyze(selectedFile);
            setResult(res);
        } catch (_) { /* handled in hook */ }
    };

    const summary = result?.analysis_summary || {};
    const score = summary.overall_video_score ?? 0;
    const category = summary.risk_category || '';
    const color = summary.risk_color || 'gray';
    const explanation = summary.what_this_means || '';
    const strengths = result?.strengths || [];

    return (
        <div className="space-y-4">
            <Card className="bg-gradient-to-r from-primary-600 to-primary-700 border-0 text-white">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">☁️</span>
                        <h2 className="text-xl font-bold">Upload Video for Analysis</h2>
                    </div>
                    <p className="text-sm text-primary-100 max-w-lg">
                        Upload your training footage. Our AI will identify biomechanical risks and provide a frame-by-frame breakdown.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <div
                            {...getRootProps()}
                            className={`flex items-center gap-2 px-5 py-2.5 bg-white text-gray-800 rounded-xl text-sm font-semibold cursor-pointer hover:bg-gray-50 transition-colors ${isDragActive ? 'ring-2 ring-cyan ring-offset-2' : ''}`}
                        >
                            <input {...getInputProps()} />
                            <span>📁</span>
                            <span>{selectedFile ? selectedFile.name : 'Choose Video File'}</span>
                        </div>
                        <Button
                            variant="secondary"
                            onClick={handleAnalyze}
                            disabled={!selectedFile || loading}
                            icon="▶"
                            className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                        >
                            {loading ? `Analyzing… ${progress}%` : 'Analyze Video'}
                        </Button>
                    </div>
                    {loading && (
                        <div className="w-full bg-white/20 rounded-full h-2 mt-3">
                            <div className="bg-white h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                    )}
                    {error && (
                        <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl mt-4">
                            <p className="text-sm font-bold">Analysis Failed</p>
                            <p className="text-xs mt-1">{error}</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Inline analysis preview */}
            {result && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="space-y-4">
                        <SectionHeader icon="📊" title="Analysis Summary" />
                        <div className="flex flex-col sm:flex-row items-start gap-6">
                            <CircularGauge value={score} max={100} color={score >= 70 ? 'emerald' : score >= 40 ? 'amber' : 'red'} size={120}
                                label={category.split('–')[0]?.trim() || ''} />
                            <div className="flex-1 space-y-3">
                                <div>
                                    <StatusBadge label={category || 'Analyzed'} variant={score >= 70 ? 'success' : score >= 40 ? 'warning' : 'danger'} />
                                    {explanation && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{explanation}</p>}
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-2">
                                        <p className="text-[10px] text-gray-400 uppercase">Avg Risk</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{summary.average_risk ?? '—'}%</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-2">
                                        <p className="text-[10px] text-gray-400 uppercase">Max Risk</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{summary.max_risk ?? '—'}%</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-2">
                                        <p className="text-[10px] text-gray-400 uppercase">Frames</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{summary.frames_analyzed ?? '—'}</p>
                                    </div>
                                </div>
                                {strengths.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {strengths.slice(0, 3).map((s, i) => (
                                            <span key={i} className="text-xs bg-emerald/10 text-emerald-dark px-2 py-1 rounded-full font-medium">
                                                ✅ {s.area || s}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="primary" className="flex-1 justify-center" iconRight="→"
                                onClick={() => {
                                    try {
                                        const st = isGuest ? sessionStorage : localStorage;
                                        const history = JSON.parse(st.getItem('stridex_sessions') || '[]');
                                        history.unshift({ date: new Date().toISOString(), score, category, fileName: selectedFile?.name });
                                        st.setItem('stridex_sessions', JSON.stringify(history.slice(0, 20)));
                                    } catch (_) { }
                                    navigate('/analysis', { state: { analysisData: result, fileName: selectedFile?.name } });
                                }}>
                                Show Full Analysis
                            </Button>
                        </div>
                    </Card>
                </motion.div>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────
   Draw skeleton on canvas (risk-colored)
   ───────────────────────────────────────────── */
const RISK_COLORS = { high: '#ef4444', medium: '#f59e0b', safe: '#00ff88' };

function drawSkeleton(ctx, landmarks, width, height, riskZones = {}) {
    if (!landmarks || landmarks.length === 0) return;
    ctx.clearRect(0, 0, width, height);

    const getJointColor = (idx) => {
        const zone = riskZones[String(idx)];
        return RISK_COLORS[zone] || RISK_COLORS.safe;
    };

    // Draw connections with risk-aware coloring
    ctx.lineWidth = 3;
    for (const [a, b] of POSE_CONNECTIONS) {
        const la = landmarks[a];
        const lb = landmarks[b];
        if (!la || !lb) continue;
        if ((la.visibility || 0) < 0.4 || (lb.visibility || 0) < 0.4) continue;

        const colorA = getJointColor(a);
        const colorB = getJointColor(b);
        // Use the higher-risk color for the connection
        const connColor = (colorA === RISK_COLORS.high || colorB === RISK_COLORS.high)
            ? RISK_COLORS.high
            : (colorA === RISK_COLORS.medium || colorB === RISK_COLORS.medium)
                ? RISK_COLORS.medium
                : RISK_COLORS.safe;

        ctx.strokeStyle = connColor;
        ctx.shadowBlur = 6;
        ctx.shadowColor = connColor;
        ctx.beginPath();
        ctx.moveTo(la.x * width, la.y * height);
        ctx.lineTo(lb.x * width, lb.y * height);
        ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Draw joints with risk coloring
    for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i];
        if (!lm || (lm.visibility || 0) < 0.4) continue;
        const color = getJointColor(i);
        const radius = (color !== RISK_COLORS.safe) ? 7 : 5;
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
}

/* ─────────────────────────────────────────────
   SUB-PANEL: Compare Videos — Full Intelligence Dashboard
   ───────────────────────────────────────────── */
function CompareVideosPanel() {
    // Delegate entirely to the ComparisonMode intelligence dashboard
    return <ComparisonMode />;
}

/* ─────────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────────── */
export default function UploadLanding() {
    const { isGuest } = useAuth();
    const [activeMode, setActiveMode] = useState('video');
    const [athleteProfile, setAthleteProfile] = useState(() => localStorage.getItem('stridex_profile') || 'amateur');
    const [showHistory, setShowHistory] = useState(false);
    const store = isGuest ? sessionStorage : localStorage;
    const recentSessions = JSON.parse(store.getItem('stridex_sessions') || '[]').slice(0, 5);

    return (
        <div className="min-h-screen bg-surface-secondary dark:bg-[#050d1a] transition-colors duration-300">
            <TopNavbar />

            <div className="max-w-[1600px] mx-auto px-4 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
                    {/* Left Column */}
                    <div className="space-y-8">
                        {/* Hero */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-4">
                            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight">
                                Advanced Biomechanical{' '}
                                <span className="bg-gradient-to-r from-primary-600 via-purple to-cyan bg-clip-text text-transparent">
                                    Injury Risk Detection
                                </span>
                            </h1>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                {FEATURE_PILLS.map((p) => (
                                    <span key={p.label} className="flex items-center gap-1.5"><span>{p.icon}</span><span>{p.label}</span></span>
                                ))}
                            </div>
                        </motion.div>

                        {/* Mode Tabs */}
                        <div className="flex items-center bg-white dark:bg-slate-800 rounded-2xl shadow-glass dark:shadow-none border border-surface-border dark:border-slate-700 p-1.5 w-fit">
                            {MODE_TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveMode(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeMode === tab.id
                                        ? 'bg-primary-600 text-white shadow-md'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <span>{tab.icon}</span><span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Content area */}
                        <div className="mt-6">
                            {activeMode === 'video' && <VideoAnalysisPanel />}
                            {activeMode === 'camera' && <EnhancedLiveCamera />}
                            {activeMode === 'compare' && <CompareVideosPanel />}
                        </div>

                        {activeMode === 'video' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {INFO_CARDS.map((card) => (
                                    <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                                        <Card className="hover:shadow-glass-lg transition-shadow">
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${card.iconBg}`}>{card.icon}</span>
                                                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{card.title}</h3>
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{card.description}</p>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar */}
                    <motion.aside initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="space-y-6">
                        {/* Athlete Profile Selector */}
                        <Card>
                            <SectionHeader icon="👤" title="Athlete Profile" className="mb-3" />
                            <div className="flex gap-1">
                                {['amateur', 'semi-pro', 'pro'].map(p => (
                                    <button key={p} onClick={() => { setAthleteProfile(p); localStorage.setItem('stridex_profile', p); }}
                                        className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg capitalize transition-all ${athleteProfile === p ? 'bg-primary-600 text-white shadow-md' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                                        {p === 'semi-pro' ? 'Semi-Pro' : p.charAt(0).toUpperCase() + p.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2">
                                {athleteProfile === 'pro' ? 'Strictest thresholds — professional-grade form standards.' :
                                    athleteProfile === 'semi-pro' ? 'Balanced thresholds — competitive athlete standards.' :
                                        'Relaxed thresholds — forgiving standards for recreational athletes.'}
                            </p>
                        </Card>

                        {/* Session History */}
                        <Card>
                            <button onClick={() => setShowHistory(!showHistory)} className="flex items-center justify-between w-full">
                                <SectionHeader icon="📋" title="Recent Sessions" />
                                <span className="text-gray-400 text-xs">{showHistory ? '▲' : '▼'}</span>
                            </button>
                            {showHistory && (
                                <div className="mt-3 space-y-2">
                                    {recentSessions.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">No sessions yet. Analyze a video to create your first session.</p>
                                    ) : recentSessions.map((s, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-slate-700 rounded-lg px-3 py-2">
                                            <div>
                                                <p className="font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[140px]">{s.fileName || 'Session'}</p>
                                                <p className="text-gray-400">{new Date(s.date).toLocaleDateString()}</p>
                                            </div>
                                            <span className={`font-bold ${s.score >= 70 ? 'text-emerald' : s.score >= 40 ? 'text-amber-dark' : 'text-danger'}`}>{s.score}/100</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>

                        <Card>
                            <SectionHeader icon="📊" title="Risk Levels" className="mb-4 pb-3 border-b border-surface-border" />
                            <div className="space-y-3">
                                {RISK_LEVELS.map((level) => (
                                    <div key={level.id} className={`p-3 rounded-xl border-l-4 ${level.id === 'high' ? 'bg-danger/5 border-l-danger' :
                                        level.id === 'medium' ? 'bg-amber/5 border-l-amber' : 'bg-emerald/5 border-l-emerald'
                                        }`}>
                                        <p className={`text-xs font-bold uppercase ${level.id === 'high' ? 'text-danger' : level.id === 'medium' ? 'text-amber-dark' : 'text-emerald-dark'}`}>
                                            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${level.id === 'high' ? 'bg-danger' : level.id === 'medium' ? 'bg-amber' : 'bg-emerald'}`} />
                                            {level.label}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">{level.description}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                        <Card>
                            <SectionHeader icon="🔬" title="AI Features" className="mb-4" />
                            <ul className="space-y-3">
                                {AI_FEATURES.map((f) => <li key={f.label} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400"><span className="text-base">{f.icon}</span><span>{f.label}</span></li>)}
                            </ul>
                        </Card>
                        <Card>
                            <SectionHeader icon="💡" title="Pro Tips" className="mb-4" />
                            <ul className="space-y-3">
                                {PRO_TIPS.map((tip) => <li key={tip.label} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400"><span className="text-base">{tip.icon}</span><span>{tip.label}</span></li>)}
                            </ul>
                        </Card>
                    </motion.aside>
                </div>
            </div>

            <footer className="mt-16 py-6 text-center text-sm text-gray-400 border-t border-surface-border dark:border-slate-700">
                {BRAND.copyright}
            </footer>
        </div>
    );
}
