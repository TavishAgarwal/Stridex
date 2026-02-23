import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FiCamera, FiStopCircle, FiVolume2, FiVolumeX, FiPlay } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import demoFrames from '../data/demoSession.json';
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

function EnhancedLiveCamera() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [athletes, setAthletes] = useState([]);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [adaptiveMode, setAdaptiveMode] = useState(false);
  const [sportMode, setSportMode] = useState('default');
  const [backendOffline, setBackendOffline] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const demoIndexRef = useRef(0);

  // Performance & Chart States
  const [chartData, setChartData] = useState([]);
  const [repCount, setRepCount] = useState(0);
  const [performanceScore, setPerformanceScore] = useState(100);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionStats, setSessionStats] = useState({ avgRisk: 0, maxFatigue: 0, suggestions: [] });

  const inRepRef = useRef(false);
  const statsRef = useRef({ p1: { risks: [], fatigues: [] }, p2: { risks: [], fatigues: [] } });
  const lastAlertRef = useRef({ p1: '', p2: '' });
  const fpsRef = useRef({ lastTime: performance.now(), frameCount: 0 });
  const [fps, setFps] = useState(0);

  // Voice Alert System
  const speakAlert = useCallback((text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1;
      utterance.volume = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const drawOverlay = useCallback((athletesArray) => {
    const video = webcamRef.current?.video;
    const canvas = canvasRef.current;
    if (!video || !canvas || !athletesArray) return;

    // Match canvas internal resolution to video resolution for accurate landmark scaling
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const POSE_CONNECTIONS = [
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Arms
      [11, 23], [12, 24], [23, 24], // Torso
      [23, 25], [24, 26], [25, 27], [26, 28], // Legs
      [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32], // Feet
      [15, 17], [16, 18], [15, 19], [16, 20], [15, 21], [16, 22] // Hands
    ];

    const getDynamicColor = (baseRisk, deviation) => {
      if (baseRisk === 'HIGH' || deviation < -15) return '#ef4444'; // Red
      if (baseRisk === 'MEDIUM' || deviation < -5) return '#f59e0b'; // Yellow
      return '#10b981'; // Green
    };

    athletesArray.forEach((ath) => {
      const landmarks = ath.landmarks;
      const deviations = ath.temporal_analysis?.baseline_comparison || {};
      const riskLevel = ath.risk_assessment?.risk_level || 'LOW';

      // Draw connecting lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];
        if (start && end && start.visibility > 0.5 && end.visibility > 0.5) {
          ctx.beginPath();
          ctx.moveTo(start.x * width, start.y * height);
          ctx.lineTo(end.x * width, end.y * height);
          ctx.stroke();
        }
      });

      // Draw active joints with heat aura on high-risk joints
      landmarks.forEach((lm, idx) => {
        if (lm.visibility > 0.5) {
          let color = '#0ea5e9'; // Default Blue
          let radius = 4;
          let isHighRisk = false;

          if (idx === 25 || idx === 26) {
            color = getDynamicColor(riskLevel, deviations.knee_deviation || 0);
            radius = 6;
            isHighRisk = riskLevel === 'HIGH' || (deviations.knee_deviation || 0) < -15;
          } else if (idx === 11 || idx === 12 || idx === 23 || idx === 24) {
            color = getDynamicColor(riskLevel, deviations.posture_deviation || 0);
            radius = 6;
            isHighRisk = riskLevel === 'HIGH' || (deviations.posture_deviation || 0) < -15;
          } else if (idx === 27 || idx === 28 || idx === 29 || idx === 30 || idx === 31 || idx === 32) {
            color = getDynamicColor(riskLevel, deviations.stride_deviation || 0);
            radius = 5;
            isHighRisk = riskLevel === 'HIGH' || (deviations.stride_deviation || 0) < -15;
          }

          // Heat aura glow on high-risk or medium-risk joints
          if (isHighRisk || color === '#f59e0b') {
            const auraRadius = isHighRisk ? 30 : 20;
            const auraColor = isHighRisk ? 'rgba(239, 68, 68,' : 'rgba(245, 158, 11,';
            const gradient = ctx.createRadialGradient(
              lm.x * width, lm.y * height, radius,
              lm.x * width, lm.y * height, auraRadius
            );
            gradient.addColorStop(0, auraColor + ' 0.5)');
            gradient.addColorStop(0.5, auraColor + ' 0.2)');
            gradient.addColorStop(1, auraColor + ' 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(lm.x * width, lm.y * height, auraRadius, 0, 2 * Math.PI);
            ctx.fill();
          }

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(lm.x * width, lm.y * height, radius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    });
  }, []);

  const captureAndAnalyze = useCallback(async () => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    try {
      const blob = await fetch(imageSrc).then(r => r.blob());
      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');
      formData.append('adaptive_mode', adaptiveMode.toString());
      formData.append('sport', sportMode);

      const response = await axios.post(
        `${BACKEND_URL}/analyze-frame`,
        formData
      );

      if (backendOffline) setBackendOffline(false);

      // FPS counter
      fpsRef.current.frameCount++;
      const now = performance.now();
      const elapsed = now - fpsRef.current.lastTime;
      if (elapsed >= 1000) {
        setFps(Math.round((fpsRef.current.frameCount / elapsed) * 1000));
        fpsRef.current.frameCount = 0;
        fpsRef.current.lastTime = now;
      }

      if (response.data.pose_detected && response.data.athletes) {
        setAthletes(response.data.athletes);

        drawOverlay(response.data.athletes);

        // Chart Data Update
        setChartData(prev => {
          const point = { time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
          response.data.athletes.forEach((ath, i) => {
            point[`p${i + 1}_risk`] = ath.risk_assessment.risk_score;
            point[`p${i + 1}_fatigue`] = ath.temporal_analysis.fatigue_score;
          });
          const newData = [...prev, point];
          if (newData.length > 60) newData.shift();
          return newData;
        });

        // Performance & Stats
        response.data.athletes.forEach((ath, i) => {
          const p = `p${i + 1}`;
          if (!statsRef.current[p]) statsRef.current[p] = { risks: [], fatigues: [] };
          statsRef.current[p].risks.push(ath.risk_assessment.risk_score);
          statsRef.current[p].fatigues.push(ath.temporal_analysis.fatigue_score);
          // Cap arrays at 2000 to prevent memory growth on long sessions
          if (statsRef.current[p].risks.length > 2000) statsRef.current[p].risks.shift();
          if (statsRef.current[p].fatigues.length > 2000) statsRef.current[p].fatigues.shift();

          // Squat Rep Counter (Track primary athlete if multiple)
          if (i === 0) {
            const leftKnee = parseFloat(ath.risk_assessment.biomechanics.knee_valgus.left_angle);
            const rightKnee = parseFloat(ath.risk_assessment.biomechanics.knee_valgus.right_angle);
            if (!isNaN(leftKnee) && !isNaN(rightKnee)) {
              const avgKnee = (leftKnee + rightKnee) / 2;
              if (!inRepRef.current && avgKnee < 110) inRepRef.current = true;
              else if (inRepRef.current && avgKnee > 155) {
                setRepCount(rc => rc + 1);
                inRepRef.current = false;
              }
            }
          }
        });

        // Performance Consistency Score (Athlete 1)
        const recentRisks = statsRef.current.p1.risks.slice(-20);
        if (recentRisks.length > 5) {
          const meanRisk = recentRisks.reduce((a, b) => a + b, 0) / recentRisks.length;
          const variance = recentRisks.reduce((a, b) => a + Math.pow(b - meanRisk, 2), 0) / recentRisks.length;
          setPerformanceScore(Math.max(0, 100 - Math.round(variance)));
        }

        // Voice Alert Logic
        if (voiceEnabled) {
          response.data.athletes.forEach((ath, i) => {
            const p = `p${i + 1}`;
            if (!lastAlertRef.current[p]) lastAlertRef.current[p] = '';
            const prefix = response.data.athletes.length > 1 ? `Athlete ${i + 1}: ` : '';

            if (ath.risk_assessment.risk_level === 'HIGH' && lastAlertRef.current[p] !== 'HIGH') {
              speakAlert(`${prefix}Warning! High injury risk detected.`);
              lastAlertRef.current[p] = 'HIGH';
            } else if (ath.risk_assessment.risk_level === 'MEDIUM' && lastAlertRef.current[p] !== 'MEDIUM' && lastAlertRef.current[p] !== 'HIGH') {
              speakAlert(`${prefix}Caution. Medium risk level detected.`);
              lastAlertRef.current[p] = 'MEDIUM';
            } else if (ath.risk_assessment.risk_level === 'LOW' && lastAlertRef.current[p] !== 'LOW' && lastAlertRef.current[p] !== '') {
              lastAlertRef.current[p] = 'LOW';
            }
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error')) {
        setBackendOffline(true);
      }
    }
  }, [webcamRef, voiceEnabled, adaptiveMode, sportMode, speakAlert, backendOffline]);

  useEffect(() => {
    let active = true;

    const loop = async () => {
      if (!active || !analyzing) return;
      await captureAndAnalyze();
      if (active && analyzing) {
        requestAnimationFrame(loop); // Maximize FPS based on request completion time
      }
    };

    if (analyzing) {
      loop();
    }

    return () => {
      active = false;
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [analyzing, captureAndAnalyze]);

  // Demo mode playback loop
  useEffect(() => {
    if (!demoMode) return;
    demoIndexRef.current = 0;
    setChartData([]);
    setAthletes([]);

    const interval = setInterval(() => {
      const idx = demoIndexRef.current;
      if (idx >= demoFrames.length) {
        clearInterval(interval);
        setDemoMode(false);
        return;
      }
      const frame = demoFrames[idx];
      setAthletes([frame]);
      setChartData(prev => {
        const point = {
          time: `${idx * 3}s`,
          p1_risk: frame.risk_assessment.risk_score,
          p1_fatigue: frame.temporal_analysis.fatigue_score
        };
        return [...prev, point];
      });
      demoIndexRef.current = idx + 1;
    }, 2000); // 2 seconds per frame for dramatic effect

    return () => clearInterval(interval);
  }, [demoMode]);

  const getRiskColor = (level) => {
    const colors = {
      'HIGH': '#ef4444',
      'MEDIUM': '#f97316',
      'LOW': '#10b981'
    };
    return colors[level] || '#64748b';
  };

  const handleStop = async () => {
    setAnalyzing(false);

    // Generate Session Summary
    const risks = statsRef.current.p1.risks;
    const fatigues = statsRef.current.p1.fatigues;
    if (risks.length > 0) {
      const avg = Math.round(risks.reduce((a, b) => a + b, 0) / risks.length);
      const mFatigue = Math.max(...fatigues);
      const suggestions = [];
      if (mFatigue > 50) suggestions.push('High fatigue detected. Increase rest periods between sets.');
      if (avg > 40) suggestions.push('Average risk is elevated. Focus on controlled form over speed.');
      if (repCount > 0) suggestions.push(`Completed ${repCount} reps! Consistent depth maintained.`);
      if (performanceScore < 70) suggestions.push('Consistency dropped during the session. Watch your stabilization.');

      let prevSession = null;
      try {
        const histRes = await fetch(`${BACKEND_URL}/get-history`);
        const histData = await histRes.json();
        // Ignore same session clicks, get the real previous completed session
        if (histData && Array.isArray(histData) && histData.length > 0) {
          prevSession = histData[histData.length - 1];
        }
      } catch (e) { console.error("Could not fetch history", e); }

      try {
        await fetch(`${BACKEND_URL}/save-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            avg_risk: avg,
            max_fatigue: mFatigue,
            performance_score: performanceScore,
            rep_count: repCount,
            session_id: "default",
            sport_mode: sportMode,
            timestamp: Date.now() / 1000
          })
        });
      } catch (e) { console.error("Could not save session", e); }

      setSessionStats({
        avgRisk: avg,
        maxFatigue: mFatigue,
        prevAvgRisk: prevSession ? prevSession.avg_risk : null,
        prevMaxFatigue: prevSession ? prevSession.max_fatigue : null,
        suggestions: suggestions.length ? suggestions : ['Form looked incredibly solid today! Keep it up.']
      });
      setShowSummary(true);
    }

    lastAlertRef.current = { p1: '', p2: '' };
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const handleStart = () => {
    setAnalyzing(true);
    setChartData([]);
    setRepCount(0);
    setPerformanceScore(100);
    setShowSummary(false);
    inRepRef.current = false;
    statsRef.current = { p1: { risks: [], fatigues: [] }, p2: { risks: [], fatigues: [] } };
    setAthletes([]);
  };

  const handleDownloadReport = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/generate-report/default`);
      if (!response.ok) throw new Error("Report generation failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stridex_session_report_${new Date().getTime()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error(err);
      alert("Could not generate report. Ensure the session ran long enough.");
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1600px', margin: '0 auto', position: 'relative' }}>
      {/* Backend Offline Banner */}
      {backendOffline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            color: 'white',
            padding: '14px 20px',
            borderRadius: '12px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)',
            border: '2px solid #fecaca'
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
            ⚠️ Backend Offline — Cannot reach {BACKEND_URL}. Start the backend server.
          </div>
          <button
            onClick={() => setBackendOffline(false)}
            style={{ background: 'rgba(0,0,0,0.3)', border: 'none', color: 'white', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Dismiss
          </button>
        </motion.div>
      )}
      {/* Session Summary Modal */}
      {showSummary && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              padding: '40px',
              borderRadius: '20px',
              border: '1px solid rgba(14, 165, 233, 0.4)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              width: '500px',
              maxWidth: '90%'
            }}
          >
            <h2 style={{ color: 'white', marginTop: 0, borderBottom: '1px solid #334155', paddingBottom: '15px' }}>
              🏁 Session Complete
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '10px', textAlign: 'center', position: 'relative' }}>
                <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>Average Risk Score</div>
                <div style={{ color: sessionStats.avgRisk > 40 ? '#ef4444' : '#10b981', fontSize: '32px', fontWeight: 'bold' }}>{sessionStats.avgRisk}%</div>
                {sessionStats.prevAvgRisk !== null && (
                  <div style={{
                    marginTop: '8px', fontSize: '12px', fontWeight: 'bold',
                    color: sessionStats.avgRisk < sessionStats.prevAvgRisk ? '#10b981' : (sessionStats.avgRisk > sessionStats.prevAvgRisk ? '#ef4444' : '#94a3b8')
                  }}>
                    {sessionStats.avgRisk < sessionStats.prevAvgRisk ? `↓ ${sessionStats.prevAvgRisk - sessionStats.avgRisk}% Better` : (sessionStats.avgRisk > sessionStats.prevAvgRisk ? `↑ ${sessionStats.avgRisk - sessionStats.prevAvgRisk}% Worse` : 'Same as last time')}
                  </div>
                )}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '10px', textAlign: 'center', position: 'relative' }}>
                <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>Max Fatigue Spike</div>
                <div style={{ color: sessionStats.maxFatigue > 50 ? '#f59e0b' : '#3b82f6', fontSize: '32px', fontWeight: 'bold' }}>{sessionStats.maxFatigue}</div>
                {sessionStats.prevMaxFatigue !== null && (
                  <div style={{
                    marginTop: '8px', fontSize: '12px', fontWeight: 'bold',
                    color: sessionStats.maxFatigue < sessionStats.prevMaxFatigue ? '#10b981' : (sessionStats.maxFatigue > sessionStats.prevMaxFatigue ? '#f59e0b' : '#94a3b8')
                  }}>
                    {sessionStats.maxFatigue < sessionStats.prevMaxFatigue ? `↓ ${sessionStats.prevMaxFatigue - sessionStats.maxFatigue} Less` : (sessionStats.maxFatigue > sessionStats.prevMaxFatigue ? `↑ ${sessionStats.maxFatigue - sessionStats.prevMaxFatigue} More` : 'Same as last time')}
                  </div>
                )}
              </div>
            </div>

            <h4 style={{ color: '#e2e8f0', marginTop: '30px', marginBottom: '15px', fontSize: '1.1rem' }}>💡 AI Coaching Report:</h4>
            <ul style={{ color: '#cbd5e1', paddingLeft: '20px', lineHeight: '1.8', margin: 0 }}>
              {sessionStats.suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>

            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
              <button
                onClick={handleDownloadReport}
                style={{
                  flex: 1,
                  padding: '15px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '16px',
                  transition: 'all 0.2s',
                  boxShadow: '0 10px 20px rgba(245, 158, 11, 0.3)'
                }}
              >
                📄 Download PDF
              </button>

              <button
                onClick={() => { setShowSummary(false); }}
                style={{
                  flex: 1,
                  padding: '15px',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '16px',
                  transition: 'all 0.2s',
                  boxShadow: '0 10px 20px rgba(14, 165, 233, 0.3)'
                }}
              >
                Close & Reset
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #8b5cf6 50%, #06b6d4 100%)',
          padding: '40px',
          borderRadius: '25px',
          marginBottom: '40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          color: 'white'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '2.2rem', fontWeight: '800' }}>
              <FiCamera style={{ marginRight: '15px', verticalAlign: 'middle' }} />
              Live Camera Analysis
            </h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '16px' }}>
              ⚡ Real-time biomechanical risk detection with voice alerts
            </p>
          </div>

          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStart}
              disabled={analyzing}
              style={{
                padding: '18px 35px',
                background: analyzing ? '#475569' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '15px',
                cursor: analyzing ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '17px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: !analyzing ? '0 10px 30px rgba(16, 185, 129, 0.4)' : 'none',
                transition: 'all 0.3s'
              }}
            >
              <FiCamera /> Start Analysis
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStop}
              disabled={!analyzing}
              style={{
                padding: '18px 35px',
                background: !analyzing ? '#475569' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '15px',
                cursor: !analyzing ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '17px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: analyzing ? '0 10px 30px rgba(239, 68, 68, 0.4)' : 'none',
                transition: 'all 0.3s'
              }}
            >
              <FiStopCircle /> Stop
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              style={{
                padding: '18px 35px',
                background: voiceEnabled
                  ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                  : 'linear-gradient(135deg, #475569 0%, #334155 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '15px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '17px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: voiceEnabled ? '0 10px 30px rgba(139, 92, 246, 0.4)' : 'none',
                transition: 'all 0.3s'
              }}
            >
              {voiceEnabled ? <><FiVolume2 /> Voice ON</> : <><FiVolumeX /> Voice OFF</>}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAdaptiveMode(!adaptiveMode)}
              style={{
                padding: '18px 35px',
                background: adaptiveMode
                  ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
                  : 'linear-gradient(135deg, #475569 0%, #334155 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '15px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '17px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: adaptiveMode ? '0 10px 30px rgba(14, 165, 233, 0.4)' : 'none',
                transition: 'all 0.3s'
              }}
            >
              {adaptiveMode ? '🎯 Adaptive: ON' : '🎯 Adaptive: OFF'}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setDemoMode(true); setAnalyzing(false); }}
              disabled={demoMode}
              style={{
                padding: '18px 35px',
                background: demoMode
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '15px',
                cursor: demoMode ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '17px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 10px 30px rgba(244, 63, 94, 0.4)',
                transition: 'all 0.3s'
              }}
            >
              <FiPlay /> {demoMode ? '🎬 Playing Demo...' : '🎬 Demo Mode'}
            </motion.button>

            {/* Sport Mode Selector */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <select
                value={sportMode}
                onChange={(e) => setSportMode(e.target.value)}
                style={{
                  padding: '18px 25px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '15px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '17px',
                  outline: 'none',
                  boxShadow: '0 10px 30px rgba(245, 158, 11, 0.4)',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  paddingRight: '45px'
                }}
              >
                <option value="default" style={{ color: 'black' }}>🏋️ Default (General)</option>
                <option value="basketball" style={{ color: 'black' }}>🏀 Basketball</option>
                <option value="sprinting" style={{ color: 'black' }}>🏃 Sprinting</option>
                <option value="squats" style={{ color: 'black' }}>🦵 Squats</option>
                <option value="cricket" style={{ color: 'black' }}>🏏 Cricket</option>
                <option value="soccer" style={{ color: 'black' }}>⚽ Soccer</option>
                <option value="tennis" style={{ color: 'black' }}>🎾 Tennis</option>
                <option value="weightlifting" style={{ color: 'black' }}>🏋️‍♂️ Weightlifting</option>
                <option value="volleyball" style={{ color: 'black' }}>🏐 Volleyball</option>
              </select>
              <div style={{ position: 'absolute', right: '20px', pointerEvents: 'none', fontSize: '12px' }}>▼</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px' }}>
        {/* Camera Feed */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: '25px',
            padding: '25px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            border: '1px solid rgba(6, 182, 212, 0.2)'
          }}
        >
          <h3 style={{ margin: '0 0 20px 0', color: 'white', fontSize: '1.5rem', fontWeight: '700' }}>
            📹 Live Feed
            {analyzing && (
              <span style={{
                marginLeft: '15px',
                padding: '6px 16px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                borderRadius: '25px',
                fontSize: '14px',
                fontWeight: '600',
                animation: 'pulse 2s infinite',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.6)'
              }}>
                ● LIVE
              </span>
            )}
            {voiceEnabled && analyzing && (
              <span style={{
                marginLeft: '10px',
                padding: '6px 16px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: 'white',
                borderRadius: '25px',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.6)'
              }}>
                🔊 AUDIO
              </span>
            )}
            {adaptiveMode && analyzing && (
              <span style={{
                marginLeft: '10px',
                padding: '6px 16px',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                color: 'white',
                borderRadius: '25px',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 0 20px rgba(14, 165, 233, 0.6)'
              }}>
                🎯 ADAPTIVE
              </span>
            )}
            {analyzing && fps > 0 && (
              <span style={{
                marginLeft: '10px',
                padding: '6px 16px',
                background: fps >= 15 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                borderRadius: '25px',
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: 'monospace',
                boxShadow: `0 0 20px ${fps >= 15 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(245, 158, 11, 0.6)'}`
              }}>
                {fps} FPS
              </span>
            )}
          </h3>

          {/* Predictive Injury Warning Banners */}
          {athletes.map((ath, i) => {
            const projection = ath.temporal_analysis?.projection;
            if (projection?.is_critical && projection?.time_to_critical <= 180) {
              return (
                <motion.div
                  key={`warning-${ath.athlete_id || i}`}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)',
                    border: '2px solid #fecaca',
                    animation: 'pulse 1.5s infinite'
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                    ⚠️ ATHLETE {i + 1} WARNING: INJURY IMMINENT
                  </div>
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: '5px 15px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    fontFamily: 'monospace'
                  }}>
                    T-MINUS {Math.floor(projection.time_to_critical / 60)}m {projection.time_to_critical % 60}s
                  </div>
                </motion.div>
              );
            }
            return null;
          })}

          <div style={{ position: 'relative' }}>
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              style={{
                width: '100%',
                borderRadius: '20px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                border: '2px solid rgba(6, 182, 212, 0.3)',
                display: 'block'
              }}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                borderRadius: '20px',
                pointerEvents: 'none',
                zIndex: 10
              }}
            />
          </div>
        </motion.div>

        {/* Risk Assessment */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: '25px',
            padding: '25px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            border: '1px solid rgba(6, 182, 212, 0.2)'
          }}
        >
          <h3 style={{ margin: '0 0 25px 0', color: 'white', fontSize: '1.5rem', fontWeight: '700' }}>
            ⚠️ Multi-Athlete Telemetry
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {athletes.map((ath, i) => {
              const result = ath.risk_assessment;
              const temporalData = ath.temporal_analysis;
              return (
                <div key={ath.athlete_id} style={{ borderBottom: i !== athletes.length - 1 ? '1px solid #334155' : 'none', paddingBottom: i !== athletes.length - 1 ? '30px' : '0' }}>
                  <h4 style={{ color: '#cbd5e1', marginBottom: '15px' }}>ATHLETE {i + 1}</h4>

                  {/* Risk Gauge */}
                  <div style={{
                    padding: '35px 25px',
                    background: `linear-gradient(135deg, ${result.color}15 0%, ${result.color}05 100%)`,
                    borderRadius: '20px',
                    marginBottom: '25px',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    border: `2px solid ${result.color}30`,
                    boxShadow: `0 10px 30px ${result.color}20`
                  }}>
                    <svg width="220" height="220" style={{ margin: '0 auto 25px' }}>
                      {/* Background Circle */}
                      <circle cx="110" cy="110" r="90" fill="none" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="18" />
                      {/* Progress Circle */}
                      <circle
                        cx="110"
                        cy="110"
                        r="90"
                        fill="none"
                        stroke={result.color}
                        strokeWidth="18"
                        strokeDasharray={`${(result.risk_score / 100) * 565.5} 565.5`}
                        strokeDashoffset="0"
                        transform="rotate(-90 110 110)"
                        strokeLinecap="round"
                        style={{
                          transition: 'stroke-dasharray 0.5s ease',
                          filter: `drop-shadow(0 0 15px ${result.color}80)`
                        }}
                      />
                      {/* Center Text */}
                      <text x="110" y="110" textAnchor="middle" dy="12" style={{ fontSize: '3rem', fontWeight: '900', fill: result.color, filter: `drop-shadow(0 0 10px ${result.color}80)` }}>
                        {result.risk_score}%
                      </text>
                    </svg>

                    <h3 style={{ margin: '0 0 12px 0', color: result.color, fontSize: '1.8rem', fontWeight: '900', textShadow: `0 0 20px ${result.color}50` }}>
                      {result.risk_level}
                    </h3>
                    <p style={{ margin: 0, fontSize: '15px', color: '#cbd5e1', fontWeight: '600', lineHeight: '1.6' }}>
                      {result.action}
                    </p>
                  </div>

                  {/* Temporal Analysis Engine */}
                  {temporalData && (
                    <div style={{
                      padding: '25px',
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
                      borderRadius: '20px',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      boxShadow: '0 5px 20px rgba(245, 158, 11, 0.15)'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '5px' }}>Fatigue Score</div>
                          <div style={{ fontSize: '24px', fontWeight: '800', color: temporalData.fatigue_score > 50 ? '#ef4444' : (temporalData.fatigue_score > 20 ? '#f59e0b' : '#10b981') }}>
                            {temporalData.fatigue_score} / 100
                          </div>
                          <div style={{ color: '#cbd5e1', fontSize: '12px', marginTop: '4px' }}>
                            Trend: <span style={{ color: temporalData.trend_direction === 'degrading' ? '#ef4444' : (temporalData.trend_direction === 'improving' ? '#10b981' : '#64748b'), fontWeight: 'bold' }}>{temporalData.trend_direction.toUpperCase()}</span>
                          </div>
                        </div>

                        <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '5px' }}>ML Prediction</div>
                          <div style={{ fontSize: '24px', fontWeight: '800', color: temporalData.injury_probability > 0.60 ? '#ef4444' : '#10b981' }}>
                            {(temporalData.injury_probability * 100).toFixed(1)}%
                          </div>
                          <div style={{ color: '#cbd5e1', fontSize: '12px', marginTop: '4px' }}>
                            Risk: <span style={{ color: temporalData.ml_risk_level === 'HIGH' ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{temporalData.ml_risk_level}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Explainability Panel: Risk Factors Breakdown */}
                  {result.risk_factors && result.risk_factors.length > 0 && (
                    <div style={{
                      marginTop: '20px',
                      padding: '20px',
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
                      borderRadius: '15px',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      boxShadow: '0 5px 15px rgba(139, 92, 246, 0.15)'
                    }}>
                      <div style={{ color: '#a78bfa', fontSize: '13px', fontWeight: '700', marginBottom: '12px', letterSpacing: '0.5px' }}>🔍 XAI: WHY THIS SCORE</div>
                      {result.risk_factors.map((rf, rfIdx) => (
                        <div key={rfIdx} style={{
                          padding: '10px 12px',
                          marginBottom: rfIdx < result.risk_factors.length - 1 ? '8px' : 0,
                          background: 'rgba(30, 41, 59, 0.6)',
                          borderRadius: '10px',
                          borderLeft: `3px solid ${rf.severity === 'HIGH' ? '#ef4444' : rf.severity === 'MEDIUM' ? '#f59e0b' : '#64748b'}`,
                        }}>
                          <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '700' }}>{rf.factor}</div>
                          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '3px', lineHeight: '1.5' }}>{rf.detail}</div>
                          <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                            <span style={{ fontSize: '11px', color: rf.severity === 'HIGH' ? '#ef4444' : rf.severity === 'MEDIUM' ? '#f59e0b' : '#64748b', fontWeight: 'bold' }}>{rf.severity}</span>
                            {rf.confidence && <span style={{ fontSize: '11px', color: '#64748b' }}>{(rf.confidence * 100).toFixed(0)}% conf</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
        {athletes.length === 0 && (
          <div style={{
            padding: '50px 25px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
            borderRadius: '20px',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 5px 20px rgba(139, 92, 246, 0.2)'
          }}>
            {analyzing ? (
              <>
                <div style={{
                  width: '70px',
                  height: '70px',
                  border: '5px solid rgba(6, 182, 212, 0.3)',
                  borderTop: '5px solid #06b6d4',
                  borderRadius: '50%',
                  margin: '0 auto 25px',
                  animation: 'spin 1s linear infinite',
                  boxShadow: '0 0 30px rgba(6, 182, 212, 0.5)'
                }}></div>
                <p style={{ color: '#cbd5e1', fontSize: '16px', fontWeight: '600', margin: 0 }}>
                  🔍 Analyzing... Position athletes in frame
                </p>
              </>
            ) : (
              <>
                <div style={{
                  fontSize: '4rem',
                  marginBottom: '20px',
                  filter: 'drop-shadow(0 0 20px rgba(6, 182, 212, 0.5))'
                }}>
                  📷
                </div>
                <p style={{ color: '#cbd5e1', fontSize: '16px', fontWeight: '600', margin: 0 }}>
                  Click "Start Analysis" to begin
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { 
            opacity: 1;
            transform: scale(1);
          }
          50% { 
            opacity: 0.8;
            transform: scale(0.98);
          }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div >
  );
}

export default EnhancedLiveCamera;