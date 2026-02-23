import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, ReferenceDot,
} from 'recharts';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
    const [selectedFrame, setSelectedFrame] = React.useState(0);
    const [workoutPlan, setWorkoutPlan] = React.useState(null);
    const [showWorkoutModal, setShowWorkoutModal] = React.useState(false);
    const [isGeneratingPlan, setIsGeneratingPlan] = React.useState(false);

    const handleGenerateWorkoutPlan = async () => {
        setIsGeneratingPlan(true);
        try {
            // Trim payload — exclude base64 images &amp; large arrays to stay under token limit
            const trimmedData = {
                analysis_summary: analysisData.analysis_summary || {},
                video_biomechanics: analysisData.video_biomechanics || {},
                recommendations: (analysisData.recommendations || []).map(r => ({
                    area: r.area, severity: r.severity, finding: r.finding, what_to_do: r.what_to_do,
                })),
                exercise_prescriptions: analysisData.exercise_prescriptions || [],
                strengths: analysisData.strengths || [],
            };
            const res = await axios.post(`${BACKEND_URL}/generate-workout-plan`, {
                analysis_data: trimmedData,
                athlete_name: fileName.replace(/\.[^.]+$/, ''),
                sport: 'Running',
            });
            if (res.data.plan) {
                setWorkoutPlan(res.data.plan);
                setShowWorkoutModal(true);
            } else {
                alert(res.data.error || 'Failed to generate workout plan.');
            }
        } catch (err) {
            alert('Failed to connect to AI service. Make sure the backend is running with OPENAI_API_KEY set.');
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    const downloadWorkoutPDF = () => {
        if (!workoutPlan) return;
        const doc = new jsPDF();
        const p = workoutPlan;
        let y = 20;

        // Title
        doc.setFontSize(11);
        const overviewLines = doc.splitTextToSize(p.overview || '', 180);
        const headerHeight = 36 + overviewLines.length * 5 + 4;
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, headerHeight, 'F');
        doc.setTextColor(241, 245, 249);
        doc.setFontSize(20);
        doc.text(p.plan_title || 'AI Workout Plan', 15, 18);
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        doc.text(`${p.athlete || 'Athlete'} • ${p.sport || 'Running'} • Generated ${new Date().toLocaleDateString()}`, 15, 28);
        doc.setFontSize(11);
        doc.setTextColor(203, 213, 225);
        doc.text(overviewLines, 15, 36);
        y = headerHeight + 6;

        doc.setTextColor(30, 30, 30);

        // Warmup
        if (p.warmup?.length) {
            doc.setFontSize(14);
            doc.setTextColor(6, 182, 212);
            doc.text('Warm-Up', 15, y); y += 8;
            doc.setFontSize(10);
            doc.setTextColor(50, 50, 50);
            p.warmup.forEach(ex => {
                doc.text(`• ${ex.name} (${ex.duration}) — ${ex.description}`, 18, y, { maxWidth: 175 });
                y += doc.splitTextToSize(`• ${ex.name} (${ex.duration}) — ${ex.description}`, 175).length * 5 + 2;
            });
            y += 4;
        }

        // Main Workout
        if (p.main_workout?.length) {
            if (y > 250) { doc.addPage(); y = 20; }
            doc.setFontSize(14);
            doc.setTextColor(6, 182, 212);
            doc.text('Main Workout', 15, y); y += 8;
            autoTable(doc, {
                startY: y,
                head: [['Exercise', 'Sets', 'Reps', 'Rest', 'Target', 'Priority']],
                body: p.main_workout.map(ex => [ex.name, ex.sets, ex.reps, ex.rest, ex.target_area, ex.priority]),
                theme: 'striped',
                headStyles: { fillColor: [15, 23, 42], textColor: [241, 245, 249], fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                margin: { left: 15 },
            });
            y = doc.lastAutoTable.finalY + 10;
        }

        // Cooldown
        if (p.cooldown?.length) {
            if (y > 250) { doc.addPage(); y = 20; }
            doc.setFontSize(14);
            doc.setTextColor(6, 182, 212);
            doc.text('Cool-Down', 15, y); y += 8;
            doc.setFontSize(10);
            doc.setTextColor(50, 50, 50);
            p.cooldown.forEach(ex => {
                doc.text(`• ${ex.name} (${ex.duration}) — ${ex.description}`, 18, y, { maxWidth: 175 });
                y += doc.splitTextToSize(`• ${ex.name} (${ex.duration}) — ${ex.description}`, 175).length * 5 + 2;
            });
            y += 4;
        }

        // Weekly Schedule
        if (p.weekly_schedule?.length) {
            if (y > 230) { doc.addPage(); y = 20; }
            doc.setFontSize(14);
            doc.setTextColor(6, 182, 212);
            doc.text('Weekly Schedule', 15, y); y += 8;
            autoTable(doc, {
                startY: y,
                head: [['Day', 'Focus', 'Intensity']],
                body: p.weekly_schedule.map(d => [d.day, d.focus, d.intensity]),
                theme: 'striped',
                headStyles: { fillColor: [15, 23, 42], textColor: [241, 245, 249], fontSize: 9 },
                bodyStyles: { fontSize: 9 },
                margin: { left: 15 },
            });
        }

        doc.save(`stridex_workout_plan_${Date.now()}.pdf`);
    };

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
    const keyFrames = analysisData.key_frames || [];
    const exercisePrescriptions = analysisData.exercise_prescriptions || [];

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
    const elbowData = biomechanics.elbow_flare || {};
    const shoulderData = biomechanics.shoulder_symmetry || {};
    const wristData = biomechanics.wrist_alignment || {};
    const bodyCtx = biomechanics.body_context || {};

    const riskVariant = (score) => score >= 70 ? 'danger' : score >= 40 ? 'warning' : 'success';

    const riskDistPie = [
        { name: 'High', value: highCount },
        { name: 'Medium', value: medCount },
        { name: 'Low', value: lowCount },
    ].filter((d) => d.value > 0);

    /* ---------- handlers ---------- */
    const handleExport = () => {
        try {
            const doc = new jsPDF();
            const pw = doc.internal.pageSize.getWidth();
            // Header
            doc.setFillColor(30, 58, 138);
            doc.rect(0, 0, pw, 30, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('STRIDEX-AI Analysis Report', pw / 2, 18, { align: 'center' });
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`${fileName} • ${new Date().toLocaleString()} • ${totalFrames} frames analyzed`, pw / 2, 26, { align: 'center' });

            let y = 40;
            doc.setTextColor(0, 0, 0);
            // Score Summary
            doc.setFontSize(14); doc.setFont('helvetica', 'bold');
            doc.text('Performance Summary', 14, y); y += 8;
            doc.setFontSize(10); doc.setFont('helvetica', 'normal');
            doc.text(`Overall Score: ${overallScore}/100 — ${riskCategory}`, 14, y); y += 6;
            doc.text(`Average Risk: ${avgRisk}% | Peak Risk: ${maxRisk}% | Min Risk: ${minRisk}%`, 14, y); y += 6;
            if (whatThisMeans) { const lines = doc.splitTextToSize(whatThisMeans, pw - 28); doc.text(lines, 14, y); y += lines.length * 5 + 2; }
            y += 4;

            // Biomechanics Table
            const bioRows = [
                kneeData.title && [kneeData.title, kneeData.status?.toUpperCase(), kneeData.plain_english || ''],
                strideData.title && [strideData.title, strideData.status?.toUpperCase(), strideData.plain_english || ''],
                postureData.title && [postureData.title, postureData.status?.toUpperCase(), postureData.plain_english || ''],
                elbowData.title && [elbowData.title, elbowData.status?.toUpperCase(), elbowData.plain_english || ''],
                shoulderData.title && [shoulderData.title, shoulderData.status?.toUpperCase(), shoulderData.plain_english || ''],
                wristData.title && [wristData.title, wristData.status?.toUpperCase(), wristData.plain_english || ''],
            ].filter(Boolean);
            if (bioRows.length > 0) {
                doc.setFontSize(14); doc.setFont('helvetica', 'bold');
                doc.text('Biomechanics Breakdown', 14, y); y += 2;
                autoTable(doc, {
                    startY: y,
                    head: [['Metric', 'Status', 'Assessment']],
                    body: bioRows,
                    theme: 'striped',
                    headStyles: { fillColor: [30, 58, 138], textColor: 255 },
                    columnStyles: { 2: { cellWidth: 80 } },
                    margin: { left: 14, right: 14 },
                    styles: { fontSize: 9 },
                });
                y = doc.lastAutoTable.finalY + 8;
            }

            // Recommendations
            if (recommendations.length > 0) {
                if (y > 240) { doc.addPage(); y = 20; }
                doc.setFontSize(14); doc.setFont('helvetica', 'bold');
                doc.text('Recommendations', 14, y); y += 2;
                const recRows = recommendations.map((r, i) => [i + 1, r.area, r.severity, r.finding, r.what_to_do || '']);
                autoTable(doc, {
                    startY: y,
                    head: [['#', 'Area', 'Priority', 'Finding', 'Action']],
                    body: recRows,
                    theme: 'striped',
                    headStyles: { fillColor: [30, 58, 138], textColor: 255 },
                    margin: { left: 14, right: 14 },
                    styles: { fontSize: 8, cellPadding: 2 },
                    columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 28 }, 2: { cellWidth: 20 } },
                });
                y = doc.lastAutoTable.finalY + 8;
            }

            // Exercise Prescriptions
            if (exercisePrescriptions.length > 0) {
                if (y > 240) { doc.addPage(); y = 20; }
                doc.setFontSize(14); doc.setFont('helvetica', 'bold');
                doc.text('Exercise Prescriptions', 14, y); y += 2;
                const rxRows = [];
                exercisePrescriptions.forEach(rx => {
                    rx.exercises.forEach(ex => {
                        rxRows.push([rx.area, ex.name, `${ex.sets}×${ex.reps}`, ex.description || '']);
                    });
                });
                autoTable(doc, {
                    startY: y,
                    head: [['Area', 'Exercise', 'Sets×Reps', 'Description']],
                    body: rxRows,
                    theme: 'striped',
                    headStyles: { fillColor: [30, 58, 138], textColor: 255 },
                    margin: { left: 14, right: 14 },
                    styles: { fontSize: 8, cellPadding: 2 },
                });
                y = doc.lastAutoTable.finalY + 8;
            }

            // Strengths
            if (strengths.length > 0) {
                if (y > 260) { doc.addPage(); y = 20; }
                doc.setFontSize(14); doc.setFont('helvetica', 'bold');
                doc.text('Performance Strengths', 14, y); y += 6;
                doc.setFontSize(10); doc.setFont('helvetica', 'normal');
                const maxW = pw - 28;
                strengths.forEach(s => {
                    const txt = `- ${s.area}: ${s.message}`;
                    const lines = doc.splitTextToSize(txt, maxW);
                    if (y + lines.length * 5 > 280) { doc.addPage(); y = 20; }
                    doc.text(lines, 14, y);
                    y += lines.length * 5 + 2;
                });
            }

            // Footer
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(7); doc.setTextColor(150);
                doc.text(`STRIDEX-AI • Page ${i}/${totalPages} • Generated ${new Date().toISOString()}`, pw / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
            }
            doc.save(`stridex_report_${fileName.replace(/\.[^.]+$/, '')}_${Date.now()}.pdf`);
        } catch (err) { console.error(err); alert('PDF generation failed.'); }
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
        <>
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

                                    {/* ── Frame-by-Frame Analysis (Single-Frame Slider) ── */}
                                    {keyFrames.length > 0 && (() => {
                                        const frameIdx = selectedFrame ?? 0;
                                        const kf = keyFrames[frameIdx];
                                        if (!kf) return null;

                                        const handleScreenshot = () => {
                                            const a = document.createElement('a');
                                            a.href = `data:image/jpeg;base64,${kf.image_base64}`;
                                            a.download = `stridex_frame_${kf.frame_number}_${Date.now()}.jpg`;
                                            a.click();
                                        };

                                        return (
                                            <div style={{ background: '#0f172a', borderRadius: '16px', padding: '24px', border: '1px solid rgba(148,163,184,0.15)' }}>
                                                {/* Header */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontSize: '20px' }}>🎞️</span>
                                                        <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '18px', margin: 0 }}>Frame-by-Frame Analysis</h3>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ color: '#94a3b8', fontSize: '12px', background: 'rgba(148,163,184,0.15)', padding: '4px 12px', borderRadius: '20px' }}>
                                                            Frame {frameIdx + 1} of {keyFrames.length}
                                                        </span>
                                                        <button onClick={handleScreenshot}
                                                            style={{ background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.4)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#67e8f9', fontSize: '12px', fontWeight: 600 }}>
                                                            📸 Screenshot
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Frame Image with badges */}
                                                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px', border: '1px solid rgba(148,163,184,0.2)' }}>
                                                    <img src={`data:image/jpeg;base64,${kf.image_base64}`}
                                                        alt={`Frame ${kf.frame_number}`}
                                                        style={{ width: '100%', display: 'block', maxHeight: '400px', objectFit: 'contain', background: '#000' }} />
                                                    {/* Overlay badges */}
                                                    <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: '6px' }}>
                                                        {kf.is_peak_risk && <span style={{ background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}>⚠️ PEAK RISK</span>}
                                                        {kf.is_best_form && <span style={{ background: '#10b981', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', boxShadow: '0 2px 8px rgba(16,185,129,0.4)' }}>✅ BEST FORM</span>}
                                                    </div>
                                                    <div style={{ position: 'absolute', top: 10, right: 10 }}>
                                                        <span style={{
                                                            fontSize: '13px', fontWeight: 700, padding: '4px 12px', borderRadius: '6px', color: '#fff',
                                                            background: kf.risk_level === 'HIGH' ? '#ef4444' : kf.risk_level === 'MEDIUM' ? '#f59e0b' : '#10b981',
                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                                        }}>Risk: {kf.risk_score}%</span>
                                                    </div>
                                                    <div style={{ position: 'absolute', bottom: 10, left: 10 }}>
                                                        <span style={{ background: 'rgba(0,0,0,0.7)', color: '#e2e8f0', fontSize: '11px', padding: '4px 10px', borderRadius: '6px' }}>
                                                            {kf.timestamp}s • Frame #{kf.frame_number}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Previous / Next Controls */}
                                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                                                    <button
                                                        disabled={frameIdx <= 0}
                                                        onClick={() => setSelectedFrame(Math.max(0, frameIdx - 1))}
                                                        style={{
                                                            background: frameIdx <= 0 ? 'rgba(148,163,184,0.1)' : 'rgba(6,182,212,0.2)',
                                                            border: `1px solid ${frameIdx <= 0 ? 'rgba(148,163,184,0.15)' : 'rgba(6,182,212,0.4)'}`,
                                                            borderRadius: '8px', padding: '8px 20px', cursor: frameIdx <= 0 ? 'not-allowed' : 'pointer',
                                                            color: frameIdx <= 0 ? '#475569' : '#67e8f9', fontWeight: 600, fontSize: '13px',
                                                            transition: 'all 0.2s',
                                                        }}>
                                                        ‹ Previous
                                                    </button>
                                                    {/* Dot indicators */}
                                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                        {keyFrames.map((_, i) => (
                                                            <span key={i} onClick={() => setSelectedFrame(i)}
                                                                style={{
                                                                    width: i === frameIdx ? '20px' : '8px', height: '8px',
                                                                    borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s',
                                                                    background: i === frameIdx ? '#06b6d4' : keyFrames[i].risk_level === 'HIGH' ? 'rgba(239,68,68,0.5)' : 'rgba(148,163,184,0.3)',
                                                                }} />
                                                        ))}
                                                    </div>
                                                    <button
                                                        disabled={frameIdx >= keyFrames.length - 1}
                                                        onClick={() => setSelectedFrame(Math.min(keyFrames.length - 1, frameIdx + 1))}
                                                        style={{
                                                            background: frameIdx >= keyFrames.length - 1 ? 'rgba(148,163,184,0.1)' : 'rgba(6,182,212,0.2)',
                                                            border: `1px solid ${frameIdx >= keyFrames.length - 1 ? 'rgba(148,163,184,0.15)' : 'rgba(6,182,212,0.4)'}`,
                                                            borderRadius: '8px', padding: '8px 20px', cursor: frameIdx >= keyFrames.length - 1 ? 'not-allowed' : 'pointer',
                                                            color: frameIdx >= keyFrames.length - 1 ? '#475569' : '#67e8f9', fontWeight: 600, fontSize: '13px',
                                                            transition: 'all 0.2s',
                                                        }}>
                                                        Next ›
                                                    </button>
                                                </div>

                                                {/* Biometrics Panel */}
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
                                                    {[
                                                        ['🦵 Knee Angle', kf.knee_angle, '°'],
                                                        ['⚖️ Asymmetry', kf.asymmetry, '%'],
                                                        ['🎯 Posture', typeof kf.posture === 'number' ? kf.posture.toFixed(1) : kf.posture, ''],
                                                        ['⚡ Risk Score', kf.risk_score, '%'],
                                                    ].map(([label, val, unit]) => (
                                                        <div key={label} style={{ background: 'rgba(30,41,59,0.8)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                                                            <p style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', margin: '0 0 4px 0', letterSpacing: '0.5px' }}>{label}</p>
                                                            <p style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700, margin: 0 }}>{val}{unit && <span style={{ fontSize: '13px', color: '#94a3b8' }}>{unit}</span>}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Risk Factors */}
                                                {kf.risk_factors?.length > 0 && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                        {kf.risk_factors.map((rf, j) => (
                                                            <span key={j} style={{ fontSize: '11px', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(239,68,68,0.3)' }}>⚠ {rf}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* ── Exercise Prescriptions ── */}
                                    {exercisePrescriptions.length > 0 && (() => {
                                        const areaColors = {
                                            'Knee Stabilization': '#f97316', 'Knee Valgus Correction': '#f97316',
                                            'Balance & Symmetry': '#10b981', 'Stride Asymmetry Correction': '#10b981',
                                            'Core & Posture': '#a855f7', 'Posture Alignment': '#a855f7',
                                            'Shoulder Protection': '#06b6d4', 'Wrist Health': '#ec4899',
                                        };
                                        return (
                                            <div style={{ background: '#0f172a', borderRadius: '16px', padding: '24px', border: '1px solid rgba(148,163,184,0.15)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                                    <span style={{ fontSize: '20px' }}>💊</span>
                                                    <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '18px', margin: 0 }}>Exercise Prescription</h3>
                                                </div>
                                                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px', marginTop: 0 }}>
                                                    Personalised corrective exercises based on detected biomechanical weaknesses
                                                </p>
                                                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(exercisePrescriptions.length, 3)}, 1fr)`, gap: '16px' }}>
                                                    {exercisePrescriptions.map((rx, i) => {
                                                        const accentColor = areaColors[rx.area] || '#06b6d4';
                                                        return (
                                                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                <h4 style={{ color: accentColor, fontWeight: 600, fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span>{rx.icon}</span> {rx.area}
                                                                </h4>
                                                                {rx.exercises.map((ex, j) => (
                                                                    <div key={j} style={{
                                                                        background: 'rgba(30,41,59,0.7)', borderRadius: '10px',
                                                                        padding: '12px 14px', borderLeft: `3px solid ${accentColor}`,
                                                                    }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                                            <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '13px' }}>{ex.name}</span>
                                                                            <span style={{ color: accentColor, fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap' }}>{ex.sets}×{ex.reps}</span>
                                                                        </div>
                                                                        <p style={{ color: '#94a3b8', fontSize: '11px', margin: 0, lineHeight: '1.4' }}>{ex.description}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}
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

                                    {/* ── Biomechanics Cards — sorted by importance (concern → fair → good) ── */}
                                    {(() => {
                                        const statusOrder = { concern: 0, fair: 1, good: 2 };
                                        const cards = [
                                            kneeData.title && { key: 'knee', data: kneeData, icon: '🦵', type: 'knee' },
                                            strideData.title && { key: 'stride', data: strideData, icon: '👟', type: 'stride' },
                                            postureData.title && { key: 'posture', data: postureData, icon: '🎯', type: 'posture' },
                                            elbowData.title && { key: 'elbow', data: elbowData, icon: '💪', type: 'simple' },
                                            shoulderData.title && { key: 'shoulder', data: shoulderData, icon: '🏋️', type: 'shoulder' },
                                            wristData.title && { key: 'wrist', data: wristData, icon: '🤲', type: 'simple' },
                                        ].filter(Boolean).sort((a, b) => (statusOrder[a.data.status] ?? 2) - (statusOrder[b.data.status] ?? 2));

                                        return cards.map(({ key, data, icon, type }) => {
                                            const statusLabel = data.status === 'concern' ? 'ACTION NEEDED' : data.status === 'fair' ? 'MONITOR' : 'OPTIMAL';
                                            const statusVariant = data.status === 'concern' ? 'danger' : data.status === 'fair' ? 'warning' : 'success';
                                            const glowColor = data.status === 'concern' ? 'red' : data.status === 'fair' ? 'amber' : 'emerald';

                                            return (
                                                <BiomechanicsCard key={key} icon={icon} title={data.title} tooltip={data.tooltip}
                                                    statusLabel={statusLabel} statusVariant={statusVariant} glowColor={glowColor}>

                                                    {/* Knee: L/R angles with ranges */}
                                                    {type === 'knee' && (
                                                        <>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <p className="text-xs text-gray-400 uppercase font-semibold">Left Avg</p>
                                                                    <p className="text-2xl font-bold text-gray-900">{data.left_knee?.avg_angle ?? '-'}°</p>
                                                                    <p className="text-[10px] text-gray-400">Range: {data.left_knee?.min_angle}° – {data.left_knee?.max_angle}°</p>
                                                                    <p className="text-[10px] text-gray-400 capitalize">{data.left_knee?.trend}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-400 uppercase font-semibold">Right Avg</p>
                                                                    <p className="text-2xl font-bold text-gray-900">{data.right_knee?.avg_angle ?? '-'}°</p>
                                                                    <p className="text-[10px] text-gray-400">Range: {data.right_knee?.min_angle}° – {data.right_knee?.max_angle}°</p>
                                                                    <p className="text-[10px] text-gray-400 capitalize">{data.right_knee?.trend}</p>
                                                                </div>
                                                            </div>
                                                            {data.frames_at_risk > 0 && (
                                                                <p className="text-[10px] text-danger font-semibold mt-1">⚠ {data.frames_at_risk} / {data.total_measurements} measurements at risk</p>
                                                            )}
                                                        </>
                                                    )}

                                                    {/* Stride: avg/max/frames > 10% */}
                                                    {type === 'stride' && (
                                                        <>
                                                            <div className="grid grid-cols-3 gap-3">
                                                                <div>
                                                                    <p className="text-xs text-gray-400 uppercase font-semibold">Avg</p>
                                                                    <p className="text-2xl font-bold text-gray-900">{data.avg_asymmetry ?? '-'}%</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-400 uppercase font-semibold">Max</p>
                                                                    <p className="text-2xl font-bold text-gray-900">{data.max_asymmetry ?? '-'}%</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-400 uppercase font-semibold">{'> 10%'}</p>
                                                                    <p className="text-2xl font-bold text-danger">{data.frames_above_10pct ?? 0}</p>
                                                                    <p className="text-[10px] text-gray-400">frames</p>
                                                                </div>
                                                            </div>
                                                            <p className="text-[10px] text-gray-400 capitalize mt-1">Trend: {data.trend}</p>
                                                        </>
                                                    )}

                                                    {/* Posture: avg/min/at-risk */}
                                                    {type === 'posture' && (
                                                        <>
                                                            <div className="grid grid-cols-3 gap-3">
                                                                <div>
                                                                    <p className="text-xs text-gray-400 uppercase font-semibold">Avg</p>
                                                                    <p className="text-2xl font-bold text-gray-900">{data.avg_score ?? '-'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-400 uppercase font-semibold">Min</p>
                                                                    <p className="text-2xl font-bold text-gray-900">{data.min_score ?? '-'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-400 uppercase font-semibold">At Risk</p>
                                                                    <p className="text-2xl font-bold text-danger">{data.frames_at_risk ?? 0}</p>
                                                                    <p className="text-[10px] text-gray-400">frames</p>
                                                                </div>
                                                            </div>
                                                            <p className="text-[10px] text-gray-400 capitalize mt-1">Trend: {data.trend}</p>
                                                        </>
                                                    )}

                                                    {/* Shoulder: asymmetry only */}
                                                    {type === 'shoulder' && (
                                                        <div>
                                                            <p className="text-xs text-gray-400 uppercase font-semibold">Avg Asymmetry</p>
                                                            <p className="text-2xl font-bold text-gray-900">{data.avg_asymmetry ?? '-'}%</p>
                                                        </div>
                                                    )}

                                                    {/* Simple: avg angle + at-risk (Elbow, Wrist) */}
                                                    {type === 'simple' && (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <p className="text-xs text-gray-400 uppercase font-semibold">Avg Angle</p>
                                                                <p className="text-2xl font-bold text-gray-900">{data.avg_angle ?? '-'}°</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-400 uppercase font-semibold">At Risk</p>
                                                                <p className="text-2xl font-bold text-danger">{data.frames_at_risk ?? 0}</p>
                                                                <p className="text-[10px] text-gray-400">measurements</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <p className="text-xs text-gray-500 mt-1 italic">{data.plain_english}</p>
                                                </BiomechanicsCard>
                                            );
                                        });
                                    })()}

                                    {/* Body Context */}
                                    {bodyCtx.detected_view && (
                                        <Card className="bg-primary-50 border-primary-200">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">🎯</span>
                                                <div>
                                                    <p className="text-sm font-bold text-primary-700">Smart Detection: {bodyCtx.detected_view.replace('_', ' ')}</p>
                                                    <p className="text-[10px] text-primary-500">{bodyCtx.tooltip}</p>
                                                </div>
                                            </div>
                                        </Card>
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
                                        className="w-full justify-center text-base"
                                        onClick={handleGenerateWorkoutPlan}
                                        disabled={isGeneratingPlan}>
                                        {isGeneratingPlan ? '⏳ Generating...' : 'Generate AI Workout Plan'}
                                    </Button>
                                </motion.div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            {/* ── Workout Plan Modal ── */}
            {showWorkoutModal && workoutPlan && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                    onClick={() => setShowWorkoutModal(false)}>
                    <div onClick={e => e.stopPropagation()}
                        style={{ background: '#0f172a', borderRadius: '20px', border: '1px solid rgba(148,163,184,0.2)', width: '100%', maxWidth: '800px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 16px 60px rgba(0,0,0,0.6)' }}>

                        {/* Modal Header — sticky */}
                        <div style={{ position: 'sticky', top: 0, background: '#0f172a', padding: '20px 24px 16px', borderBottom: '1px solid rgba(148,163,184,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '20px 20px 0 0', zIndex: 10 }}>
                            <h2 style={{ color: '#f1f5f9', fontSize: '20px', fontWeight: 700, margin: 0 }}>🤖 {workoutPlan.plan_title}</h2>
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                <button onClick={downloadWorkoutPDF}
                                    style={{ background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.4)', borderRadius: '8px', padding: '8px 16px', color: '#67e8f9', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    📥 Download PDF
                                </button>
                                <button onClick={() => setShowWorkoutModal(false)}
                                    style={{ background: 'rgba(148,163,184,0.15)', border: 'none', borderRadius: '8px', padding: '8px 12px', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' }}>✕</button>
                            </div>
                        </div>

                        <div style={{ padding: '24px' }}>
                            {/* Overview */}
                            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 20px', lineHeight: '1.6' }}>{workoutPlan.overview}</p>
                            {/* Warmup */}
                            {workoutPlan.warmup?.length > 0 && (
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{ color: '#fbbf24', fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>🔥 Warm-Up</h3>
                                    <div style={{ display: 'grid', gap: '8px' }}>
                                        {workoutPlan.warmup.map((ex, i) => (
                                            <div key={i} style={{ background: 'rgba(30,41,59,0.7)', borderRadius: '10px', padding: '12px 16px', borderLeft: '3px solid #fbbf24' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '14px' }}>{ex.name}</span>
                                                    <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '12px' }}>{ex.duration}</span>
                                                </div>
                                                <p style={{ color: '#94a3b8', fontSize: '12px', margin: '4px 0 0', lineHeight: '1.4' }}>{ex.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Main Workout */}
                            {workoutPlan.main_workout?.length > 0 && (
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{ color: '#06b6d4', fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>💪 Main Workout</h3>
                                    <div style={{ display: 'grid', gap: '8px' }}>
                                        {workoutPlan.main_workout.map((ex, i) => (
                                            <div key={i} style={{ background: 'rgba(30,41,59,0.7)', borderRadius: '10px', padding: '12px 16px', borderLeft: `3px solid ${ex.priority === 'high' ? '#ef4444' : ex.priority === 'medium' ? '#f59e0b' : '#10b981'}` }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                    <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '14px' }}>{ex.name}</span>
                                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                        <span style={{ color: '#94a3b8', fontSize: '11px', background: 'rgba(148,163,184,0.15)', padding: '2px 8px', borderRadius: '10px' }}>{ex.target_area}</span>
                                                        <span style={{ color: '#06b6d4', fontWeight: 700, fontSize: '12px' }}>{ex.sets}×{ex.reps}</span>
                                                    </div>
                                                </div>
                                                <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0, lineHeight: '1.4' }}>{ex.description}</p>
                                                <span style={{ color: '#64748b', fontSize: '11px' }}>Rest: {ex.rest}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Cooldown */}
                            {workoutPlan.cooldown?.length > 0 && (
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{ color: '#a78bfa', fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>🧘 Cool-Down</h3>
                                    <div style={{ display: 'grid', gap: '8px' }}>
                                        {workoutPlan.cooldown.map((ex, i) => (
                                            <div key={i} style={{ background: 'rgba(30,41,59,0.7)', borderRadius: '10px', padding: '12px 16px', borderLeft: '3px solid #a78bfa' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '14px' }}>{ex.name}</span>
                                                    <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: '12px' }}>{ex.duration}</span>
                                                </div>
                                                <p style={{ color: '#94a3b8', fontSize: '12px', margin: '4px 0 0', lineHeight: '1.4' }}>{ex.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Weekly Schedule */}
                            {workoutPlan.weekly_schedule?.length > 0 && (
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{ color: '#10b981', fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>📅 Weekly Schedule</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                                        {workoutPlan.weekly_schedule.map((d, i) => (
                                            <div key={i} style={{ background: 'rgba(30,41,59,0.7)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                                                <p style={{ color: '#10b981', fontWeight: 700, fontSize: '13px', margin: '0 0 4px' }}>{d.day}</p>
                                                <p style={{ color: '#f1f5f9', fontSize: '12px', fontWeight: 600, margin: '0 0 2px' }}>{d.focus}</p>
                                                <span style={{ color: d.intensity === 'High' ? '#ef4444' : d.intensity === 'Moderate' ? '#f59e0b' : '#94a3b8', fontSize: '11px' }}>{d.intensity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Key Notes */}
                            {workoutPlan.key_notes?.length > 0 && (
                                <div style={{ background: 'rgba(6,182,212,0.08)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(6,182,212,0.2)' }}>
                                    <h4 style={{ color: '#06b6d4', fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: 0 }}>📌 Key Notes</h4>
                                    {workoutPlan.key_notes.map((note, i) => (
                                        <p key={i} style={{ color: '#cbd5e1', fontSize: '12px', margin: '0 0 4px', lineHeight: '1.5' }}>• {note}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
