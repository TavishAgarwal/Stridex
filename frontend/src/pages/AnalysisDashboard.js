import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, ReferenceDot,
} from 'recharts';
import axios from 'axios';
import TopNavbar from '../components/layout/TopNavbar';
import Sidebar from '../components/layout/Sidebar';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';
import StatusBadge from '../components/shared/StatusBadge';
import SectionHeader from '../components/shared/SectionHeader';
import ProgressBar from '../components/shared/ProgressBar';
import CircularGauge from '../components/shared/CircularGauge';
import { BACKEND_URL } from '../config/siteConfig';

/* ─── helper ──────────────────────────────── */
function BiomechanicsCard({ icon, title, tooltip, statusLabel, statusVariant, glowColor, children }) {
    return (
        <Card glowColor={glowColor} className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <h4 className="text-base font-bold text-gray-900">{title}</h4>
                    {tooltip && (
                        <span className="text-gray-300 cursor-help text-sm" title={tooltip}>ⓘ</span>
                    )}
                </div>
                {statusLabel && <StatusBadge label={statusLabel} variant={statusVariant} />}
            </div>
            {children}
        </Card>
    );
}

const SEVERITY_MAP = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'success' };
const PIE_COLORS = ['#ef4444', '#f59e0b', '#10b981'];

/* ─── main ──────────────────────────────── */
export default function AnalysisDashboard() {
    const location = useLocation();
    const navigate = useNavigate();
    const analysisData = location.state?.analysisData;
    const fileName = location.state?.fileName || 'Video';

    /* ---------- empty state ---------- */
    if (!analysisData) {
        return (
            <div className="min-h-screen bg-surface-secondary flex flex-col">
                <TopNavbar />
                <div className="flex flex-1 overflow-hidden">
                    <Sidebar />
                    <main className="flex-1 overflow-y-auto p-6 lg:p-10 flex flex-col items-center justify-center space-y-4">
                        <p className="text-lg text-gray-500">No analysis data available.</p>
                        <Button variant="primary" onClick={() => navigate('/')}>Upload a Video</Button>
                    </main>
                </div>
            </div>
        );
    }

    /* ---------- extract ALL data ---------- */
    const summary = analysisData.analysis_summary || {};
    const biomechanics = analysisData.video_biomechanics || {};
    const timeline = analysisData.timeline || [];
    const timelineEvents = analysisData.timeline_events || [];
    const recommendations = analysisData.recommendations || [];
    const priorityRanking = analysisData.priority_ranking || [];
    const strengths = analysisData.strengths || [];
    const fatigue = analysisData.fatigue_projection || {};
    const videoInfo = analysisData.video_info || {};
    const riskFactors = biomechanics.most_common_risk_factors || [];

    const overallScore = summary.overall_video_score ?? 0;
    const riskCategory = summary.risk_category || '';
    // riskColor available via summary.risk_color if needed
    const whatThisMeans = summary.what_this_means || '';
    const motivational = summary.motivational || '';
    const avgRisk = summary.average_risk ?? 0;
    const maxRisk = summary.max_risk ?? 0;
    const minRisk = summary.min_risk ?? 0;
    const scoreBreakdown = summary.score_breakdown || {};

    const highCount = summary.high_risk_count ?? 0;
    const medCount = summary.medium_risk_count ?? 0;
    const lowCount = summary.low_risk_count ?? 0;
    const totalFrames = summary.frames_analyzed ?? 0;

    const kneeData = biomechanics.knee_valgus || {};
    const strideData = biomechanics.stride_asymmetry || {};
    const postureData = biomechanics.posture || {};

    const riskVariant = (score) => score >= 70 ? 'danger' : score >= 40 ? 'warning' : 'success';

    const riskDistPie = [
        { name: 'High', value: highCount },
        { name: 'Medium', value: medCount },
        { name: 'Low', value: lowCount },
    ].filter((d) => d.value > 0);

    /* ---------- handlers ---------- */
    const handleExport = async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/generate-report/default`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `stridex_report_${Date.now()}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch { alert('Report generation failed — no active session on server.'); }
    };

    const handleSaveSession = async () => {
        try {
            await axios.post(`${BACKEND_URL}/save-session`, {
                avg_risk: Math.round(avgRisk),
                max_fatigue: Math.round(fatigue.delta || 0),
                performance_score: overallScore,
                rep_count: totalFrames,
                session_id: `video_${Date.now()}`,
                sport_mode: 'default',
                timestamp: Date.now() / 1000,
            });
            alert('Session saved to history!');
        } catch { alert('Failed to save session.'); }
    };

    /* ──────────────── render ────────────────── */
    return (
        <div className="min-h-screen bg-surface-secondary flex flex-col">
            <TopNavbar />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto p-6 lg:p-10 hide-scrollbar">
                    <div className="max-w-6xl mx-auto space-y-8 pb-10">
                        {/* ── Session Header ── */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-extrabold text-gray-900">{fileName.replace(/\.[^.]+$/, '')} Analysis</h1>
                                    <StatusBadge label={riskCategory} variant={riskVariant(100 - overallScore)} />
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                    {videoInfo.fps && `${videoInfo.fps}fps`} • {videoInfo.duration && `${videoInfo.duration}s`} • {totalFrames} frames analyzed
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="secondary" icon="⬇" size="sm" onClick={handleExport}>Export PDF</Button>
                                <Button variant="primary" icon="💾" size="sm" onClick={handleSaveSession}>Save Session</Button>
                            </div>
                        </motion.div>

                        {/* ── Overall Score Card ── */}
                        <Card className="bg-gradient-to-r from-primary-600 to-primary-700 border-0 text-white">
                            <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 items-center">
                                <div className="text-center">
                                    <CircularGauge value={overallScore} max={100} color="blue" size={150}
                                        label={riskCategory.split('–')[0]?.trim()} />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-xl font-bold">{riskCategory}</h2>
                                    <p className="text-sm text-primary-100 leading-relaxed">{whatThisMeans}</p>
                                    {motivational && <p className="text-sm font-semibold text-primary-200 italic">&ldquo;{motivational}&rdquo;</p>}
                                </div>
                            </div>
                        </Card>

                        {/* ── Score Breakdown (4 components) ── */}
                        {Object.keys(scoreBreakdown).length > 0 && (
                            <Card>
                                <SectionHeader icon="📊" title="Score Breakdown" className="mb-4" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {Object.entries(scoreBreakdown).map(([key, comp]) => (
                                        <div key={key} className="space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                                                <span className="font-bold text-gray-900">{comp.score}/{comp.max}</span>
                                            </div>
                                            <ProgressBar value={comp.score} max={comp.max}
                                                color={comp.score / comp.max >= 0.7 ? 'emerald' : comp.score / comp.max >= 0.4 ? 'amber' : 'red'} />
                                            <p className="text-[10px] text-gray-400 leading-snug">{comp.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* ── Stats Row: Avg / Max / Min + Pie ── */}
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6">
                            <Card>
                                <SectionHeader icon="📈" title="Risk Summary" className="mb-4" />
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-semibold">Average Risk</p>
                                        <p className="text-3xl font-extrabold text-gray-900">{avgRisk}%</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-semibold">Peak Risk</p>
                                        <p className="text-3xl font-extrabold text-danger">{maxRisk}%</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-semibold">Min Risk</p>
                                        <p className="text-3xl font-extrabold text-emerald">{minRisk}%</p>
                                    </div>
                                </div>
                            </Card>

                            {/* Frame Distribution Pie */}
                            {riskDistPie.length > 0 && (
                                <Card className="flex flex-col items-center justify-center">
                                    <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Frame Distribution</p>
                                    <PieChart width={120} height={120}>
                                        <Pie data={riskDistPie} dataKey="value" cx="50%" cy="50%"
                                            innerRadius={30} outerRadius={50} strokeWidth={0}>
                                            {riskDistPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(v, name) => [`${v} frames`, name]} />
                                    </PieChart>
                                    <div className="flex gap-3 text-[10px] mt-1">
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger" />{highCount}H</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber" />{medCount}M</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald" />{lowCount}L</span>
                                    </div>
                                </Card>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
                            {/* ── LEFT column ── */}
                            <div className="space-y-6">
                                {/* Risk Timeline + event markers */}
                                {timeline.length > 0 && (
                                    <Card>
                                        <SectionHeader icon="📈" title="Risk Timeline" className="mb-4" />
                                        <div className="flex items-center gap-4 mb-3 text-xs">
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger" /> Critical</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber" /> Warning</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald" /> Safe</span>
                                        </div>
                                        <div className="h-52">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={timeline}>
                                                    <defs>
                                                        <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                            <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.2} />
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                    <XAxis dataKey="timestamp" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${v}s`} />
                                                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={[0, 100]} />
                                                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                                                        formatter={(v) => [`${v}%`, 'Risk Score']} labelFormatter={(v) => `Time: ${v}s`} />
                                                    <Area type="monotone" dataKey="risk_score" stroke="#ef4444" fill="url(#riskGrad)" strokeWidth={2} />
                                                    {/* Timeline event markers (spikes + best) */}
                                                    {timelineEvents.map((evt, i) => (
                                                        <ReferenceDot key={i} x={evt.timestamp} y={evt.risk_score}
                                                            r={6} fill={evt.type === 'spike' ? '#ef4444' : '#10b981'}
                                                            stroke="#fff" strokeWidth={2} />
                                                    ))}
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                        {/* Event labels */}
                                        {timelineEvents.length > 0 && (
                                            <div className="space-y-2 mt-4 border-t border-surface-border pt-3">
                                                {timelineEvents.map((evt, i) => (
                                                    <div key={i} className={`flex items-start gap-2 text-xs ${evt.type === 'spike' ? 'text-danger' : 'text-emerald-dark'}`}>
                                                        <span className="font-bold whitespace-nowrap">{evt.label}</span>
                                                        <span className="text-gray-500">{evt.explanation}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </Card>
                                )}

                                {/* ── Strengths ── */}
                                {strengths.length > 0 && (
                                    <Card>
                                        <SectionHeader icon="💪" title="Performance Strengths" className="mb-4" />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {strengths.map((s, i) => (
                                                <div key={i} className="bg-emerald/5 border border-emerald/20 rounded-xl p-4 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{s.icon}</span>
                                                        <p className="text-sm font-bold text-emerald-dark">{s.area}</p>
                                                    </div>
                                                    <p className="text-xs text-gray-600 leading-relaxed">{s.message}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}

                                {/* ── Recommendations (full detail) ── */}
                                {recommendations.length > 0 && (
                                    <Card>
                                        <SectionHeader icon="🎯" title="Action Plan"
                                            rightContent={<StatusBadge label={`${priorityRanking.length} items`} variant="info" />}
                                            className="mb-4" />
                                        <div className="space-y-4">
                                            {(priorityRanking.length > 0 ? priorityRanking : recommendations).map((rec, i) => (
                                                <div key={i} className={`rounded-xl border p-4 space-y-2 ${rec.severity === 'HIGH' ? 'border-danger/30 bg-danger/5' :
                                                    rec.severity === 'MEDIUM' ? 'border-amber/30 bg-amber/5' : 'border-emerald/30 bg-emerald/5'
                                                    }`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            {rec.priority != null && (
                                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${rec.severity === 'HIGH' ? 'bg-danger' : rec.severity === 'MEDIUM' ? 'bg-amber' : 'bg-emerald'
                                                                    }`}>{rec.priority}</span>
                                                            )}
                                                            <span className="text-base">{rec.icon}</span>
                                                            <h4 className="text-sm font-bold text-gray-900">{rec.area}</h4>
                                                        </div>
                                                        <StatusBadge label={rec.severity} variant={SEVERITY_MAP[rec.severity] || 'neutral'} />
                                                    </div>
                                                    <p className="text-xs text-gray-700 leading-relaxed"><strong>Finding:</strong> {rec.finding}</p>
                                                    <p className="text-xs text-gray-700 leading-relaxed"><strong>What to do:</strong> {rec.what_to_do}</p>
                                                    {rec.exercises?.length > 0 && (
                                                        <div className="mt-1">
                                                            <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Exercises</p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {rec.exercises.map((ex, j) => (
                                                                    <span key={j} className="text-[10px] bg-white border border-surface-border rounded-lg px-2 py-1 text-gray-600">
                                                                        {ex}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}

                                {/* ── Most Common Risk Factors ── */}
                                {riskFactors.length > 0 && (
                                    <Card>
                                        <SectionHeader icon="⚠️" title="Most Frequent Risk Factors" className="mb-4" />
                                        <div className="space-y-3">
                                            {riskFactors.map((rf, i) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <span className="text-sm font-semibold text-gray-700">{rf.factor}</span>
                                                        <span className="text-[10px] text-gray-400">({rf.occurrences} frames)</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 w-1/2">
                                                        <ProgressBar value={rf.frequency_pct} max={100}
                                                            color={rf.frequency_pct > 60 ? 'red' : rf.frequency_pct > 30 ? 'amber' : 'blue'} />
                                                        <span className="text-xs font-bold text-gray-900 w-12 text-right">{rf.frequency_pct}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}
                            </div>

                            {/* ── RIGHT column: Biomechanics Panel ── */}
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }} className="space-y-4">

                                <Card>
                                    <div className="flex items-center justify-between">
                                        <SectionHeader icon="🏃" title="Biomechanics Breakdown" />
                                        <StatusBadge label={`Score: ${overallScore}/100`} variant={riskVariant(100 - overallScore)} />
                                    </div>
                                </Card>

                                {/* Knee */}
                                {kneeData.title && (
                                    <BiomechanicsCard icon="🦵" title={kneeData.title} tooltip={kneeData.tooltip}
                                        statusLabel={kneeData.status === 'concern' ? 'ACTION NEEDED' : kneeData.status === 'fair' ? 'MONITOR' : 'OPTIMAL'}
                                        statusVariant={kneeData.status === 'concern' ? 'danger' : kneeData.status === 'fair' ? 'warning' : 'success'}
                                        glowColor={kneeData.status === 'concern' ? 'red' : kneeData.status === 'fair' ? 'amber' : 'emerald'}>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase font-semibold">Left Avg</p>
                                                <p className="text-2xl font-bold text-gray-900">{kneeData.left_knee?.avg_angle ?? '-'}°</p>
                                                <p className="text-[10px] text-gray-400">Range: {kneeData.left_knee?.min_angle}° – {kneeData.left_knee?.max_angle}°</p>
                                                <p className="text-[10px] text-gray-400 capitalize">{kneeData.left_knee?.trend}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase font-semibold">Right Avg</p>
                                                <p className="text-2xl font-bold text-gray-900">{kneeData.right_knee?.avg_angle ?? '-'}°</p>
                                                <p className="text-[10px] text-gray-400">Range: {kneeData.right_knee?.min_angle}° – {kneeData.right_knee?.max_angle}°</p>
                                                <p className="text-[10px] text-gray-400 capitalize">{kneeData.right_knee?.trend}</p>
                                            </div>
                                        </div>
                                        {kneeData.frames_at_risk > 0 && (
                                            <p className="text-[10px] text-danger font-semibold mt-1">⚠ {kneeData.frames_at_risk} / {kneeData.total_measurements} measurements at risk</p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1 italic">{kneeData.plain_english}</p>
                                    </BiomechanicsCard>
                                )}

                                {/* Stride */}
                                {strideData.title && (
                                    <BiomechanicsCard icon="👟" title={strideData.title} tooltip={strideData.tooltip}
                                        statusLabel={strideData.status === 'concern' ? 'HIGH' : strideData.status === 'fair' ? 'MONITOR' : 'NORMAL'}
                                        statusVariant={strideData.status === 'concern' ? 'danger' : strideData.status === 'fair' ? 'warning' : 'success'}
                                        glowColor={strideData.status === 'concern' ? 'red' : strideData.status === 'fair' ? 'amber' : 'emerald'}>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase font-semibold">Avg</p>
                                                <p className="text-2xl font-bold text-gray-900">{strideData.avg_asymmetry ?? '-'}%</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase font-semibold">Max</p>
                                                <p className="text-2xl font-bold text-gray-900">{strideData.max_asymmetry ?? '-'}%</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase font-semibold">{'> 10%'}</p>
                                                <p className="text-2xl font-bold text-danger">{strideData.frames_above_10pct ?? 0}</p>
                                                <p className="text-[10px] text-gray-400">frames</p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-400 capitalize mt-1">Trend: {strideData.trend}</p>
                                        <p className="text-xs text-gray-500 italic mt-1">{strideData.plain_english}</p>
                                    </BiomechanicsCard>
                                )}

                                {/* Posture */}
                                {postureData.title && (
                                    <BiomechanicsCard icon="🎯" title={postureData.title} tooltip={postureData.tooltip}
                                        statusLabel={postureData.status === 'good' ? 'OPTIMAL' : postureData.status === 'fair' ? 'FAIR' : 'CONCERN'}
                                        statusVariant={postureData.status === 'good' ? 'success' : postureData.status === 'fair' ? 'warning' : 'danger'}
                                        glowColor={postureData.status === 'good' ? 'emerald' : postureData.status === 'fair' ? 'amber' : 'red'}>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase font-semibold">Avg</p>
                                                <p className="text-2xl font-bold text-gray-900">{postureData.avg_score ?? '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase font-semibold">Min</p>
                                                <p className="text-2xl font-bold text-gray-900">{postureData.min_score ?? '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase font-semibold">At Risk</p>
                                                <p className="text-2xl font-bold text-danger">{postureData.frames_at_risk ?? 0}</p>
                                                <p className="text-[10px] text-gray-400">frames</p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-400 capitalize mt-1">Trend: {postureData.trend}</p>
                                        <p className="text-xs text-gray-500 mt-1 italic">{postureData.plain_english}</p>
                                    </BiomechanicsCard>
                                )}

                                {/* Fatigue */}
                                {fatigue.message && (
                                    <BiomechanicsCard icon="⏱️" title="Fatigue Projection"
                                        statusLabel={fatigue.status?.toUpperCase()} statusVariant={fatigue.status === 'high' ? 'danger' : fatigue.status === 'moderate' ? 'warning' : 'success'}
                                        glowColor={fatigue.status === 'high' ? 'red' : fatigue.status === 'moderate' ? 'amber' : 'emerald'}>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase font-semibold">Start</p>
                                                <p className="text-2xl font-bold text-gray-900">{fatigue.start_risk ?? '-'}%</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase font-semibold">End</p>
                                                <p className="text-2xl font-bold text-gray-900">{fatigue.end_risk ?? '-'}%</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase font-semibold">Delta</p>
                                                <p className={`text-2xl font-bold ${fatigue.delta > 0 ? 'text-danger' : 'text-emerald'}`}>
                                                    {fatigue.delta > 0 ? '+' : ''}{fatigue.delta}
                                                </p>
                                            </div>
                                        </div>
                                        <ProgressBar value={Math.abs(fatigue.delta || 0)} max={50}
                                            color={fatigue.status === 'high' ? 'red' : fatigue.status === 'moderate' ? 'amber' : 'emerald'} className="mt-2" />
                                        <p className="text-xs text-gray-500 italic mt-2">{fatigue.message}</p>
                                    </BiomechanicsCard>
                                )}

                                {/* CTA */}
                                <Button variant="success" size="lg" icon="🤖"
                                    className="w-full justify-center text-base" onClick={() => { }}>
                                    Generate AI Workout Plan
                                </Button>
                            </motion.div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
