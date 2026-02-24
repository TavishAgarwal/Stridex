import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TopNavbar from '../components/layout/TopNavbar';
import Sidebar from '../components/layout/Sidebar';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';
import StatusBadge from '../components/shared/StatusBadge';
import useSessionHistory from '../hooks/useSessionHistory';
import { BRAND } from '../config/siteConfig';

/* ─── helpers ────────────────────────────────────────────── */
const TABS = [
    { id: 'video', label: '🎬 Video Analysis', icon: '🎬' },
    { id: 'live', label: '📡 Live Video', icon: '📡' },
    { id: 'comparison', label: '⚖️ Comparison', icon: '⚖️' },
];

/** Infer session type from session_id and data shape */
function inferType(s) {
    const id = (s.session_id || '').toLowerCase();
    if (id.startsWith('compare') || id.startsWith('comparison') || s.session_type === 'comparison') return 'comparison';
    if (id.startsWith('video_') || id.startsWith('video')) return 'video';
    // Live sessions typically have session_duration_s or start with "session_" or are "default" ids
    return 'live';
}

function getRiskBadge(score) {
    if (score >= 70) return { label: `${score}% High`, variant: 'danger' };
    if (score >= 40) return { label: `${score}% Med`, variant: 'warning' };
    return { label: `${score}% Low`, variant: 'success' };
}

/* ─── sub-components ─────────────────────────────────────── */
function EmptyTabState({ tab, navigate }) {
    const msgs = {
        video: { icon: '🎬', title: 'No video analysis sessions', desc: 'Upload a video to run biomechanical analysis.' },
        live: { icon: '📡', title: 'No live camera sessions', desc: 'Start a live camera session to record your movement.' },
        comparison: { icon: '⚖️', title: 'No comparison sessions', desc: 'Use Comparison Mode to compare two video sessions.' },
    };
    const m = msgs[tab];
    return (
        <Card className="text-center py-16">
            <span className="text-5xl">{m.icon}</span>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-4">{m.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">{m.desc}</p>
            <Button variant="primary" className="mt-5" onClick={() => navigate('/')}>Start Session</Button>
        </Card>
    );
}

function DeleteConfirm({ onConfirm, onCancel, loading }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 dark:text-slate-400">Delete?</span>
            <button
                onClick={onConfirm}
                disabled={loading}
                className="text-xs px-2 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50"
            >
                {loading ? '…' : 'Yes'}
            </button>
            <button
                onClick={onCancel}
                className="text-xs px-2 py-1 rounded-md bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-700 dark:text-slate-200 font-semibold transition-colors"
            >
                No
            </button>
        </div>
    );
}

