import React from 'react';
import { useNavigate } from 'react-router-dom';
import TopNavbar from '../components/layout/TopNavbar';
import Sidebar from '../components/layout/Sidebar';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';
import StatusBadge from '../components/shared/StatusBadge';
import useSessionHistory from '../hooks/useSessionHistory';
import { BRAND } from '../config/siteConfig';

export default function SessionsPage() {
    const navigate = useNavigate();
    const { sessions, loading } = useSessionHistory();

    const getRiskBadge = (score) => {
        if (score >= 70) return { label: `${score}% High`, variant: 'danger' };
        if (score >= 40) return { label: `${score}% Med`, variant: 'warning' };
        return { label: `${score}% Low`, variant: 'success' };
    };

    return (
        <div className="min-h-screen bg-surface-secondary">
            <TopNavbar />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 overflow-auto px-8 py-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-extrabold text-gray-900">Sessions</h1>
                            <p className="text-sm text-gray-500 mt-1">{sessions.length} total sessions recorded</p>
                        </div>
                        <Button variant="primary" icon="+" size="sm" onClick={() => navigate('/')}>New Session</Button>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
                        </div>
                    ) : sessions.length === 0 ? (
                        <Card className="text-center py-16">
                            <span className="text-4xl">📋</span>
                            <h3 className="text-lg font-bold text-gray-900 mt-4">No sessions yet</h3>
                            <p className="text-sm text-gray-500 mt-2">Start by uploading a video or using the live camera.</p>
                            <Button variant="primary" className="mt-4" onClick={() => navigate('/')}>Start Analysis</Button>
                        </Card>
                    ) : (
                        <Card>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-xs font-semibold uppercase text-gray-400 tracking-wider border-b border-surface-border">
                                            <th className="py-3 pr-4">#</th>
                                            <th className="py-3 pr-4">Session ID</th>
                                            <th className="py-3 pr-4">Sport</th>
                                            <th className="py-3 pr-4">Date</th>
                                            <th className="py-3 pr-4">Avg Risk</th>
                                            <th className="py-3 pr-4">Score</th>
                                            <th className="py-3">Reps</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sessions.slice().reverse().map((s, i) => {
                                            const badge = getRiskBadge(s.avg_risk || 0);
                                            return (
                                                <tr key={i} className="border-b border-surface-border last:border-0 hover:bg-gray-50 transition-colors">
                                                    <td className="py-4 pr-4 text-sm text-gray-400">{sessions.length - i}</td>
                                                    <td className="py-4 pr-4 text-sm font-medium text-gray-900">{s.session_id || `session_${i}`}</td>
                                                    <td className="py-4 pr-4"><StatusBadge label={s.sport_mode || 'default'} variant="info" /></td>
                                                    <td className="py-4 pr-4 text-sm text-gray-500">
                                                        {s.timestamp ? new Date(s.timestamp * 1000).toLocaleString() : '—'}
                                                    </td>
                                                    <td className="py-4 pr-4"><StatusBadge label={badge.label} variant={badge.variant} /></td>
                                                    <td className="py-4 pr-4 text-sm font-bold text-gray-900">{s.performance_score || '—'}</td>
                                                    <td className="py-4 text-sm text-gray-500">{s.rep_count || '—'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </main>
            </div>
            <footer className="py-6 text-center text-sm text-gray-400 border-t border-surface-border">{BRAND.copyright}</footer>
        </div>
    );
}
