import React from 'react';
import { useNavigate } from 'react-router-dom';
import TopNavbar from '../components/layout/TopNavbar';
import Sidebar from '../components/layout/Sidebar';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';
import useSessionHistory from '../hooks/useSessionHistory';
import { BRAND, BACKEND_URL } from '../config/siteConfig';
import axios from 'axios';

export default function ReportsPage() {
    const navigate = useNavigate();
    const { sessions, loading } = useSessionHistory();

    const handleDownload = async (sessionId) => {
        try {
            const res = await axios.get(`${BACKEND_URL}/generate-report/${sessionId}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `stridex_report_${sessionId}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('Report generation failed — no data available for this session.');
        }
    };

    return (
        <div className="min-h-screen bg-surface-secondary">
            <TopNavbar />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 overflow-auto px-8 py-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-extrabold text-gray-900">Reports</h1>
                            <p className="text-sm text-gray-500 mt-1">Download PDF reports from your analysis sessions</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
                        </div>
                    ) : sessions.length === 0 ? (
                        <Card className="text-center py-16">
                            <span className="text-4xl">📄</span>
                            <h3 className="text-lg font-bold text-gray-900 mt-4">No reports available</h3>
                            <p className="text-sm text-gray-500 mt-2">Complete an analysis session to generate a report.</p>
                            <Button variant="primary" className="mt-4" onClick={() => navigate('/')}>Start Analysis</Button>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sessions.slice().reverse().map((s, i) => (
                                <Card key={i} className="space-y-3 hover:shadow-glass-lg transition-shadow">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-lg">📄</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">{s.session_id || `Session ${sessions.length - i}`}</p>
                                            <p className="text-xs text-gray-400">
                                                {s.timestamp ? new Date(s.timestamp * 1000).toLocaleDateString() : 'Recent'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>Risk: <strong className="text-gray-900">{s.avg_risk || 0}%</strong></span>
                                        <span>Score: <strong className="text-gray-900">{s.performance_score || '—'}</strong></span>
                                    </div>
                                    <Button variant="secondary" size="sm" icon="⬇" className="w-full justify-center"
                                        onClick={() => handleDownload(s.session_id || 'default')}>
                                        Download PDF
                                    </Button>
                                </Card>
                            ))}
                        </div>
                    )}
                </main>
            </div>
            <footer className="py-6 text-center text-sm text-gray-400 border-t border-surface-border">{BRAND.copyright}</footer>
        </div>
    );
}
