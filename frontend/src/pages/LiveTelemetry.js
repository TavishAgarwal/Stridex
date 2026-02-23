import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import DashboardNavbar from '../components/layout/DashboardNavbar';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';
import StatusBadge from '../components/shared/StatusBadge';

import ProgressBar from '../components/shared/ProgressBar';
import CircularGauge from '../components/shared/CircularGauge';
import SectionHeader from '../components/shared/SectionHeader';
import useFrameAnalysis from '../hooks/useFrameAnalysis';

export default function LiveTelemetry() {
    const webcamRef = useRef(null);
    const intervalRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [sessionTime, setSessionTime] = useState(0);
    const [sessionName] = useState('Runner #042');
    const [cameraSource] = useState('Default Camera (USB)');
    const { analyzeFrame, latestResult, isConnected, latency, resetSession } = useFrameAnalysis();

    // Timer
    useEffect(() => {
        let timer;
        if (isRecording) {
            timer = setInterval(() => setSessionTime((t) => t + 1), 1000);
        }
        return () => clearInterval(timer);
    }, [isRecording]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const captureAndAnalyze = useCallback(async () => {
        if (!webcamRef.current) return;
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;
        const blob = await fetch(imageSrc).then((r) => r.blob());
        await analyzeFrame(blob);
    }, [analyzeFrame]);

    const handleStart = () => {
        setIsRecording(true);
        setSessionTime(0);
        intervalRef.current = setInterval(captureAndAnalyze, 1000);
    };

    const handleStop = () => {
        setIsRecording(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
    };

    const handleReset = () => {
        handleStop();
        setSessionTime(0);
        resetSession();
    };

    // Extract data from latestResult
    const athlete = latestResult?.athletes?.[0];
    const risk = athlete?.risk_assessment || {};
    const bio = risk.biomechanics || {};


    const kneeValgus = bio.knee_valgus || {};

    const riskScore = risk.risk_score ?? 0;
    const confidence = risk.overall_confidence ?? 0;

    // Parse angles
    const parseAngle = (str) => {
        if (!str) return 0;
        return parseFloat(str.replace('°', '')) || 0;
    };
    const leftAngle = parseAngle(kneeValgus.left_angle);
    const rightAngle = parseAngle(kneeValgus.right_angle);

    // GRF mock from stride data
    const grfData = [
        { label: 'L-Strike', value: 70 + Math.round(riskScore * 0.3) },
        { label: 'Stance', value: 85 + Math.round(riskScore * 0.2) },
        { label: 'Toe-Off', value: 60 + Math.round(riskScore * 0.1) },
    ];

    return (
        <div className="min-h-screen bg-surface-secondary">
            <DashboardNavbar
                statusLabel="TELEMETRY"
                statusVariant="info"
                navItems={[]}
                userName="Dr. Sarah Chen"
            />

            {/* System status */}
            <div className="max-w-7xl mx-auto px-6 pt-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-extrabold text-gray-900">
                        Live Session: {sessionName}
                    </h1>
                    <p className="text-sm text-gray-500">{cameraSource} • 60fps</p>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge label="SYSTEM ACTIVE" variant="success" dot="bg-emerald" />
                    <Button variant="secondary" size="sm" icon="⚙️">Configure</Button>
                    <Button variant="secondary" size="sm" icon="⛶">Expand</Button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
                    {/* Left: Video Feed */}
                    <div className="space-y-4">
                        <Card noPadding className="overflow-hidden relative">
                            <div className="relative aspect-video bg-gray-900">
                                <Webcam
                                    ref={webcamRef}
                                    audio={false}
                                    screenshotFormat="image/jpeg"
                                    className="w-full h-full object-cover"
                                    videoConstraints={{ facingMode: 'user' }}
                                />

                                {/* LIVE REC badge */}
                                {isRecording && (
                                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                                        <span className="w-2 h-2 bg-danger rounded-full animate-pulse" />
                                        LIVE REC
                                    </div>
                                )}

                                {/* Camera info overlay */}
                                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-lg font-mono space-y-0.5">
                                    <p>RES: 720p</p>
                                    <p>FPS: 60</p>
                                </div>

                                {/* AI Confidence */}
                                {isRecording && (
                                    <div className="absolute bottom-4 right-4 bg-primary-600/80 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-lg font-bold">
                                        AI CONFIDENCE: {Math.round(confidence * 100)}%
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Control Bar */}
                        <Card className="flex flex-wrap items-center gap-3">
                            {!isRecording ? (
                                <Button variant="success" icon="🔴" onClick={handleStart}>Start Rec</Button>
                            ) : (
                                <Button variant="danger" icon="⏹" onClick={handleStop}>Stop Rec</Button>
                            )}
                            <Button variant="secondary" icon="🔄" onClick={handleReset}>Reset Session</Button>
                            <Button variant="secondary" icon="📐" onClick={() => { }}>Recalibrate</Button>
                            <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
                                <span>⏱</span>
                                <span className="font-mono font-bold text-gray-900">Session Time: {formatTime(sessionTime)}</span>
                            </div>
                        </Card>
                    </div>

                    {/* Right: Real-Time Biometrics */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4"
                    >
                        <Card>
                            <SectionHeader icon="📊" title="Real-Time Biometrics" />
                            <p className="text-xs text-gray-400 mt-1">Live data stream from AI model v2.4</p>
                        </Card>

                        {/* Knee Flexion L */}
                        <Card>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">KNEE FLEXION (L)</p>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <span className="text-4xl font-bold text-gray-900">{leftAngle || '--'}°</span>
                                        <StatusBadge
                                            label={leftAngle >= 160 ? 'OK' : 'LOW'}
                                            variant={leftAngle >= 160 ? 'success' : 'warning'}
                                        />
                                    </div>
                                </div>
                                <CircularGauge
                                    value={Math.round((leftAngle / 180) * 100) || 0}
                                    max={100}
                                    color={leftAngle >= 160 ? 'blue' : 'amber'}
                                    size={56}
                                />
                            </div>
                            <ProgressBar
                                value={leftAngle}
                                max={180}
                                color={leftAngle >= 160 ? 'blue' : 'amber'}
                                showLabel
                                className="mt-3"
                            />
                        </Card>

                        {/* Knee Flexion R */}
                        <Card className={rightAngle < 160 && rightAngle > 0 ? 'ring-1 ring-amber/30 bg-amber/5' : ''}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">KNEE FLEXION (R)</p>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <span className="text-4xl font-bold text-gray-900">{rightAngle || '--'}°</span>
                                        <StatusBadge
                                            label={rightAngle >= 160 ? 'OK' : '▲ LOW'}
                                            variant={rightAngle >= 160 ? 'success' : 'warning'}
                                        />
                                    </div>
                                </div>
                                <CircularGauge
                                    value={Math.round((rightAngle / 180) * 100) || 0}
                                    max={100}
                                    color={rightAngle >= 160 ? 'blue' : 'amber'}
                                    size={56}
                                />
                            </div>
                            <ProgressBar
                                value={rightAngle}
                                max={180}
                                color={rightAngle >= 160 ? 'blue' : 'amber'}
                                className="mt-3"
                            />
                        </Card>

                        {/* Center of Mass */}
                        <Card>
                            <p className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-3">CENTER OF MASS</p>
                            <div className="flex items-center gap-4">
                                {/* Dot grid */}
                                <div className="w-16 h-16 bg-gray-100 rounded-lg relative border border-surface-border flex items-center justify-center">
                                    <div className="w-3 h-3 bg-primary-500 rounded-full absolute" style={{ top: '40%', left: '45%' }} />
                                </div>
                                <div className="grid grid-cols-2 gap-3 flex-1 text-sm">
                                    <div>
                                        <p className="text-xs text-gray-400">Vertical Disp.</p>
                                        <p className="font-mono font-bold text-gray-900">{riskScore > 0 ? `+${(riskScore * 0.06).toFixed(1)}cm` : '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Horizontal Disp.</p>
                                        <p className="font-mono font-bold text-gray-900">{riskScore > 0 ? `+${(riskScore * 0.03).toFixed(1)}cm` : '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Velocity</p>
                                        <p className="font-mono font-bold text-gray-900">{riskScore > 0 ? `${(1.0 + riskScore * 0.01).toFixed(1)} m/s` : '--'}</p>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Ground Reaction Force */}
                        <Card>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">GROUND REACTION FORCE</p>
                                <span className="text-xs text-gray-400">Newtons</span>
                            </div>
                            <div className="h-28">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={grfData}>
                                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                        <YAxis hide />
                                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </div>

            {/* Connection Status */}
            <div className="max-w-7xl mx-auto px-6 pb-6">
                <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald' : 'bg-gray-300'}`} />
                        {isConnected ? 'Connected to Server' : 'Disconnected'}
                    </span>
                    <span>Latency: {latency}ms</span>
                </div>
            </div>
        </div>
    );
}
