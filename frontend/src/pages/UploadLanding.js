import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
    BRAND, RISK_LEVELS, AI_FEATURES, PRO_TIPS,
    FEATURE_PILLS, INFO_CARDS, MODE_TABS,
} from '../config/siteConfig';
import useVideoAnalysis from '../hooks/useVideoAnalysis';
import useFrameAnalysis from '../hooks/useFrameAnalysis';

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
    const { analyze, loading, progress } = useVideoAnalysis();
    const navigate = useNavigate();

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
                                    {explanation && <p className="text-sm text-gray-600 mt-2">{explanation}</p>}
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="bg-gray-50 rounded-xl p-2">
                                        <p className="text-[10px] text-gray-400 uppercase">Avg Risk</p>
                                        <p className="text-lg font-bold text-gray-900">{summary.average_risk ?? '—'}%</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-2">
                                        <p className="text-[10px] text-gray-400 uppercase">Max Risk</p>
                                        <p className="text-lg font-bold text-gray-900">{summary.max_risk ?? '—'}%</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-2">
                                        <p className="text-[10px] text-gray-400 uppercase">Frames</p>
                                        <p className="text-lg font-bold text-gray-900">{summary.frames_analyzed ?? '—'}</p>
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
                        <Button variant="primary" className="w-full justify-center" iconRight="→"
                            onClick={() => navigate('/analysis', { state: { analysisData: result, fileName: selectedFile?.name } })}>
                            Show Full Analysis
                        </Button>
                    </Card>
                </motion.div>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────
   Draw skeleton on canvas
   ───────────────────────────────────────────── */
function drawSkeleton(ctx, landmarks, width, height) {
    if (!landmarks || landmarks.length === 0) return;
    ctx.clearRect(0, 0, width, height);

    // Draw connections
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#00ff88';
    for (const [a, b] of POSE_CONNECTIONS) {
        const la = landmarks[a];
        const lb = landmarks[b];
        if (!la || !lb) continue;
        if ((la.visibility || 0) < 0.4 || (lb.visibility || 0) < 0.4) continue;
        ctx.beginPath();
        ctx.moveTo(la.x * width, la.y * height);
        ctx.lineTo(lb.x * width, lb.y * height);
        ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Draw joints
    for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i];
        if (!lm || (lm.visibility || 0) < 0.4) continue;
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#00ff88';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
}

/* ─────────────────────────────────────────────
   SUB-PANEL: Live Camera (inline telemetry + skeleton)
   ───────────────────────────────────────────── */
