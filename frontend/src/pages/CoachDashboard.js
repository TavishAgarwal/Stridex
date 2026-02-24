import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import TopNavbar from '../components/layout/TopNavbar';
import Sidebar from '../components/layout/Sidebar';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';
import StatusBadge from '../components/shared/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { BRAND, BACKEND_URL } from '../config/siteConfig';

// ── helpers ──────────────────────────────────────────────────────────────────
const TREND_THRESHOLD = 5;

function trendIcon(trend) {
    if (trend === 'improving') return { icon: '🟢', label: 'Improving', color: 'text-emerald-500' };
    if (trend === 'worsening') return { icon: '🔴', label: 'Worsening', color: 'text-red-500' };
    return { icon: '🟡', label: 'Stable', color: 'text-yellow-500' };
}

function clearanceBadge(cleared) {
    if (cleared === true) return <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">✅ Cleared</span>;
    if (cleared === false) return <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">🚫 Not Cleared</span>;
    return <span className="text-xs text-gray-400">—</span>;
}

function fmtDate(ts) {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── sub-components ────────────────────────────────────────────────────────────

function RiskLeaderboard({ rows, loading }) {
    return (
        <Card>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">🏆 Weekly Risk Leaderboard</h3>
            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
            ) : rows.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No session data this week</p>
            ) : (
                <div className="space-y-2">
                    {rows.map((r, i) => (
                        <motion.div
                            key={r.athlete_id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.07 }}
                            className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-extrabold text-gray-300 dark:text-slate-500 w-5 text-center">{i + 1}</span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{r.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400">{r.session_count} sessions</span>
                                <StatusBadge
                                    label={`${r.weekly_avg_risk}% avg`}
                                    variant={r.weekly_avg_risk >= 70 ? 'danger' : r.weekly_avg_risk >= 40 ? 'warning' : 'success'}
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </Card>
    );
}

function AssignAthletePanel({ authHeader, onAssigned }) {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState(null); // null | {ok, msg}
    const [loading, setLoading] = useState(false);

    const handleAssign = async () => {
        if (!email.trim()) return;
        setLoading(true);
        setStatus(null);
        try {
            const res = await axios.post(
                `${BACKEND_URL}/assign-athlete`,
                { athlete_email: email.trim() },
                { headers: authHeader() }
            );
            setStatus({ ok: true, msg: `${res.data.athlete.name} added to your roster` });
            setEmail('');
            onAssigned();
        } catch (err) {
            setStatus({ ok: false, msg: err.response?.data?.detail || 'Failed to assign athlete' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">➕ Assign Athlete</h3>
            <div className="flex gap-2">
                <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAssign()}
                    placeholder="athlete@email.com"
                    className="flex-1 px-3 py-2 rounded-xl border border-surface-border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-400"
                />
                <Button variant="primary" size="sm" onClick={handleAssign} disabled={loading}>
                    {loading ? '…' : 'Assign'}
                </Button>
            </div>
            <AnimatePresence>
                {status && (
                    <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`text-xs mt-2 font-medium ${status.ok ? 'text-emerald-500' : 'text-red-500'}`}
                    >
                        {status.ok ? '✅ ' : '❌ '}{status.msg}
                    </motion.p>
                )}
            </AnimatePresence>
        </Card>
    );
}

function AthleteTable({ athletes, loading }) {
    const navigate = useNavigate();
    return (
        <Card>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">👥 Your Athletes</h3>
            {loading ? (
                <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-slate-700 rounded-xl animate-pulse" />)}</div>
            ) : athletes.length === 0 ? (
                <div className="text-center py-12">
                    <span className="text-4xl">👟</span>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-3">No athletes assigned yet. Use the panel above to add them by email.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-xs font-semibold uppercase text-gray-400 dark:text-slate-500 tracking-wider border-b border-surface-border dark:border-slate-700">
                                <th className="py-3 pr-4">Athlete</th>
                                <th className="py-3 pr-4">Last Session</th>
                                <th className="py-3 pr-4">Avg Risk</th>
                                <th className="py-3 pr-4">Trend</th>
                                <th className="py-3 pr-4">Clearance</th>
                                <th className="py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {athletes.map((a, i) => {
                                const trend = trendIcon(a.risk_trend);
                                return (
                                    <motion.tr
                                        key={a.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="border-b border-surface-border dark:border-slate-700 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <td className="py-4 pr-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary-600/20 flex items-center justify-center text-xs font-bold text-primary-600 dark:text-primary-400">
                                                    {a.name[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{a.name}</p>
                                                    <p className="text-xs text-gray-400">{a.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 pr-4 text-sm text-gray-500 dark:text-slate-400">{fmtDate(a.last_session_date)}</td>
                                        <td className="py-4 pr-4">
                                            {a.avg_risk != null
                                                ? <StatusBadge label={`${a.avg_risk}%`} variant={a.avg_risk >= 70 ? 'danger' : a.avg_risk >= 40 ? 'warning' : 'success'} />
                                                : <span className="text-gray-400 text-sm">—</span>}
                                        </td>
                                        <td className="py-4 pr-4">
                                            <span className={`text-sm font-medium ${trend.color}`} title={trend.label}>
                                                {trend.icon} {trend.label}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-4">{clearanceBadge(a.cleared_to_play)}</td>
                                        <td className="py-4 text-right">
                                            <Button variant="ghost" size="xs" onClick={() => navigate(`/sessions?athlete=${a.id}`)}>
                                                View
                                            </Button>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CoachDashboard() {
    const { user, authHeader } = useAuth();
    const [athletes, setAthletes] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loadingA, setLoadingA] = useState(true);
    const [loadingL, setLoadingL] = useState(true);

    const fetchAthletes = useCallback(async () => {
        setLoadingA(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/coach/athletes`, { headers: authHeader() });
            setAthletes(res.data.athletes || []);
        } catch { setAthletes([]); }
        finally { setLoadingA(false); }
    }, [authHeader]);

    const fetchLeaderboard = useCallback(async () => {
        setLoadingL(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/coach/leaderboard`, { headers: authHeader() });
            setLeaderboard(res.data.leaderboard || []);
        } catch { setLeaderboard([]); }
        finally { setLoadingL(false); }
    }, [authHeader]);

    useEffect(() => {
        fetchAthletes();
        fetchLeaderboard();
    }, [fetchAthletes, fetchLeaderboard]);

    const handleAssigned = () => { fetchAthletes(); fetchLeaderboard(); };

    return (
        <div className="min-h-screen bg-surface-secondary dark:bg-[#0f172a] transition-colors duration-300">
            <TopNavbar />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 overflow-auto px-8 py-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Coach Dashboard</h1>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                                Welcome, {user?.name}. Managing {athletes.length} athlete{athletes.length !== 1 ? 's' : ''}.
                            </p>
                        </div>
                    </div>

                    <div className="h-1 w-32 bg-gradient-to-r from-primary-500 via-cyan to-emerald rounded-full mb-8" />

                    {/* Top row: Leaderboard + Assign panel */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                        <div className="xl:col-span-2">
                            <RiskLeaderboard rows={leaderboard} loading={loadingL} />
                        </div>
                        <AssignAthletePanel authHeader={authHeader} onAssigned={handleAssigned} />
                    </div>

                    {/* Athlete table */}
                    <AthleteTable athletes={athletes} loading={loadingA} />
                </main>
            </div>
            <footer className="py-6 text-center text-sm text-gray-400 border-t border-surface-border dark:border-slate-700">
                {BRAND.copyright}
            </footer>
        </div>
    );
}