/* ─── session table ─────────────────────────────────────── */
function SessionTable({ sessions, onDelete }) {
    const [confirmIdx, setConfirmIdx] = useState(null);
    const [deletingIdx, setDeletingIdx] = useState(null);

    const handleDelete = async (s, idx) => {
        setDeletingIdx(idx);
        try {
            await onDelete(s.session_id, s.timestamp);
        } finally {
            setDeletingIdx(null);
            setConfirmIdx(null);
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="text-left text-xs font-semibold uppercase text-gray-400 dark:text-slate-500 tracking-wider border-b border-surface-border dark:border-slate-700">
                        <th className="py-3 pr-4 w-8">#</th>
                        <th className="py-3 pr-4">Session ID</th>
                        <th className="py-3 pr-4">Date</th>
                        <th className="py-3 pr-4">Avg Risk</th>
                        <th className="py-3 pr-4">Score</th>
                        <th className="py-3 pr-4">Reps</th>
                        <th className="py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sessions.map((s, i) => {
                        const badge = getRiskBadge(s.avg_risk || 0);
                        const isConfirming = confirmIdx === i;
                        const isDeleting = deletingIdx === i;
                        return (
                            <motion.tr
                                key={`${s.session_id}-${s.timestamp}-${i}`}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10, height: 0 }}
                                transition={{ duration: 0.18, delay: i * 0.03 }}
                                className="border-b border-surface-border dark:border-slate-700 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                                <td className="py-4 pr-4 text-sm text-gray-400 dark:text-slate-500">{sessions.length - i}</td>
                                <td className="py-4 pr-4 text-sm font-medium text-gray-900 dark:text-gray-100 max-w-[220px] truncate">
                                    {s.session_id || `session_${i}`}
                                </td>
                                <td className="py-4 pr-4 text-sm text-gray-500 dark:text-slate-400">
                                    {s.timestamp ? new Date(s.timestamp * 1000).toLocaleString() : '—'}
                                </td>
                                <td className="py-4 pr-4">
                                    <StatusBadge label={badge.label} variant={badge.variant} />
                                </td>
                                <td className="py-4 pr-4 text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {s.performance_score ?? '—'}
                                </td>
                                <td className="py-4 pr-4 text-sm text-gray-500 dark:text-slate-400">
                                    {s.rep_count || '—'}
                                </td>
                                <td className="py-4 text-right">
                                    {isConfirming ? (
                                        <DeleteConfirm
                                            loading={isDeleting}
                                            onConfirm={() => handleDelete(s, i)}
                                            onCancel={() => setConfirmIdx(null)}
                                        />
                                    ) : (
                                        <button
                                            onClick={() => setConfirmIdx(i)}
                                            title="Delete session"
                                            className="text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors text-lg leading-none"
                                        >
                                            🗑
                                        </button>
                                    )}
                                </td>
                            </motion.tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

/* ─── main page ─────────────────────────────────────────── */
export default function SessionsPage() {
    const navigate = useNavigate();
    const { sessions, loading, deleteSession } = useSessionHistory();
    const [activeTab, setActiveTab] = useState('video');

    // Partition sessions by inferred type (reversed = newest first)
    const allReversed = [...sessions].reverse();
    const byType = {
        video: allReversed.filter(s => inferType(s) === 'video'),
        live: allReversed.filter(s => inferType(s) === 'live'),
        comparison: allReversed.filter(s => inferType(s) === 'comparison'),
    };

    const counts = {
        video: byType.video.length,
        live: byType.live.length,
        comparison: byType.comparison.length,
    };

    return (
        <div className="min-h-screen bg-surface-secondary dark:bg-[#0f172a] transition-colors duration-300">
            <TopNavbar />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 overflow-auto px-8 py-8">

                    {/* Page header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Sessions</h1>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                                {sessions.length} total sessions recorded
                            </p>
                        </div>
                        <Button variant="primary" icon="+" size="sm" onClick={() => navigate('/')}>New Session</Button>
                    </div>

                    {/* Tab switcher */}
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-surface-border dark:border-slate-700 rounded-xl p-1 w-fit mb-6 shadow-sm">
                        {TABS.map(tab => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        relative px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2
                                        ${isActive
                                            ? 'bg-primary-600 text-white shadow-md'
                                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'}
                                    `}
                                >
                                    <span>{tab.icon}</span>
                                    <span className="hidden sm:inline">{tab.label.split(' ').slice(1).join(' ')}</span>
                                    {counts[tab.id] > 0 && (
                                        <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-slate-300'}`}>
                                            {counts[tab.id]}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.18 }}
                            >
                                {byType[activeTab].length === 0 ? (
                                    <EmptyTabState tab={activeTab} navigate={navigate} />
                                ) : (
                                    <Card>
                                        <div className="flex items-center justify-between mb-4">
                                            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">
                                                {counts[activeTab]} session{counts[activeTab] !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <SessionTable sessions={byType[activeTab]} onDelete={deleteSession} />
                                    </Card>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    )}
                </main>
            </div>
            <footer className="py-6 text-center text-sm text-gray-400 border-t border-surface-border dark:border-slate-700">
                {BRAND.copyright}
            </footer>
        </div>
    );
}