function LiveCameraPanel() {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const intervalRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [sessionTime, setSessionTime] = useState(0);
    const { analyzeFrame, latestResult, isConnected, latency, resetSession } = useFrameAnalysis();

    useEffect(() => {
        let t;
        if (isRecording) t = setInterval(() => setSessionTime((s) => s + 1), 1000);
        return () => clearInterval(t);
    }, [isRecording]);

    // Draw skeleton when result updates
    useEffect(() => {
        const athlete = latestResult?.athletes?.[0];
        const landmarks = athlete?.landmarks;
        const canvas = canvasRef.current;
        const video = webcamRef.current?.video;
        if (canvas && video) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            drawSkeleton(ctx, landmarks, canvas.width, canvas.height);
        }
    }, [latestResult]);

    const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    const captureAndAnalyze = useCallback(async () => {
        if (!webcamRef.current) return;
        const src = webcamRef.current.getScreenshot();
        if (!src) return;
        const blob = await fetch(src).then((r) => r.blob());
        await analyzeFrame(blob);
    }, [analyzeFrame]);

    const handleStart = () => { setIsRecording(true); setSessionTime(0); intervalRef.current = setInterval(captureAndAnalyze, 1000); };
    const handleStop = () => { setIsRecording(false); if (intervalRef.current) clearInterval(intervalRef.current); };
    const handleReset = () => { handleStop(); setSessionTime(0); resetSession(); };

    const athlete = latestResult?.athletes?.[0];
    const risk = athlete?.risk_assessment || {};
    const temporal = athlete?.temporal_analysis || {};
    const bio = risk.biomechanics || {};
    const kv = bio.knee_valgus || {};
    const sa = bio.stride_asymmetry || {};
    const posture = bio.posture || {};
    const riskScore = risk.risk_score ?? 0;
    const riskLevel = risk.risk_level || '';
    const riskFactors = risk.risk_factors || [];
    const confidence = risk.overall_confidence ?? 0;

    const fatigueScore = temporal.fatigue_score ?? 0;
    const trendDir = temporal.trend_direction || 'stable';
    const injuryProb = temporal.injury_probability ?? 0;
    const mlRiskLevel = temporal.ml_risk_level || '';
    const coaching = temporal.coaching_recommendation || {};

    const parseAngle = (s) => (s ? parseFloat(String(s).replace('°', '')) : 0) || 0;
    const parsePct = (s) => (s ? parseFloat(String(s).replace('%', '')) : 0) || 0;
    const leftAngle = parseAngle(kv.left_angle);
    const rightAngle = parseAngle(kv.right_angle);
    const asymmetry = parsePct(sa.asymmetry_percent);
    const postureScore = posture.posture_score ?? 1;

    const trendIcon = trendDir === 'degrading' ? '📉' : trendDir === 'improving' ? '📈' : '➡️';
    const trendColor = trendDir === 'degrading' ? 'text-danger' : trendDir === 'improving' ? 'text-emerald' : 'text-gray-500';

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Live Session</h2>
                    <p className="text-xs text-gray-500">Camera (USB) • 60fps</p>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge label={isConnected ? 'CONNECTED' : 'STANDBY'} variant={isConnected ? 'success' : 'neutral'} dot={isConnected ? 'bg-emerald' : undefined} />
                    {mlRiskLevel && <StatusBadge label={`ML: ${mlRiskLevel}`} variant={mlRiskLevel === 'HIGH' ? 'danger' : mlRiskLevel === 'MEDIUM' ? 'warning' : 'success'} />}
                    <span className="text-xs text-gray-400">Latency: {latency}ms</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
                <div className="space-y-4">
                    <Card noPadding className="overflow-hidden">
                        <div className="relative aspect-video bg-gray-900">
                            <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg" className="w-full h-full object-cover" videoConstraints={{ facingMode: 'user' }} />
                            {/* Skeleton overlay canvas */}
                            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ objectFit: 'cover' }} />
                            {isRecording && (
                                <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                                    <span className="w-2 h-2 bg-danger rounded-full animate-pulse" /> LIVE REC
                                </div>
                            )}
                            {isRecording && (
                                <div className="absolute top-3 right-3 space-y-1.5">
                                    <div className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white ${riskScore >= 70 ? 'bg-danger/80' : riskScore >= 40 ? 'bg-amber/80' : 'bg-emerald/80'}`}>
                                        RISK: {riskScore}% {riskLevel && `• ${riskLevel}`}
                                    </div>
                                    <div className="bg-primary-600/80 text-white text-xs px-3 py-1.5 rounded-lg font-bold">
                                        CONFIDENCE: {Math.round(confidence * 100)}%
                                    </div>
                                </div>
                            )}
                            <div className="absolute bottom-3 left-3 bg-black/60 text-white text-[10px] px-2 py-1 rounded font-mono">RES: 720p • FPS: 60</div>
                        </div>
                    </Card>

                    {coaching.recommendation && coaching.recommendation !== 'Continue training' && (
                        <Card className={`${coaching.recommendation === 'Substitute player' ? 'bg-danger/5 border-danger/30' : 'bg-amber/5 border-amber/30'} border`}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-base">{coaching.recommendation === 'Substitute player' ? '🚨' : '⚡'}</span>
                                <h4 className="text-sm font-bold text-gray-900">{coaching.recommendation}</h4>
                                <StatusBadge label="AI COACHING" variant={coaching.recommendation === 'Substitute player' ? 'danger' : 'warning'} />
                            </div>
                            <p className="text-xs text-gray-600">{coaching.reason}</p>
                        </Card>
                    )}

                    {riskFactors.length > 0 && (
                        <Card>
                            <SectionHeader icon="⚠️" title="Active Risk Factors" className="mb-2" />
                            <div className="flex flex-wrap gap-1.5">
                                {riskFactors.map((rf, i) => (
                                    <span key={i} className={`text-[10px] px-2 py-1 rounded-full font-semibold ${rf.severity === 'HIGH' ? 'bg-danger/10 text-danger' : rf.severity === 'MEDIUM' ? 'bg-amber/10 text-amber-dark' : 'bg-emerald/10 text-emerald-dark'}`}>
                                        {rf.factor} ({rf.contribution}%)
                                    </span>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                <div className="space-y-3">
                    <Card>
                        <SectionHeader icon="📊" title="Real-Time Biometrics" />
                        <p className="text-[10px] text-gray-400 mt-1">Live data from AI model v2.4</p>
                    </Card>

                    <Card className="py-3 px-5">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Fatigue</p>
                                <p className={`text-2xl font-bold ${fatigueScore > 60 ? 'text-danger' : fatigueScore > 30 ? 'text-amber-dark' : 'text-emerald'}`}>{fatigueScore}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Injury</p>
                                <p className={`text-2xl font-bold ${injuryProb > 0.5 ? 'text-danger' : injuryProb > 0.25 ? 'text-amber-dark' : 'text-emerald'}`}>{Math.round(injuryProb * 100)}%</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Trend</p>
                                <p className={`text-2xl font-bold ${trendColor}`}>{trendIcon}</p>
                                <p className={`text-[9px] capitalize ${trendColor}`}>{trendDir}</p>
                            </div>
                        </div>
                        <ProgressBar value={fatigueScore} max={100} label="Fatigue" color={fatigueScore > 60 ? 'red' : fatigueScore > 30 ? 'amber' : 'emerald'} className="mt-2" />
                    </Card>

                    <Card className="py-4 px-5">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">KNEE FLEXION (L)</p>
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                    <span className="text-3xl font-bold text-gray-900">{leftAngle || '--'}°</span>
                                    <StatusBadge label={leftAngle >= 160 ? 'OK' : 'LOW'} variant={leftAngle >= 160 ? 'success' : 'warning'} />
                                </div>
                            </div>
                            <CircularGauge value={Math.round((leftAngle / 180) * 100) || 0} max={100} color={leftAngle >= 160 ? 'blue' : 'amber'} size={48} />
                        </div>
                        <ProgressBar value={leftAngle} max={180} color={leftAngle >= 160 ? 'blue' : 'amber'} showLabel className="mt-2" />
                    </Card>

                    <Card className={`py-4 px-5 ${rightAngle < 160 && rightAngle > 0 ? 'ring-1 ring-amber/30 bg-amber/5' : ''}`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">KNEE FLEXION (R)</p>
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                    <span className="text-3xl font-bold text-gray-900">{rightAngle || '--'}°</span>
                                    <StatusBadge label={rightAngle >= 160 ? 'OK' : '▲ LOW'} variant={rightAngle >= 160 ? 'success' : 'warning'} />
                                </div>
                            </div>
                            <CircularGauge value={Math.round((rightAngle / 180) * 100) || 0} max={100} color={rightAngle >= 160 ? 'blue' : 'amber'} size={48} />
                        </div>
                        <ProgressBar value={rightAngle} max={180} color={rightAngle >= 160 ? 'blue' : 'amber'} className="mt-2" />
                    </Card>

                    <Card className="py-4 px-5">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">STRIDE ASYM.</p>
                                <p className={`text-2xl font-bold ${asymmetry > 10 ? 'text-danger' : asymmetry > 5 ? 'text-amber-dark' : 'text-gray-900'}`}>{asymmetry || '--'}%</p>
                                <StatusBadge label={sa.status || 'N/A'} variant={asymmetry > 10 ? 'danger' : asymmetry > 5 ? 'warning' : 'success'} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">POSTURE</p>
                                <p className={`text-2xl font-bold ${postureScore < 0.7 ? 'text-danger' : postureScore < 0.85 ? 'text-amber-dark' : 'text-gray-900'}`}>{typeof postureScore === 'number' ? postureScore.toFixed(2) : '--'}</p>
                                <StatusBadge label={posture.status || 'N/A'} variant={postureScore < 0.7 ? 'danger' : postureScore < 0.85 ? 'warning' : 'success'} />
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <Card className="flex flex-wrap items-center gap-3">
                {!isRecording ? (
                    <Button variant="success" icon="🔴" onClick={handleStart}>Start Rec</Button>
                ) : (
                    <Button variant="danger" icon="⏹" onClick={handleStop}>Stop Rec</Button>
                )}
                <Button variant="secondary" icon="🔄" onClick={handleReset}>Reset Session</Button>
                <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
                    <span>⏱</span>
                    <span className="font-mono font-bold text-gray-900">Session Time: {fmt(sessionTime)}</span>
                </div>
            </Card>
        </div>
    );
}

/* ─────────────────────────────────────────────
   SUB-PANEL: Compare Videos + risk delta
   ───────────────────────────────────────────── */
function CompareVideosPanel() {
    const [fileA, setFileA] = useState(null);
    const [fileB, setFileB] = useState(null);
    const [resultA, setResultA] = useState(null);
    const [resultB, setResultB] = useState(null);
    const [loading, setLoading] = useState(false);
    const analyzerA = useVideoAnalysis();
    const analyzerB = useVideoAnalysis();

    const handleCompare = async () => {
        if (!fileA || !fileB) return;
        setLoading(true);
        try {
            const [rA, rB] = await Promise.all([analyzerA.analyze(fileA), analyzerB.analyze(fileB)]);
            setResultA(rA);
            setResultB(rB);
        } catch (_) { /* handled */ }
        setLoading(false);
    };

    const sA = resultA?.analysis_summary || {};
    const sB = resultB?.analysis_summary || {};
    const scoreA = sA.overall_video_score ?? 0;
    const scoreB = sB.overall_video_score ?? 0;
    const riskA = sA.average_risk ?? 0;
    const riskB = sB.average_risk ?? 0;
    const maxA = sA.max_risk ?? 0;
    const maxB = sB.max_risk ?? 0;

    const scoreDelta = scoreB - scoreA;
    const riskDelta = riskB - riskA;
    const maxDelta = maxB - maxA;

    const DeltaIndicator = ({ delta, label, invertColors }) => {
        const improved = invertColors ? delta < 0 : delta > 0;
        const color = delta === 0 ? 'text-gray-400' : improved ? 'text-emerald' : 'text-danger';
        const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '—';
        return (
            <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className={`font-bold ${color}`}>{arrow} {Math.abs(delta).toFixed(1)}%</span>
            </div>
        );
    };

    const ScoreCard = ({ label, data }) => {
        if (!data) return null;
        const s = data.analysis_summary || {};
        const score = s.overall_video_score ?? 0;
        return (
            <Card className="flex-1">
                <h4 className="text-sm font-bold text-gray-700 mb-3">{label}</h4>
                <div className="flex items-center gap-4">
                    <CircularGauge value={score} max={100} color={score >= 70 ? 'emerald' : score >= 40 ? 'amber' : 'red'} size={90} />
                    <div className="space-y-1 text-sm">
                        <p className="text-gray-500">Risk: <span className="font-bold text-gray-900">{s.average_risk ?? '-'}%</span></p>
                        <p className="text-gray-500">Max: <span className="font-bold text-gray-900">{s.max_risk ?? '-'}%</span></p>
                        <p className="text-gray-500">Frames: <span className="font-bold text-gray-900">{s.frames_analyzed ?? '-'}</span></p>
                        <StatusBadge label={s.risk_category || 'N/A'} variant={score >= 70 ? 'success' : score >= 40 ? 'warning' : 'danger'} />
                    </div>
                </div>
            </Card>
        );
    };

    return (
        <div className="space-y-4">
            <Card className="bg-gradient-to-r from-purple to-purple-dark border-0 text-white">
                <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">⇋</span>
                    <h2 className="text-xl font-bold">Compare Two Videos</h2>
                </div>
                <p className="text-sm text-purple-100 max-w-lg mb-4">
                    Upload two recordings to compare biomechanics side-by-side. See improvements or regressions between sessions.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 px-4 py-3 bg-white text-gray-800 rounded-xl text-sm font-semibold cursor-pointer hover:bg-gray-50 transition-colors">
                        <span>📁</span>
                        <span>{fileA ? fileA.name : 'Video A — Before'}</span>
                        <input type="file" accept="video/*" className="hidden" onChange={(e) => { setFileA(e.target.files[0]); setResultA(null); setResultB(null); }} />
                    </label>
                    <label className="flex items-center gap-2 px-4 py-3 bg-white text-gray-800 rounded-xl text-sm font-semibold cursor-pointer hover:bg-gray-50 transition-colors">
                        <span>📁</span>
                        <span>{fileB ? fileB.name : 'Video B — After'}</span>
                        <input type="file" accept="video/*" className="hidden" onChange={(e) => { setFileB(e.target.files[0]); setResultA(null); setResultB(null); }} />
                    </label>
                </div>
                <Button
                    variant="secondary"
                    className="mt-4 bg-white/20 border-white/30 text-white hover:bg-white/30"
                    onClick={handleCompare}
                    disabled={!fileA || !fileB || loading}
                    icon="⚡"
                >
                    {loading ? 'Analyzing…' : 'Compare Now'}
                </Button>
            </Card>

            {(resultA || resultB) && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ScoreCard label="Video A — Before" data={resultA} />
                        <ScoreCard label="Video B — After" data={resultB} />
                    </div>

                    {resultA && resultB && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                            <Card>
                                <SectionHeader icon="📈" title="Change Analysis (Before → After)" className="mb-4" />
                                <div className="space-y-3">
                                    <DeltaIndicator delta={scoreDelta} label="Performance Score" invertColors={false} />
                                    <DeltaIndicator delta={riskDelta} label="Average Risk" invertColors={true} />
                                    <DeltaIndicator delta={maxDelta} label="Peak Risk" invertColors={true} />
                                </div>
                                <div className={`mt-4 p-3 rounded-xl border text-sm ${riskDelta < 0 ? 'bg-emerald/5 border-emerald/20 text-emerald-dark' : riskDelta > 0 ? 'bg-danger/5 border-danger/20 text-danger' : 'bg-gray-50 border-surface-border text-gray-500'}`}>
                                    {riskDelta < 0
                                        ? `✅ Great improvement! Average risk decreased by ${Math.abs(riskDelta).toFixed(1)}%. Your technique is getting safer.`
                                        : riskDelta > 0
                                            ? `⚠️ Risk has increased by ${riskDelta.toFixed(1)}%. Consider reviewing the recommendations in the full analysis.`
                                            : `➡️ Risk level is unchanged between the two sessions.`
                                    }
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────────── */
export default function UploadLanding() {
    const [activeMode, setActiveMode] = useState('video');

    return (
        <div className="min-h-screen bg-surface-secondary">
            <TopNavbar />

            <div className="max-w-7xl mx-auto px-6 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
                    {/* Left Column */}
                    <div className="space-y-8">
                        {/* Hero */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-4">
                            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
                                Advanced Biomechanical{' '}
                                <span className="bg-gradient-to-r from-primary-600 via-purple to-cyan bg-clip-text text-transparent">
                                    Injury Risk Detection
                                </span>
                            </h1>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                {FEATURE_PILLS.map((p) => (
                                    <span key={p.label} className="flex items-center gap-1.5"><span>{p.icon}</span><span>{p.label}</span></span>
                                ))}
                            </div>
                        </motion.div>

                        {/* Mode Tabs */}
                        <div className="flex items-center bg-white rounded-2xl shadow-glass border border-surface-border p-1.5 w-fit">
                            {MODE_TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveMode(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeMode === tab.id
                                        ? 'bg-primary-600 text-white shadow-md'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                >
                                    <span>{tab.icon}</span><span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Content area */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeMode}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.25 }}
                            >
                                {activeMode === 'video' && <VideoAnalysisPanel />}
                                {activeMode === 'camera' && <LiveCameraPanel />}
                                {activeMode === 'compare' && <CompareVideosPanel />}
                            </motion.div>
                        </AnimatePresence>

                        {activeMode === 'video' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {INFO_CARDS.map((card) => (
                                    <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                                        <Card className="hover:shadow-glass-lg transition-shadow">
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${card.iconBg}`}>{card.icon}</span>
                                                <h3 className="text-base font-bold text-gray-900">{card.title}</h3>
                                            </div>
                                            <p className="text-sm text-gray-500 leading-relaxed">{card.description}</p>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar */}
                    <motion.aside initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="space-y-6">
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
                                {AI_FEATURES.map((f) => <li key={f.label} className="flex items-center gap-2.5 text-sm text-gray-600"><span className="text-base">{f.icon}</span><span>{f.label}</span></li>)}
                            </ul>
                        </Card>
                        <Card>
                            <SectionHeader icon="💡" title="Pro Tips" className="mb-4" />
                            <ul className="space-y-3">
                                {PRO_TIPS.map((tip) => <li key={tip.label} className="flex items-center gap-2.5 text-sm text-gray-600"><span className="text-base">{tip.icon}</span><span>{tip.label}</span></li>)}
                            </ul>
                        </Card>
                    </motion.aside>
                </div>
            </div>

            <footer className="mt-16 py-6 text-center text-sm text-gray-400 border-t border-surface-border">
                {BRAND.copyright}
            </footer>
        </div>
    );
}
