import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import TopNavbar from '../components/layout/TopNavbar';
import Sidebar from '../components/layout/Sidebar';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';
import StatusBadge from '../components/shared/StatusBadge';
import CircularGauge from '../components/shared/CircularGauge';
import useSessionHistory from '../hooks/useSessionHistory';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../config/siteConfig';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { sessions, loading } = useSessionHistory();
    const { user } = useAuth();

    // Compute stats from real sessions only
    const recentSessions = sessions.slice(-10).reverse();
    const avgScore = sessions.length > 0
        ? Math.round(sessions.reduce((a, s) => a + (s.performance_score || 0), 0) / sessions.length)
        : 0;
    const highRiskCount = sessions.filter((s) => (s.avg_risk || 0) >= 70).length;

    // Build trend data from real sessions only
    const chartData = recentSessions.map((s, i) => ({
        label: `Session ${i + 1}`,
        risk: s.avg_risk || 0,
    }));

    // Recordings table from real sessions only
    const recordings = recentSessions.map((s, i) => ({
        id: i,
        name: s.session_id || `Session ${i + 1}`,
        sport: s.sport_mode || 'General',
        type: s.sport_mode === 'default' ? 'Movement Screen' : s.sport_mode,
        date: s.timestamp ? new Date(s.timestamp * 1000).toLocaleString() : 'Recent',
        riskScore: s.avg_risk || 0,
        initials: (s.session_id || 'S')[0].toUpperCase(),
    }));

    const getRiskBadge = (score) => {
        if (score >= 70) return { label: `${score} High`, variant: 'danger' };
        if (score >= 40) return { label: `${score} Med`, variant: 'warning' };
        return { label: `${score} Low`, variant: 'success' };
    };

    const initColors = ['bg-primary-500', 'bg-emerald', 'bg-purple', 'bg-amber', 'bg-danger'];

    return (
        <div className="min-h-screen bg-surface-secondary">
            <TopNavbar />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 overflow-auto">
                    <div className="px-8 py-8">
                        {/* Page Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                            <div>
                                <h1 className="text-2xl font-extrabold text-gray-900">Dashboard Overview</h1>
                                <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.name || 'User'}. Here's your performance data.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button variant="primary" icon="+" size="sm" onClick={() => navigate('/')}>New Session</Button>
                            </div>
                        </div>

                        <div className="h-1 w-32 bg-gradient-to-r from-primary-500 via-cyan to-emerald rounded-full mb-8" />

                        {loading ? (
                            <div className="space-y-6">
                                {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
                            </div>
                        ) : sessions.length === 0 ? (
                            /* Empty state */
                            <Card className="text-center py-20">
                                <span className="text-5xl">📊</span>
                                <h3 className="text-xl font-bold text-gray-900 mt-4">No data yet</h3>
                                <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                                    Upload a video or start a live camera session to begin seeing your biomechanical analysis data here.
                                </p>
                                <Button variant="primary" className="mt-6" onClick={() => navigate('/')}>Start Your First Session</Button>
                            </Card>
                        ) : (
                            <>
                                {/* Stats Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                                    {/* Movement Score */}
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                        <Card className="text-center">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-sm font-bold text-gray-900">Movement Score</h3>
                                                <span className="text-gray-300 text-sm cursor-help" title="Average score across all sessions">ⓘ</span>
                                            </div>
                                            <CircularGauge value={avgScore} max={100} label={avgScore >= 70 ? 'GOOD' : avgScore >= 40 ? 'FAIR' : 'NEEDS WORK'} color="blue" size={140} />
                                        </Card>
                                    </motion.div>

                                    {/* Injury Risk Trend */}
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="xl:col-span-2">
                                        <Card>
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h3 className="text-sm font-bold text-gray-900">Injury Risk Trend</h3>
                                                    <p className="text-xs text-gray-400">Last {chartData.length} sessions</p>
                                                </div>
                                            </div>
                                            {chartData.length > 0 ? (
                                                <div className="h-40">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={chartData}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 100]} />
                                                            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v) => [`${v}%`, 'Risk']} />
                                                            <Bar dataKey="risk" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-400 text-center py-8">No trend data available</p>
                                            )}
                                        </Card>
                                    </motion.div>

                                    {/* Stats stacked */}
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
                                        <div className="bg-gradient-to-br from-purple to-purple-dark rounded-2xl p-5 text-white shadow-glow-purple">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-sm font-semibold opacity-90">Total Sessions</p>
                                                <span className="text-lg">📋</span>
                                            </div>
                                            <p className="text-4xl font-extrabold">{sessions.length}</p>
                                        </div>
                                        <Card>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center text-lg">🔺</div>
                                                <div>
                                                    <p className="text-xs font-semibold uppercase text-gray-400">ALERTS</p>
                                                    <p className="text-xl font-extrabold text-gray-900">{highRiskCount} High Risk</p>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                </div>

                                {/* Recent Recordings Table */}
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                                    <Card>
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-bold text-gray-900">Recent Recordings</h3>
                                            <button className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors" onClick={() => navigate('/sessions')}>
                                                View All
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="text-left text-xs font-semibold uppercase text-gray-400 tracking-wider border-b border-surface-border">
                                                        <th className="py-3 pr-4">Session</th>
                                                        <th className="py-3 pr-4">Session Type</th>
                                                        <th className="py-3 pr-4">Date</th>
                                                        <th className="py-3 pr-4">Risk Score</th>
                                                        <th className="py-3">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {recordings.map((rec, idx) => {
                                                        const badge = getRiskBadge(rec.riskScore);
                                                        return (
                                                            <tr key={rec.id} className="border-b border-surface-border last:border-0 hover:bg-gray-50 transition-colors">
                                                                <td className="py-4 pr-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${initColors[idx % initColors.length]}`}>
                                                                            {rec.initials}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-semibold text-gray-900">{rec.name}</p>
                                                                            <p className="text-xs text-gray-400">{rec.sport}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-4 pr-4"><StatusBadge label={rec.type} variant="info" /></td>
                                                                <td className="py-4 pr-4 text-sm text-gray-500">{rec.date}</td>
                                                                <td className="py-4 pr-4"><StatusBadge label={badge.label} variant={badge.variant} /></td>
                                                                <td className="py-4">
                                                                    <button onClick={() => navigate('/analysis')} className="text-gray-400 hover:text-primary-600 transition-colors text-lg">👁</button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                </motion.div>
                            </>
                        )}
                    </div>
                </main>
            </div>
            <footer className="py-6 text-center text-sm text-gray-400 border-t border-surface-border">{BRAND.copyright}</footer>
        </div>
    );
}
