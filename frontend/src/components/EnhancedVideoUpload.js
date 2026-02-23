import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { FiUpload, FiPlay, FiDownload, FiChevronLeft, FiChevronRight, FiCamera, FiShare2 } from 'react-icons/fi';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

function EnhancedVideoUpload() {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setUploadProgress(0);
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a video file');
      return;
    }

    setAnalyzing(true);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadProgress(30);
      const response = await axios.post(
        `${BACKEND_URL}/analyze-video-enhanced`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        }
      );

      setResult(response.data);
      setCurrentFrameIndex(0);
    } catch (error) {
      console.error('Error:', error);
      alert('Analysis failed. Make sure backend is running.');
    } finally {
      setAnalyzing(false);
    }
  };

  const getRiskColor = (level) => {
    const colors = {
      'HIGH': '#ef4444',
      'MEDIUM': '#f97316',
      'LOW': '#10b981'
    };
    return colors[level] || '#64748b';
  };

  const downloadReport = () => {
    const reportData = {
      analysis_date: new Date().toISOString(),
      video_info: result.video_info,
      summary: result.analysis_summary,
      detailed_results: result.timeline
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stridex-analysis-${Date.now()}.json`;
    a.click();
  };

  const downloadScreenshot = () => {
    if (!currentFrame) return;

    const frameReport = {
      frame_number: currentFrame.frame_number,
      timestamp: currentFrame.timestamp,
      risk_score: currentFrame.risk_score,
      risk_level: currentFrame.risk_level,
      risk_factors: currentFrame.risk_factors,
      biomechanics: currentFrame.biomechanics,
      confidence: currentFrame.overall_confidence
    };

    const blob = new Blob([JSON.stringify(frameReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stridex-frame-${currentFrame.frame_number}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareAnalysis = async () => {
    if (!currentFrame) return;

    const shareData = {
      title: 'STRIDEX-AI Analysis',
      text: `Risk Level: ${currentFrame.risk_level} (${currentFrame.risk_score}%) - Analyzed by STRIDEX-AI`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(`STRIDEX-AI Frame Analysis\nRisk: ${currentFrame.risk_level} (${currentFrame.risk_score}%)\nTimestamp: ${currentFrame.timestamp}s`);
      alert('✅ Analysis copied to clipboard!');
    }
  };

  const currentFrame = result?.frames?.[currentFrameIndex];

  return (
    <div style={{ padding: '30px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #8b5cf6 50%, #06b6d4 100%)',
          padding: '45px',
          borderRadius: '25px',
          marginBottom: '40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: '1px solid rgba(6, 182, 212, 0.3)'
        }}
      >
        <h2 style={{ color: 'white', margin: '0 0 25px 0', fontSize: '2.2rem', fontWeight: '800' }}>
          <FiUpload style={{ marginRight: '15px', verticalAlign: 'middle' }} />
          Upload Video for Analysis
        </h2>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{
            padding: '18px 35px',
            backgroundColor: 'white',
            color: '#1e3a8a',
            borderRadius: '15px',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'inline-block',
            transition: 'all 0.3s',
            boxShadow: '0 5px 20px rgba(255,255,255,0.2)',
            border: '2px solid rgba(6, 182, 212, 0.5)',
            fontSize: '16px'
          }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
              e.target.style.boxShadow = '0 8px 30px rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 5px 20px rgba(255,255,255,0.2)';
            }}
          >
            📁 Choose Video File
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>

          {file && (
            <span style={{
              color: 'white',
              fontSize: '15px',
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '10px',
              backdropFilter: 'blur(10px)'
            }}>
              ✅ {file.name}
            </span>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || analyzing}
            style={{
              padding: '18px 45px',
              fontSize: '17px',
              background: file && !analyzing ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#475569',
              color: 'white',
              border: 'none',
              borderRadius: '15px',
              cursor: file && !analyzing ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.3s',
              marginLeft: 'auto',
              boxShadow: file && !analyzing ? '0 10px 30px rgba(16, 185, 129, 0.4)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (file && !analyzing) {
                e.target.style.transform = 'scale(1.05)';
                e.target.style.boxShadow = '0 15px 40px rgba(16, 185, 129, 0.6)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = file && !analyzing ? '0 10px 30px rgba(16, 185, 129, 0.4)' : 'none';
            }}
          >
            <FiPlay />
            {analyzing ? `⏳ Analyzing... ${uploadProgress}%` : '▶️ Analyze Video'}
          </button>
        </div>

        {analyzing && (
          <div style={{
            marginTop: '25px',
            height: '10px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)'
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.5 }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #10b981, #06b6d4, #8b5cf6)',
                borderRadius: '10px',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.8)'
              }}
            />
          </div>
        )}
      </motion.div>

      {/* Results Section */}
      <AnimatePresence>
        {result && result.success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {/* Hero: Risk Category + Score + What This Means */}
            {result.analysis_summary.overall_video_score !== undefined && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, type: 'spring' }}
                style={{ padding: '35px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', borderRadius: '25px', marginBottom: '25px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '25px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
                    <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                      <svg viewBox="0 0 120 120" width="120" height="120">
                        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(100,116,139,0.2)" strokeWidth="10" />
                        <circle cx="60" cy="60" r="52" fill="none"
                          stroke={result.analysis_summary.overall_video_score >= 70 ? '#10b981' : result.analysis_summary.overall_video_score >= 40 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="10" strokeLinecap="round"
                          strokeDasharray={`${(result.analysis_summary.overall_video_score / 100) * 327} 327`}
                          transform="rotate(-90 60 60)"
                          style={{ filter: `drop-shadow(0 0 8px ${result.analysis_summary.overall_video_score >= 70 ? '#10b981' : result.analysis_summary.overall_video_score >= 40 ? '#f59e0b' : '#ef4444'})` }} />
                      </svg>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>{result.analysis_summary.overall_video_score}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>/ 100</div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', letterSpacing: '1.5px', marginBottom: '6px' }}>MOVEMENT ASSESSMENT</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: '900', color: result.analysis_summary.overall_video_score >= 70 ? '#10b981' : result.analysis_summary.overall_video_score >= 40 ? '#f59e0b' : '#ef4444' }}>
                        {result.analysis_summary.risk_category || 'Analyzing...'}
                      </div>
                      <p style={{ margin: '6px 0 0 0', color: '#a78bfa', fontSize: '14px', fontStyle: 'italic' }}>{result.analysis_summary.motivational}</p>
                    </div>
                  </div>
                  {/* Score Breakdown */}
                  {result.analysis_summary.score_breakdown && Object.keys(result.analysis_summary.score_breakdown).length > 0 && (
                    <div style={{ minWidth: '260px', flex: 1, maxWidth: '380px' }}>
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', marginBottom: '12px', letterSpacing: '0.5px' }}>SCORE BREAKDOWN</div>
                      {[
                        { key: 'form_quality', label: 'Form Quality', color: '#10b981' },
                        { key: 'risk_distribution', label: 'Safe Movement', color: '#06b6d4' },
                        { key: 'consistency', label: 'Consistency', color: '#8b5cf6' },
                        { key: 'detection_confidence', label: 'Camera Clarity', color: '#f59e0b' }
                      ].map((item, idx) => {
                        const bd = result.analysis_summary.score_breakdown[item.key];
                        const val = bd?.score ?? bd ?? 0;
                        const max = bd?.max ?? (idx === 0 ? 40 : idx === 1 ? 25 : idx === 2 ? 20 : 15);
                        const tip = bd?.label || '';
                        return (
                          <div key={idx} style={{ marginBottom: idx < 3 ? '8px' : 0 }} title={tip}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                              <span style={{ color: '#cbd5e1', fontSize: '12px', fontWeight: '600' }}>{item.label}</span>
                              <span style={{ color: item.color, fontSize: '12px', fontWeight: '700', fontFamily: 'monospace' }}>{val}/{max}</span>
                            </div>
                            <div style={{ height: '6px', background: 'rgba(100,116,139,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                              <motion.div initial={{ width: 0 }} animate={{ width: `${(val / max) * 100}%` }} transition={{ duration: 0.8, delay: 0.2 + idx * 0.1 }}
                                style={{ height: '100%', background: `linear-gradient(90deg, ${item.color}, ${item.color}cc)`, borderRadius: '3px', boxShadow: `0 0 8px ${item.color}60` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* What This Means Box */}
                {result.analysis_summary.what_this_means && (
                  <div style={{ marginTop: '22px', padding: '18px 22px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '14px' }}>
                    <div style={{ fontSize: '12px', color: '#a78bfa', fontWeight: '700', marginBottom: '6px', letterSpacing: '0.5px' }}>💡 WHAT THIS MEANS</div>
                    <p style={{ margin: 0, color: '#e2e8f0', fontSize: '14px', lineHeight: '1.7' }}>{result.analysis_summary.what_this_means}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '25px', marginBottom: '40px' }}>
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                style={{
                  padding: '30px',
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                  borderRadius: '20px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                  borderLeft: `5px solid ${getRiskColor(
                    result.analysis_summary.average_risk >= 70 ? 'HIGH' :
                      result.analysis_summary.average_risk >= 40 ? 'MEDIUM' : 'LOW'
                  )}`,
                  transition: 'all 0.3s'
                }}
              >
                <h4 style={{ margin: '0 0 12px 0', color: '#94a3b8', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Average Risk</h4>
                <h2 style={{
                  margin: 0,
                  fontSize: '3rem',
                  fontWeight: '900',
                  color: getRiskColor(
                    result.analysis_summary.average_risk >= 70 ? 'HIGH' :
                      result.analysis_summary.average_risk >= 40 ? 'MEDIUM' : 'LOW'
                  ),
                  textShadow: `0 0 30px ${getRiskColor(
                    result.analysis_summary.average_risk >= 70 ? 'HIGH' :
                      result.analysis_summary.average_risk >= 40 ? 'MEDIUM' : 'LOW'
                  )}50`
                }}>
                  {result.analysis_summary.average_risk}%
                </h2>
              </motion.div>

              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                style={{
                  padding: '30px',
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                  borderRadius: '20px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderLeft: '5px solid #8b5cf6'
                }}
              >
                <h4 style={{ margin: '0 0 12px 0', color: '#94a3b8', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Frames Analyzed</h4>
                <h2 style={{ margin: 0, fontSize: '3rem', color: '#8b5cf6', fontWeight: '900', textShadow: '0 0 30px rgba(139, 92, 246, 0.5)' }}>{result.analysis_summary.frames_analyzed}</h2>
              </motion.div>

              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                style={{
                  padding: '30px',
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                  borderRadius: '20px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderLeft: '5px solid #ef4444'
                }}
              >
                <h4 style={{ margin: '0 0 12px 0', color: '#94a3b8', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Max Risk</h4>
                <h2 style={{ margin: 0, fontSize: '3rem', color: '#ef4444', fontWeight: '900', textShadow: '0 0 30px rgba(239, 68, 68, 0.5)' }}>{result.analysis_summary.max_risk}%</h2>
              </motion.div>

              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                style={{
                  padding: '30px',
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                  borderRadius: '20px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                  borderLeft: '5px solid #06b6d4'
                }}
              >
                <h4 style={{ margin: '0 0 12px 0', color: '#94a3b8', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Duration</h4>
                <h2 style={{ margin: 0, fontSize: '3rem', color: '#06b6d4', fontWeight: '900', textShadow: '0 0 30px rgba(6, 182, 212, 0.5)' }}>{result.video_info.duration}s</h2>
              </motion.div>
            </div>

            {/* Performance Strengths */}
            {result.strengths && result.strengths.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(5, 150, 105, 0.03) 100%)', borderRadius: '20px', padding: '28px', marginBottom: '25px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#10b981', fontSize: '1.2rem', fontWeight: '700' }}>💪 Your Strengths</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {result.strengths.map((s, idx) => (
                    <div key={idx} style={{ padding: '12px 18px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.15)', flex: '1 1 240px' }}>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#a7f3d0', marginBottom: '4px' }}>{s.icon} {s.area}</div>
                      <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>{s.message}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Simplified Biomechanics */}
            {result.video_biomechanics && Object.keys(result.video_biomechanics).length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', borderRadius: '22px', padding: '30px', marginBottom: '25px', boxShadow: '0 15px 50px rgba(0,0,0,0.35)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                <h3 style={{ margin: '0 0 6px 0', color: 'white', fontSize: '1.3rem', fontWeight: '700' }}>📊 How Your Body Moved</h3>
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 20px 0' }}>Simplified biomechanics across {result.analysis_summary.frames_analyzed} frames</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {['knee_valgus', 'stride_asymmetry', 'posture'].map((key) => {
                    const bio = result.video_biomechanics[key];
                    if (!bio) return null;
                    const statusColor = bio.status === 'good' ? '#10b981' : bio.status === 'fair' ? '#f59e0b' : '#ef4444';
                    const statusBg = bio.status === 'good' ? 'rgba(16,185,129,0.1)' : bio.status === 'fair' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';
                    const statusBorder = bio.status === 'good' ? 'rgba(16,185,129,0.25)' : bio.status === 'fair' ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)';
                    const statusLabel = bio.status === 'good' ? '✅ Good' : bio.status === 'fair' ? '⚡ Fair' : '⚠️ Concern';
                    return (
                      <div key={key} style={{ padding: '20px', background: statusBg, borderRadius: '16px', border: `1px solid ${statusBorder}` }} title={bio.tooltip || ''}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <h4 style={{ margin: 0, color: statusColor, fontSize: '1rem', fontWeight: '700' }}>{bio.title || key}</h4>
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: statusBg, color: statusColor, border: `1px solid ${statusBorder}` }}>{statusLabel}</span>
                        </div>
                        <p style={{ margin: '0 0 10px 0', color: '#e2e8f0', fontSize: '14px', lineHeight: '1.6' }}>{bio.plain_english}</p>
                        <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>ℹ️ {bio.tooltip}</div>
                      </div>
                    );
                  })}
                </div>
                {result.video_biomechanics.most_common_risk_factors && result.video_biomechanics.most_common_risk_factors.length > 0 && (
                  <div style={{ marginTop: '18px' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', letterSpacing: '0.5px' }}>MOST FREQUENT ISSUES</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {result.video_biomechanics.most_common_risk_factors.map((rf, idx) => (
                        <span key={idx} style={{ padding: '6px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#fca5a5', fontSize: '12px', fontWeight: '600' }}>
                          {rf.factor} <span style={{ color: '#ef4444', fontWeight: '800', marginLeft: '4px' }}>{rf.frequency_pct}%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Fatigue Projection */}
            {result.fatigue_projection && result.fatigue_projection.message && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', borderRadius: '20px', padding: '25px', marginBottom: '25px', border: `1px solid ${result.fatigue_projection.status === 'high' ? 'rgba(239,68,68,0.3)' : result.fatigue_projection.status === 'moderate' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: '700' }}>⏱️ Fatigue Analysis</h3>
                  <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                    <span style={{ color: '#94a3b8' }}>Start: <strong style={{ color: '#10b981' }}>{result.fatigue_projection.start_risk}%</strong> risk</span>
                    <span style={{ color: '#94a3b8' }}>→</span>
                    <span style={{ color: '#94a3b8' }}>End: <strong style={{ color: result.fatigue_projection.delta > 5 ? '#ef4444' : '#10b981' }}>{result.fatigue_projection.end_risk}%</strong> risk</span>
                    <span style={{
                      padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700',
                      background: result.fatigue_projection.delta > 5 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                      color: result.fatigue_projection.delta > 5 ? '#ef4444' : '#10b981'
                    }}>{result.fatigue_projection.delta > 0 ? '+' : ''}{result.fatigue_projection.delta}%</span>
                  </div>
                </div>
                <p style={{ margin: 0, color: '#e2e8f0', fontSize: '14px', lineHeight: '1.6' }}>{result.fatigue_projection.message}</p>
              </motion.div>
            )}

            {/* How To Fix It — Priority-Ranked Recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', borderRadius: '22px', padding: '30px', boxShadow: '0 15px 50px rgba(0,0,0,0.35)', marginBottom: '25px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <h3 style={{ margin: '0 0 6px 0', color: 'white', fontSize: '1.3rem', fontWeight: '700' }}>🛠️ How To Fix It</h3>
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 20px 0' }}>Prioritized action plan based on your analysis</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {result.recommendations.map((rec, idx) => {
                    const sevColor = rec.severity === 'HIGH' ? '#ef4444' : rec.severity === 'MEDIUM' ? '#f59e0b' : '#10b981';
                    const sevBg = rec.severity === 'HIGH' ? 'rgba(239,68,68,0.08)' : rec.severity === 'MEDIUM' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)';
                    return (
                      <motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + idx * 0.08 }}
                        style={{ padding: '20px', background: sevBg, borderRadius: '16px', borderLeft: `4px solid ${sevColor}`, border: `1px solid ${sevColor}22`, borderLeftWidth: '4px', borderLeftColor: sevColor, borderLeftStyle: 'solid' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                          <h4 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {rec.priority ? <span style={{ background: sevColor, color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800' }}>#{rec.priority}</span> : null}
                            {rec.icon} {rec.area}
                          </h4>
                          <span style={{ fontSize: '10px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px', background: `${sevColor}22`, color: sevColor }}>{rec.severity}</span>
                        </div>
                        <p style={{ margin: '0 0 8px 0', color: '#cbd5e1', fontSize: '14px', lineHeight: '1.6' }}>{rec.finding}</p>
                        <p style={{ margin: '0 0 12px 0', color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>
                          <strong style={{ color: '#10b981' }}>✅ What to do:</strong> {rec.what_to_do || rec.suggestion || ''}
                        </p>
                        {rec.exercises && rec.exercises.length > 0 && (
                          <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.06)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.12)' }}>
                            <div style={{ color: '#34d399', fontSize: '11px', fontWeight: '700', marginBottom: '6px', letterSpacing: '0.5px' }}>CORRECTIVE EXERCISES</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {rec.exercises.map((ex, exIdx) => (
                                <span key={exIdx} style={{ padding: '5px 12px', background: 'rgba(16,185,129,0.1)', color: '#a7f3d0', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}>{ex}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Frame Viewer and Timeline */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px', marginBottom: '40px' }}>
              {/* Frame Viewer */}
              <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                borderRadius: '25px',
                padding: '30px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                border: '1px solid rgba(6, 182, 212, 0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '1.5rem', fontWeight: '700' }}>
                    🎬 Frame Analysis
                  </h3>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={downloadScreenshot}
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '14px',
                        boxShadow: '0 5px 20px rgba(6, 182, 212, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.boxShadow = '0 8px 30px rgba(6, 182, 212, 0.6)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = '0 5px 20px rgba(6, 182, 212, 0.4)';
                      }}
                    >
                      <FiCamera /> Screenshot
                    </button>

                    <button
                      onClick={shareAnalysis}
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '14px',
                        boxShadow: '0 5px 20px rgba(16, 185, 129, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.boxShadow = '0 8px 30px rgba(16, 185, 129, 0.6)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = '0 5px 20px rgba(16, 185, 129, 0.4)';
                      }}
                    >
                      <FiShare2 /> Share
                    </button>

                    <button
                      onClick={downloadReport}
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '14px',
                        boxShadow: '0 5px 20px rgba(139, 92, 246, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.boxShadow = '0 8px 30px rgba(139, 92, 246, 0.6)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = '0 5px 20px rgba(139, 92, 246, 0.4)';
                      }}
                    >
                      <FiDownload /> Report
                    </button>
                  </div>
                </div>

                {currentFrame && (
                  <>
                    <img
                      src={currentFrame.annotated_frame}
                      alt="Analyzed frame"
                      style={{
                        width: '100%',
                        borderRadius: '15px',
                        marginBottom: '20px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                        border: '2px solid rgba(6, 182, 212, 0.3)'
                      }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <button
                        onClick={() => setCurrentFrameIndex(Math.max(0, currentFrameIndex - 1))}
                        disabled={currentFrameIndex === 0}
                        style={{
                          padding: '12px 25px',
                          background: currentFrameIndex === 0 ? '#475569' : 'linear-gradient(135deg, #1e3a8a 0%, #8b5cf6 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          cursor: currentFrameIndex === 0 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontWeight: '600',
                          boxShadow: currentFrameIndex === 0 ? 'none' : '0 5px 20px rgba(30, 58, 138, 0.4)',
                          transition: 'all 0.3s'
                        }}
                      >
                        <FiChevronLeft /> Previous
                      </button>

                      <span style={{
                        fontWeight: 'bold',
                        color: 'white',
                        fontSize: '16px',
                        padding: '10px 20px',
                        background: 'rgba(6, 182, 212, 0.1)',
                        borderRadius: '10px',
                        border: '1px solid rgba(6, 182, 212, 0.3)'
                      }}>
                        Frame {currentFrameIndex + 1} / {result.frames.length}
                        <span style={{ color: '#94a3b8', marginLeft: '12px', fontSize: '14px' }}>
                          ({currentFrame.timestamp}s)
                        </span>
                      </span>

                      <button
                        onClick={() => setCurrentFrameIndex(Math.min(result.frames.length - 1, currentFrameIndex + 1))}
                        disabled={currentFrameIndex === result.frames.length - 1}
                        style={{
                          padding: '12px 25px',
                          background: currentFrameIndex === result.frames.length - 1 ? '#475569' : 'linear-gradient(135deg, #1e3a8a 0%, #8b5cf6 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          cursor: currentFrameIndex === result.frames.length - 1 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontWeight: '600',
                          boxShadow: currentFrameIndex === result.frames.length - 1 ? 'none' : '0 5px 20px rgba(30, 58, 138, 0.4)',
                          transition: 'all 0.3s'
                        }}
                      >
                        Next <FiChevronRight />
                      </button>
                    </div>

                    {/* Frame Risk Info */}
                    <div style={{
                      padding: '25px',
                      background: `linear-gradient(135deg, ${getRiskColor(currentFrame.risk_level)}15 0%, ${getRiskColor(currentFrame.risk_level)}05 100%)`,
                      borderLeft: `5px solid ${getRiskColor(currentFrame.risk_level)}`,
                      borderRadius: '15px',
                      border: `1px solid ${getRiskColor(currentFrame.risk_level)}30`,
                      boxShadow: `0 10px 30px ${getRiskColor(currentFrame.risk_level)}20`
                    }}>
                      <h3 style={{
                        margin: '0 0 15px 0',
                        color: getRiskColor(currentFrame.risk_level),
                        fontSize: '1.4rem',
                        fontWeight: '800',
                        textShadow: `0 0 20px ${getRiskColor(currentFrame.risk_level)}50`
                      }}>
                        {currentFrame.risk_level} RISK - {currentFrame.risk_score}%
                      </h3>

                      {currentFrame.risk_factors.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: '25px', color: '#cbd5e1' }}>
                          {currentFrame.risk_factors.map((factor, idx) => (
                            <li key={idx} style={{ marginBottom: '10px', fontSize: '15px', lineHeight: '1.6' }}>
                              <strong style={{ color: 'white' }}>{factor.factor}:</strong> {factor.detail}
                              {factor.confidence && (
                                <span style={{
                                  fontSize: '13px',
                                  color: '#64748b',
                                  marginLeft: '10px',
                                  padding: '2px 8px',
                                  background: 'rgba(100, 116, 139, 0.2)',
                                  borderRadius: '6px'
                                }}>
                                  {(factor.confidence * 100).toFixed(0)}% confidence
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ margin: 0, color: '#10b981', fontSize: '15px', fontWeight: '600' }}>
                          ✅ No significant risk factors detected
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Biomechanics Details */}
              <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                borderRadius: '25px',
                padding: '30px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                border: '1px solid rgba(6, 182, 212, 0.2)'
              }}>
                <h3 style={{ margin: '0 0 25px 0', color: 'white', fontSize: '1.5rem', fontWeight: '700' }}>
                  📊 Biomechanics
                </h3>

                {currentFrame && (
                  <div>
                    <div style={{
                      marginBottom: '25px',
                      padding: '20px',
                      background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
                      borderRadius: '15px',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      boxShadow: '0 5px 20px rgba(139, 92, 246, 0.2)'
                    }}>
                      <h4 style={{ margin: '0 0 15px 0', color: '#8b5cf6', fontSize: '1.1rem', fontWeight: '700' }}>
                        🦵 Knee Valgus
                      </h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: '#cbd5e1' }}>Left:</span>
                        <strong style={{ color: 'white', fontSize: '16px' }}>{currentFrame.biomechanics.knee_valgus.left_angle || 'N/A'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ color: '#cbd5e1' }}>Right:</span>
                        <strong style={{ color: 'white', fontSize: '16px' }}>{currentFrame.biomechanics.knee_valgus.right_angle || 'N/A'}</strong>
                      </div>
                      <div style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid rgba(139, 92, 246, 0.2)',
                        fontSize: '13px',
                        color: '#94a3b8'
                      }}>
                        Normal: 170-180° | Risk: {'<'}160°
                      </div>
                      {currentFrame.biomechanics.knee_valgus.confidence && (
                        <div style={{
                          marginTop: '8px',
                          fontSize: '13px',
                          color: '#8b5cf6',
                          fontWeight: '600'
                        }}>
                          ✓ Confidence: {(currentFrame.biomechanics.knee_valgus.confidence * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>

                    <div style={{
                      marginBottom: '25px',
                      padding: '20px',
                      background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(251, 146, 60, 0.1) 100%)',
                      borderRadius: '15px',
                      border: '1px solid rgba(249, 115, 22, 0.3)',
                      boxShadow: '0 5px 20px rgba(249, 115, 22, 0.2)'
                    }}>
                      <h4 style={{ margin: '0 0 15px 0', color: '#f97316', fontSize: '1.1rem', fontWeight: '700' }}>
                        ⚖️ Stride Asymmetry
                      </h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ color: '#cbd5e1' }}>Difference:</span>
                        <strong style={{ color: 'white', fontSize: '18px' }}>{currentFrame.biomechanics.stride_asymmetry.asymmetry_percent}%</strong>
                      </div>
                      <div style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid rgba(249, 115, 22, 0.2)',
                        fontSize: '13px',
                        color: '#94a3b8'
                      }}>
                        Normal: {'<'}5% | Risk: {'>'}10%
                      </div>
                      {currentFrame.biomechanics.stride_asymmetry.confidence && (
                        <div style={{
                          marginTop: '8px',
                          fontSize: '13px',
                          color: '#f97316',
                          fontWeight: '600'
                        }}>
                          ✓ Confidence: {(currentFrame.biomechanics.stride_asymmetry.confidence * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>

                    <div style={{
                      padding: '20px',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)',
                      borderRadius: '15px',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      boxShadow: '0 5px 20px rgba(16, 185, 129, 0.2)'
                    }}>
                      <h4 style={{ margin: '0 0 15px 0', color: '#10b981', fontSize: '1.1rem', fontWeight: '700' }}>
                        🎯 Posture Score
                      </h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ color: '#cbd5e1' }}>Score:</span>
                        <strong style={{ color: 'white', fontSize: '18px' }}>{currentFrame.biomechanics.posture.posture_score}/1.0</strong>
                      </div>
                      <div style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid rgba(16, 185, 129, 0.2)',
                        fontSize: '13px',
                        color: '#94a3b8',
                        lineHeight: '1.6'
                      }}>
                        {currentFrame.biomechanics.posture.message}
                      </div>
                      {currentFrame.biomechanics.posture.confidence && (
                        <div style={{
                          marginTop: '8px',
                          fontSize: '13px',
                          color: '#10b981',
                          fontWeight: '600'
                        }}>
                          ✓ Confidence: {(currentFrame.biomechanics.posture.confidence * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Risk Timeline Chart */}
            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              borderRadius: '25px',
              padding: '35px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              marginBottom: '40px',
              border: '1px solid rgba(6, 182, 212, 0.2)'
            }}>
              <h3 style={{ margin: '0 0 30px 0', color: 'white', fontSize: '1.5rem', fontWeight: '700' }}>
                📈 Risk Timeline
              </h3>
              {(() => {
                // Custom dot that colors each point by its risk level
                const RiskDot = (props) => {
                  const { cx, cy, payload } = props;
                  if (!cx || !cy) return null;
                  const r = payload.risk_score;
                  const fill = r >= 70 ? '#ef4444' : r >= 40 ? '#f97316' : '#10b981';
                  return <circle cx={cx} cy={cy} r={4} fill={fill} stroke={fill} strokeWidth={1} fillOpacity={0.9} />;
                };
                return (
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={result.timeline}
                      onMouseMove={(e) => {
                        if (e.activePayload && e.activePayload.length > 0 && result?.frames?.length > 0) {
                          const hoveredTime = e.activePayload[0].payload.timestamp;
                          const closestIndex = result.frames.reduce((bestIdx, frame, idx) => {
                            const bestDiff = Math.abs(result.frames[bestIdx].timestamp - hoveredTime);
                            const currDiff = Math.abs(frame.timestamp - hoveredTime);
                            return currDiff < bestDiff ? idx : bestIdx;
                          }, 0);
                          setCurrentFrameIndex(closestIndex);
                        }
                      }}
                    >
                      <defs>
                        {/* Y-axis mapped gradient: top=red, mid=orange, bottom=green */}
                        <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.7} />
                          <stop offset="30%" stopColor="#ef4444" stopOpacity={0.5} />
                          <stop offset="30%" stopColor="#f97316" stopOpacity={0.4} />
                          <stop offset="60%" stopColor="#f97316" stopOpacity={0.25} />
                          <stop offset="60%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="riskStroke" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="30%" stopColor="#ef4444" />
                          <stop offset="30%" stopColor="#f97316" />
                          <stop offset="60%" stopColor="#f97316" />
                          <stop offset="60%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis dataKey="timestamp" label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }} stroke="#94a3b8" />
                      <YAxis label={{ value: 'Risk Score (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} domain={[0, 100]} stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '12px', color: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                        labelFormatter={(value) => `Time: ${value}s`}
                        formatter={(value) => {
                          const label = value >= 70 ? '🔴 High' : value >= 40 ? '🟠 Medium' : '🟢 Low';
                          return [`${value}% (${label})`, 'Risk'];
                        }}
                      />
                      <Area type="monotone" dataKey="risk_score" stroke="url(#riskStroke)" strokeWidth={2.5} fillOpacity={1} fill="url(#riskFill)" dot={<RiskDot />} activeDot={{ r: 6, stroke: '#06b6d4', strokeWidth: 2, fill: '#0f172a' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                );
              })()}

              <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginTop: '25px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    borderRadius: '6px',
                    boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)'
                  }}></div>
                  <span style={{ color: '#cbd5e1', fontWeight: '600' }}>High Risk (≥70%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    borderRadius: '6px',
                    boxShadow: '0 0 15px rgba(249, 115, 22, 0.5)'
                  }}></div>
                  <span style={{ color: '#cbd5e1', fontWeight: '600' }}>Medium Risk (40-69%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: '6px',
                    boxShadow: '0 0 15px rgba(16, 185, 129, 0.5)'
                  }}></div>
                  <span style={{ color: '#cbd5e1', fontWeight: '600' }}>Low Risk ({'<'}40%)</span>
                </div>
              </div>
              <p style={{ textAlign: 'center', color: '#475569', fontSize: '13px', marginTop: '15px', marginBottom: 0 }}>
                🖱️ Hover over the chart to scrub through frames above
              </p>
            </div>

            {/* Risk Distribution */}
            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              borderRadius: '25px',
              padding: '35px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              border: '1px solid rgba(6, 182, 212, 0.2)'
            }}>
              <h3 style={{ margin: '0 0 30px 0', color: 'white', fontSize: '1.5rem', fontWeight: '700' }}>
                📊 Risk Distribution
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px' }}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  style={{
                    textAlign: 'center',
                    padding: '30px',
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%)',
                    borderRadius: '20px',
                    border: '2px solid rgba(239, 68, 68, 0.3)',
                    boxShadow: '0 10px 30px rgba(239, 68, 68, 0.2)',
                    transition: 'all 0.3s'
                  }}
                >
                  <h2 style={{
                    margin: '0',
                    color: '#ef4444',
                    fontSize: '4rem',
                    fontWeight: '900',
                    textShadow: '0 0 30px rgba(239, 68, 68, 0.6)'
                  }}>
                    {result.analysis_summary.high_risk_count}
                  </h2>
                  <p style={{ margin: '12px 0 0 0', color: '#cbd5e1', fontSize: '15px', fontWeight: '600' }}>
                    High Risk Frames
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  style={{
                    textAlign: 'center',
                    padding: '30px',
                    background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(234, 88, 12, 0.1) 100%)',
                    borderRadius: '20px',
                    border: '2px solid rgba(249, 115, 22, 0.3)',
                    boxShadow: '0 10px 30px rgba(249, 115, 22, 0.2)',
                    transition: 'all 0.3s'
                  }}
                >
                  <h2 style={{
                    margin: '0',
                    color: '#f97316',
                    fontSize: '4rem',
                    fontWeight: '900',
                    textShadow: '0 0 30px rgba(249, 115, 22, 0.6)'
                  }}>
                    {result.analysis_summary.medium_risk_count}
                  </h2>
                  <p style={{ margin: '12px 0 0 0', color: '#cbd5e1', fontSize: '15px', fontWeight: '600' }}>
                    Medium Risk Frames
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  style={{
                    textAlign: 'center',
                    padding: '30px',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)',
                    borderRadius: '20px',
                    border: '2px solid rgba(16, 185, 129, 0.3)',
                    boxShadow: '0 10px 30px rgba(16, 185, 129, 0.2)',
                    transition: 'all 0.3s'
                  }}
                >
                  <h2 style={{
                    margin: '0',
                    color: '#10b981',
                    fontSize: '4rem',
                    fontWeight: '900',
                    textShadow: '0 0 30px rgba(16, 185, 129, 0.6)'
                  }}>
                    {result.analysis_summary.low_risk_count}
                  </h2>
                  <p style={{ margin: '12px 0 0 0', color: '#cbd5e1', fontSize: '15px', fontWeight: '600' }}>
                    Low Risk Frames
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default EnhancedVideoUpload;