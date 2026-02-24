import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCamera, FiStopCircle, FiVolume2, FiVolumeX, FiPlay, FiSave, FiAlertTriangle, FiCheckCircle, FiAward, FiDownload } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import demoFrames from '../data/demoSession.json';
import { useAuth } from '../context/AuthContext';
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

function EnhancedLiveCamera() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const { isLoggedIn, user } = useAuth();
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
  const [sessionSaved, setSessionSaved] = useState(false);
  const [savingSession, setSavingSession] = useState(false);

  // Smart Alerts
  const [alerts, setAlerts] = useState([]);
  const alertIdRef = useRef(0);

  // Detection Quality
  const [quality, setQuality] = useState({ coverage: 0, confidence: 0, missingParts: [] });

  // Metric Tab Grouping
  const [activeTab, setActiveTab] = useState('risk');

  // Record Buffer for replay
  const recordBufferRef = useRef([]);
  const [showReplay, setShowReplay] = useState(false);
  const [replayFrame, setReplayFrame] = useState(0);
  const sessionStartRef = useRef(null);

  const inRepRef = useRef(false);
  const statsRef = useRef({ p1: { risks: [], fatigues: [], maxRiskTs: null, maxRisk: 0 }, p2: { risks: [], fatigues: [] } });
  const lastAlertRef = useRef({ p1: '', p2: '' });
  const fpsRef = useRef({ lastTime: performance.now(), frameCount: 0 });
  const [fps, setFps] = useState(0);

  // ── Emergency Mode ──────────────────────────────────────────────────────────
  // States: NORMAL → TRACKING → EMERGENCY → ESCALATED → COOLDOWN → NORMAL
  const [emergencyState, setEmergencyState] = useState('NORMAL');  // 'NORMAL'|'TRACKING'|'EMERGENCY'|'ESCALATED'|'COOLDOWN'
  const [emergencyRiskScore, setEmergencyRiskScore] = useState(0);
  const [emergencyJoint, setEmergencyJoint] = useState('');
  const [emergencyMuted, setEmergencyMuted] = useState(false);
  const [flashingEnabled, setFlashingEnabled] = useState(true);
  const [riskConfig, setRiskConfig] = useState({
    high_risk_threshold: 65,
    sustained_duration_seconds: 7,
    escalation_duration_seconds: 15,
    emergency_cooldown_seconds: 15,
    audio_alert_enabled: true,
    min_confidence_threshold: 0.35,
  });

  // Refs for timer-based persistence logic (no re-render needed)
  const riskHighStartRef = useRef(null);   // timestamp when risk first exceeded threshold
  const cooldownEndsRef = useRef(null);   // timestamp when cooldown expires
  const emergencyVoiceFiredRef = useRef(false); // prevent repeat voice alerts per event
  const escalationTriggeredRef = useRef(false); // prevent repeat escalation per event
  const emergencyLogRef = useRef([]);      // audit log of emergency events

  // Emergency state ref (for use inside callbacks without stale closure)
  const emergencyStateRef = useRef('NORMAL');
  const riskConfigRef = useRef(riskConfig);


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
  // ── Smart Alert helper (must be before captureAndAnalyze) ─────────────────
  const triggerAlert = useCallback((severity, message) => {
    const id = ++alertIdRef.current;
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAlerts(prev => [{ id, severity, message, ts, active: true }, ...prev].slice(0, 6));
    setTimeout(() => setAlerts(prev => prev.map(a => a.id === id ? { ...a, active: false } : a)), 8000);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 12000);
  }, []);

  // ── Detection Quality computation (must be before captureAndAnalyze) ───────
  const computeQuality = useCallback((athleteData) => {
    if (!athleteData?.landmarks) return;
    const lms = athleteData.landmarks;
    const visible = lms.filter(l => l.visibility > 0.5);
    const coverage = Math.round((visible.length / lms.length) * 100);
    const keyJoints = [11, 12, 23, 24, 25, 26, 27, 28];
    const keyVisible = keyJoints.filter(i => lms[i]?.visibility > 0.5);
    const confidence = Math.round((keyVisible.length / keyJoints.length) * 100);
    const JOINT_NAMES = { 0: 'Face', 11: 'L-Shoulder', 12: 'R-Shoulder', 23: 'L-Hip', 24: 'R-Hip', 25: 'L-Knee', 26: 'R-Knee', 27: 'L-Ankle', 28: 'R-Ankle' };
    const missingParts = keyJoints.filter(i => !lms[i] || lms[i].visibility <= 0.5).map(i => JOINT_NAMES[i] || `Joint ${i}`);
    setQuality({ coverage, confidence, missingParts });
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

        // Quality indicators + record buffer
        if (response.data.athletes.length > 0) {
          computeQuality(response.data.athletes[0]);
          // Record buffer (cap at 300 frames ~5 min at 1fps)
          if (recordBufferRef.current.length < 300) {
            recordBufferRef.current.push({
              ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              athletes: response.data.athletes.map(a => ({
                risk_score: a.risk_assessment?.risk_score ?? 0,
                risk_level: a.risk_assessment?.risk_level ?? '',
                fatigue_score: a.temporal_analysis?.fatigue_score ?? 0,
              }))
            });
          }
          // Smart visual alerts (threshold transitions)
          const ath0 = response.data.athletes[0];
          const rl = ath0.risk_assessment?.risk_level;
          const p = 'p1';
          if (rl === 'HIGH' && lastAlertRef.current[p] !== 'HIGH') {
            triggerAlert('danger', `🚨 HIGH injury risk detected (${ath0.risk_assessment.risk_score}%). Stop and rest immediately.`);
          } else if (rl === 'MEDIUM' && lastAlertRef.current[p] === 'LOW') {
            triggerAlert('warning', `⚠️ Risk elevating to MEDIUM (${ath0.risk_assessment.risk_score}%). Monitor your form.`);
          } else if (rl === 'LOW' && (lastAlertRef.current[p] === 'HIGH' || lastAlertRef.current[p] === 'MEDIUM')) {
            triggerAlert('success', `✅ Risk returned to LOW (${ath0.risk_assessment.risk_score}%). Good recovery!`);
          }
          // Peak risk tracking
          const rs = response.data.athletes[0]?.risk_assessment?.risk_score ?? 0;
          if (rs > (statsRef.current.p1.maxRisk || 0)) {
            statsRef.current.p1.maxRisk = rs;
            statsRef.current.p1.maxRiskTs = new Date().toLocaleTimeString();
          }

          // ── Emergency Mode State Machine ────────────────────────────────
          const cfg = riskConfigRef.current;
          const ath0Em = response.data.athletes[0];
          const emScore = ath0Em?.risk_assessment?.risk_score ?? 0;
          const emConf = ath0Em?.risk_assessment?.overall_confidence ?? 0;
          const emJoint = ath0Em?.risk_assessment?.most_at_risk_joint ?? '';
          const nowMs = Date.now();
          const curState = emergencyStateRef.current;

          // Confidence failsafe — don't trigger emergency on low-confidence detections
          const confidentEnough = emConf >= cfg.min_confidence_threshold;
          const riskAboveThreshold = emScore >= cfg.high_risk_threshold;

          if (curState === 'NORMAL' || curState === 'TRACKING') {
            if (cooldownEndsRef.current && nowMs < cooldownEndsRef.current) {
              // In cooldown — skip
            } else if (riskAboveThreshold && confidentEnough) {
              if (!riskHighStartRef.current) riskHighStartRef.current = nowMs;
              const elapsed = (nowMs - riskHighStartRef.current) / 1000;
              if (elapsed >= cfg.sustained_duration_seconds) {
                // Activate emergency
                emergencyStateRef.current = 'EMERGENCY';
                setEmergencyState('EMERGENCY');
                setEmergencyRiskScore(emScore);
                setEmergencyJoint(emJoint);
                // Fire voice alert once per event
                if (!emergencyVoiceFiredRef.current && cfg.audio_alert_enabled) {
                  emergencyVoiceFiredRef.current = true;
                  speakAlert('High injury risk detected. Please correct your posture immediately.');
                }
                // Log the event
                emergencyLogRef.current.push({
                  ts: new Date().toISOString(),
                  score: emScore,
                  joint: emJoint,
                  state: 'EMERGENCY',
                });
              } else {
                emergencyStateRef.current = 'TRACKING';
                setEmergencyState('TRACKING');
                setEmergencyRiskScore(emScore);
                setEmergencyJoint(emJoint);
              }
            } else {
              // Risk dropped or confidence too low → reset timer
              riskHighStartRef.current = null;
              if (curState !== 'NORMAL') {
                emergencyStateRef.current = 'NORMAL';
                setEmergencyState('NORMAL');
                emergencyVoiceFiredRef.current = false;
                escalationTriggeredRef.current = false;
              }
            }
          } else if (curState === 'EMERGENCY' || curState === 'ESCALATED') {
            if (riskAboveThreshold && confidentEnough) {
              // Check escalation
              const elapsed = riskHighStartRef.current ? (nowMs - riskHighStartRef.current) / 1000 : 0;
              if (!escalationTriggeredRef.current && elapsed >= cfg.escalation_duration_seconds) {
                escalationTriggeredRef.current = true;
                emergencyStateRef.current = 'ESCALATED';
                setEmergencyState('ESCALATED');
                setEmergencyRiskScore(emScore);
                // Second voice warning for escalation (if not muted by user)
                speakAlert('Stop activity immediately. Severe injury risk.');
                emergencyLogRef.current.push({
                  ts: new Date().toISOString(),
                  score: emScore,
                  joint: emJoint,
                  state: 'ESCALATED',
                });
              } else {
                setEmergencyRiskScore(emScore);
              }
            } else {
              // Risk dropped — enter cooldown
              emergencyStateRef.current = 'COOLDOWN';
              setEmergencyState('COOLDOWN');
              cooldownEndsRef.current = nowMs + cfg.emergency_cooldown_seconds * 1000;
              riskHighStartRef.current = null;
              emergencyVoiceFiredRef.current = false;
              escalationTriggeredRef.current = false;
            }
          } else if (curState === 'COOLDOWN') {
            if (nowMs >= cooldownEndsRef.current) {
              emergencyStateRef.current = 'NORMAL';
              setEmergencyState('NORMAL');
              cooldownEndsRef.current = null;
            }
          }
          // ── End Emergency State Machine ─────────────────────────────────
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
  }, [webcamRef, voiceEnabled, adaptiveMode, sportMode, speakAlert, backendOffline, computeQuality, triggerAlert]);

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

  // ── Fetch risk config from backend on mount ──────────────────────────────
  useEffect(() => {
    fetch(`${BACKEND_URL}/risk-config`)
      .then(r => r.json())
      .then(cfg => {
        setRiskConfig(cfg);
        riskConfigRef.current = cfg;
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  // Keep riskConfigRef in sync with riskConfig state
  useEffect(() => { riskConfigRef.current = riskConfig; }, [riskConfig]);

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

  // ── Save session to athlete MongoDB profile ──────────────────────────────
  const handleSaveSession = useCallback(async (stats) => {
    if (!isLoggedIn || !user || user.isGuest) return;
    setSavingSession(true);
    try {
      const payload = {
        user_id: user.email || user.sub || user.id || 'unknown',
        user_name: user.name || 'Athlete',
        avg_risk: stats.avgRisk,
        max_risk: stats.maxRisk || stats.avgRisk,
        peak_risk_timestamp: stats.peakRiskTs || null,
        most_unstable_joint: stats.mostUnstableJoint || null,
        avg_fatigue: stats.avgFatigue || 0,
        max_fatigue: stats.maxFatigue,
        performance_score: performanceScore,
        rep_count: repCount,
        session_duration_s: stats.durationS || 0,
        sport_mode: sportMode,
        trend_direction: stats.trendDir || 'stable',
        injury_probability: stats.injuryProb || 0,
        coaching_recommendations: stats.suggestions || [],
        risk_factors: stats.riskFactors || [],
        timestamp: Date.now() / 1000,
      };
      await fetch(`${BACKEND_URL}/athlete-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSessionSaved(true);
    } catch (e) { console.error('Save session failed:', e); }
    setSavingSession(false);
  }, [isLoggedIn, user, performanceScore, repCount, sportMode]);

  const handleStop = async () => {
    setAnalyzing(false);
    const risks = statsRef.current.p1.risks;
    const fatigues = statsRef.current.p1.fatigues;
    if (risks.length > 0) {
      const avg = Math.round(risks.reduce((a, b) => a + b, 0) / risks.length);
      const maxRisk = Math.max(...risks);
      const avgFatigue = Math.round(fatigues.reduce((a, b) => a + b, 0) / fatigues.length);
      const mFatigue = Math.max(...fatigues);
      const durationS = sessionStartRef.current ? Math.round((Date.now() - sessionStartRef.current) / 1000) : 0;

      // Most unstable joint from last athlete result
      const lastAthletes = athletes;
      const lastAth = lastAthletes[0];
      const riskFactors = lastAth?.risk_assessment?.risk_factors || [];
      const mostUnstableJoint = riskFactors.length > 0
        ? riskFactors.sort((a, b) => (b.contribution || 0) - (a.contribution || 0))[0]?.factor
        : null;
      const trendDir = lastAth?.temporal_analysis?.trend_direction || 'stable';
      const injuryProb = lastAth?.temporal_analysis?.injury_probability || 0;

      const suggestions = [];
      if (mFatigue > 50) suggestions.push('High fatigue detected. Increase rest periods between sets.');
      if (avg > 40) suggestions.push('Average risk is elevated. Focus on controlled form over speed.');
      if (repCount > 0) suggestions.push(`Completed ${repCount} reps! Good session volume.`);
      if (performanceScore < 70) suggestions.push('Consistency dropped during the session. Watch your stabilization.');
      if (mostUnstableJoint) suggestions.push(`Most unstable region: ${mostUnstableJoint}. Target this in your next warm-up.`);

      const stats = {
        avgRisk: avg, maxRisk, avgFatigue, maxFatigue: mFatigue, durationS,
        mostUnstableJoint, trendDir, injuryProb, suggestions, riskFactors,
        peakRiskTs: statsRef.current.p1.maxRiskTs,
      };
      setSessionStats({ ...stats, prevAvgRisk: null, prevMaxFatigue: null });
      setShowSummary(true);
      setSessionSaved(false);

      // Auto-save to history (legacy)
      try {
        await fetch(`${BACKEND_URL}/save-session`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avg_risk: avg, max_fatigue: mFatigue, performance_score: performanceScore, rep_count: repCount, session_id: 'default', sport_mode: sportMode, timestamp: Date.now() / 1000 }),
        });
      } catch (_) { }

      // Auto-save to athlete profile if logged in
      if (isLoggedIn) handleSaveSession(stats);
    }
    lastAlertRef.current = { p1: '', p2: '' };
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    // Reset emergency state on stop
    emergencyStateRef.current = 'NORMAL';
    setEmergencyState('NORMAL');
    riskHighStartRef.current = null;
    cooldownEndsRef.current = null;
    emergencyVoiceFiredRef.current = false;
    escalationTriggeredRef.current = false;
  };

  const handleStart = () => {
    setAnalyzing(true);
    setChartData([]);
    setRepCount(0);
    setPerformanceScore(100);
    setShowSummary(false);
    setSessionSaved(false);
    setAlerts([]);
    inRepRef.current = false;
    statsRef.current = { p1: { risks: [], fatigues: [], maxRiskTs: null, maxRisk: 0 }, p2: { risks: [], fatigues: [] } };
    recordBufferRef.current = [];
    sessionStartRef.current = Date.now();
    setAthletes([]);
    // Reset emergency state on start
    emergencyStateRef.current = 'NORMAL';
    setEmergencyState('NORMAL');
    setEmergencyRiskScore(0);
    setEmergencyJoint('');
    riskHighStartRef.current = null;
    cooldownEndsRef.current = null;
    emergencyVoiceFiredRef.current = false;
    escalationTriggeredRef.current = false;
    emergencyLogRef.current = [];
  };

  const handleDownloadReport = () => {
    try {
      // eslint-disable-next-line
      const { jsPDF } = require('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 40;
      let y = margin;

      // ── Helpers ────────────────────────────────────────────────────────────
      const nl = (extra = 0) => { y += extra; };
      const text = (str, x, size = 11, style = 'normal', color = [30, 30, 30]) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', style);
        doc.setTextColor(...color);
        doc.text(String(str), x, y);
      };
      const checkPage = (needed = 30) => {
        if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
      };

      // ── Header banner ──────────────────────────────────────────────────────
      doc.setFillColor(14, 165, 233);
      doc.roundedRect(margin, y - 10, W - margin * 2, 56, 6, 6, 'F');
      doc.setFontSize(20); doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Stridex AI — Performance Report', margin + 16, y + 14);
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      const dur = sessionStats?.durationS > 0 ? `${Math.floor(sessionStats.durationS / 60)}m ${sessionStats.durationS % 60}s` : 'Session';
      const sport = sportMode === 'default' ? 'General' : sportMode;
      doc.text(`${new Date().toLocaleString()}   ·   ${dur}   ·   ${sport}`, margin + 16, y + 32);
      y += 66;

      // ── Stats row ──────────────────────────────────────────────────────────
      const cols = 3;
      const statW = (W - margin * 2 - 20) / cols;
      const stats = [
        { label: 'Avg Risk', value: `${sessionStats?.avgRisk ?? 0}%`, color: sessionStats?.avgRisk > 60 ? [239, 68, 68] : sessionStats?.avgRisk > 30 ? [245, 158, 11] : [16, 185, 129] },
        { label: 'Peak Risk', value: `${sessionStats?.maxRisk ?? sessionStats?.avgRisk ?? 0}%`, color: [239, 68, 68] },
        { label: 'Fatigue Level', value: `${sessionStats?.maxFatigue ?? 0}`, color: [59, 130, 246] },
      ];
      stats.forEach((s, i) => {
        const sx = margin + i * (statW + 10);
        doc.setFillColor(245, 248, 255);
        doc.roundedRect(sx, y, statW, 52, 4, 4, 'F');
        doc.setFillColor(220, 230, 255);
        doc.roundedRect(sx, y, statW, 52, 4, 4, 'S');
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139);
        doc.text(s.label.toUpperCase(), sx + 10, y + 16);
        doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(...s.color);
        doc.text(s.value, sx + 10, y + 40);
      });
      y += 66;

      // ── Risk Zone Breakdown ────────────────────────────────────────────────
      checkPage(80);
      doc.setFillColor(14, 165, 233);
      doc.rect(margin, y, 3, 18, 'F');
      text('Time in Risk Zones', margin + 12, 13, 'bold', [30, 30, 30]); y += 24;
      const buf = recordBufferRef.current || [];
      const zones = [
        { label: 'Low Risk', pct: buf.length ? Math.round((timeInZones.low / buf.length) * 100) : 0, color: [16, 185, 129] },
        { label: 'Moderate Risk', pct: buf.length ? Math.round((timeInZones.moderate / buf.length) * 100) : 0, color: [245, 158, 11] },
        { label: 'High Risk', pct: buf.length ? Math.round((timeInZones.high / buf.length) * 100) : 0, color: [239, 68, 68] },
      ];
      const barW = W - margin * 2 - 110;
      zones.forEach(z => {
        checkPage(24);
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
        doc.text(z.label, margin, y + 9);
        doc.setFillColor(230, 235, 245);
        doc.roundedRect(margin + 100, y, barW, 10, 3, 3, 'F');
        doc.setFillColor(...z.color);
        doc.roundedRect(margin + 100, y, (barW * z.pct) / 100, 10, 3, 3, 'F');
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...z.color);
        doc.text(`${z.pct}%`, W - margin, y + 9, { align: 'right' });
        y += 20;
      });
      y += 10;

      // ── Biomechanical Finding ──────────────────────────────────────────────
      if (sessionStats?.mostUnstableJoint) {
        checkPage(55);
        doc.setFillColor(254, 242, 242);
        doc.roundedRect(margin, y, W - margin * 2, 44, 4, 4, 'F');
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(239, 68, 68);
        doc.text('⚡ BIOMECHANICAL FINDING', margin + 12, y + 14);
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(185, 28, 28);
        doc.text(`Most Unstable Region: ${sessionStats.mostUnstableJoint}`, margin + 12, y + 32);
        y += 54;
      }

      // ── AI Coaching Insights ───────────────────────────────────────────────
      const PDF_SYSTEM_KEYWORDS = ['camera', 'confidence', 'adjust', 'visibility', 'frame'];
      const pdfSuggestions = (sessionStats?.suggestions || []).filter(s => !PDF_SYSTEM_KEYWORDS.some(k => s.toLowerCase().includes(k)));
      if (pdfSuggestions.length > 0) {
        checkPage(40);
        doc.setFillColor(14, 165, 233);
        doc.rect(margin, y, 3, 18, 'F');
        text('AI Coaching Insights', margin + 12, 13, 'bold', [30, 30, 30]); y += 24;
        pdfSuggestions.forEach(s => {
          checkPage(36);
          doc.setFillColor(240, 249, 255);
          doc.roundedRect(margin, y, W - margin * 2, 28, 3, 3, 'F');
          doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 58, 138);
          const lines = doc.splitTextToSize(`• ${s}`, W - margin * 2 - 20);
          doc.text(lines[0], margin + 10, y + 18);
          y += 36;
        });
      }

      // ── Risk Timeline (sparkline from recordBuffer) ────────────────────────
      if (buf.length > 2) {
        checkPage(80);
        y += 6;
        doc.setFillColor(14, 165, 233);
        doc.rect(margin, y, 3, 18, 'F');
        text('Risk Timeline', margin + 12, 13, 'bold', [30, 30, 30]); y += 24;
        const chartW = W - margin * 2; const chartH = 50;
        doc.setFillColor(240, 248, 255);
        doc.roundedRect(margin, y, chartW, chartH, 4, 4, 'F');
        const scores = buf.map(f => f.athletes[0]?.risk_score ?? 0);
        const maxS = Math.max(...scores, 1);
        const pts = scores.map((s, i) => ({
          x: margin + (i / (scores.length - 1)) * chartW,
          y: y + chartH - (s / maxS) * (chartH - 8) - 4,
        }));
        doc.setDrawColor(14, 165, 233); doc.setLineWidth(1.5);
        for (let i = 1; i < pts.length; i++) {
          doc.line(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
        }
        y += chartH + 12;
      }

      // ── Footer ──────────────────────────────────────────────────────────────
      const pages = doc.getNumberOfPages();
      for (let p = 1; p <= pages; p++) {
        doc.setPage(p);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 160, 160);
        doc.text(`Generated by Stridex AI Engine  ·  Page ${p} of ${pages}`, W / 2, pageH - 20, { align: 'center' });
      }

      doc.save(`stridex_report_${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Could not generate PDF. Please try again.');
    }
  };

  // ── Derived state for dynamic UI ──────────────────────────────────────────
  const currentAth = athletes[0];
  const currentRiskScore = currentAth?.risk_assessment?.risk_score ?? 0;
  const currentRiskLevel = currentAth?.risk_assessment?.risk_level ?? 'LOW';
  const currentConfidence = Math.round((currentAth?.risk_assessment?.overall_confidence ?? 0) * 100);

  // Header state machine
  const headerState = demoMode ? 'DEMO'
    : !analyzing ? 'IDLE'
      : currentRiskLevel === 'HIGH' ? 'HIGH_RISK'
        : 'ANALYZING';

  const HEADER_GRADIENTS = {
    IDLE: 'linear-gradient(135deg, #1e3a8a 0%, #0c4a6e 60%, #164e63 100%)',
    ANALYZING: 'linear-gradient(135deg, #1e3a8a 0%, #4c1d95 50%, #0e7490 100%)',
    HIGH_RISK: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 40%, #1e3a8a 100%)',
    DEMO: 'linear-gradient(135deg, #374151 0%, #1f2937 60%, #111827 100%)',
  };

  const HEADER_GLOW = {
    IDLE: '0 20px 60px rgba(14,165,233,0.25)',
    ANALYZING: '0 20px 60px rgba(139,92,246,0.35)',
    HIGH_RISK: '0 20px 60px rgba(239,68,68,0.45)',
    DEMO: '0 20px 60px rgba(100,116,139,0.2)',
  };

  // Risk bar colour thresholds (no hardcode — computed from score bands)
  const riskBarColor = currentRiskScore >= 60 ? '#ef4444' : currentRiskScore >= 30 ? '#f59e0b' : '#10b981';
  const riskLabel = currentRiskScore >= 60 ? 'HIGH' : currentRiskScore >= 30 ? 'MODERATE' : 'LOW';

  // Time in risk zones — computed from record buffer
  const timeInZones = (() => {
    const buf = recordBufferRef.current;
    if (!buf.length) return { low: 0, moderate: 0, high: 0 };
    let low = 0, moderate = 0, high = 0;
    buf.forEach(f => {
      const rs = f.athletes[0]?.risk_score ?? 0;
      if (rs >= 60) high++;
      else if (rs >= 30) moderate++;
      else low++;
    });
    return { low, moderate, high };
  })();

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

      {/* ── Detection Quality Banner ────────────────────────────────────────── */}
      {analyzing && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: quality.confidence < 65 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.08)', border: `1px solid ${quality.confidence < 65 ? 'rgba(245,158,11,0.35)' : 'rgba(16,185,129,0.25)'}`, borderRadius: '12px', padding: '10px 16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: quality.confidence < 65 ? '#f59e0b' : '#10b981' }}>
            {quality.confidence < 65 ? '⚠️ Adjust Camera' : '✅ Good Pose'}
          </span>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Coverage: <b style={{ color: '#e2e8f0' }}>{quality.coverage}%</b></span>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Confidence: <b style={{ color: quality.confidence < 65 ? '#f59e0b' : '#10b981' }}>{quality.confidence}%</b></span>
          {quality.missingParts.length > 0 && (
            <span style={{ fontSize: '11px', color: '#ef4444' }}>Missing: {quality.missingParts.join(', ')}</span>
          )}
        </div>
      )}

      {/* ── Smart Alerts Panel ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {alerts.filter(a => a.active).map(alert => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 40, height: 0 }}
            animate={{ opacity: 1, x: 0, height: 'auto' }}
            exit={{ opacity: 0, x: 40, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background: alert.severity === 'danger' ? 'rgba(239,68,68,0.15)' : alert.severity === 'warning' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.1)',
              border: `1px solid ${alert.severity === 'danger' ? 'rgba(239,68,68,0.4)' : alert.severity === 'warning' ? 'rgba(245,158,11,0.35)' : 'rgba(16,185,129,0.3)'}`,
              borderRadius: '12px', padding: '10px 16px', marginBottom: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '16px' }}>{alert.severity === 'danger' ? '🚨' : alert.severity === 'warning' ? '⚠️' : '✅'}</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: alert.severity === 'danger' ? '#ef4444' : alert.severity === 'warning' ? '#f59e0b' : '#10b981' }}>{alert.message}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{alert.ts}</div>
              </div>
            </div>
            <button onClick={() => setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, active: false } : a))} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Session Summary Modal ─────────────────────────────────────────── */}
      {showSummary && (() => {
        const buf = recordBufferRef.current;
        const riskHistory = buf.map(f => f.athletes[0]?.risk_score ?? 0);
        const maxRiskVal = Math.max(...riskHistory, 1);
        const W = 440, H = 80;
        // Build SVG polyline
        const pts = riskHistory.map((r, i) => {
          const x = riskHistory.length > 1 ? (i / (riskHistory.length - 1)) * W : 0;
          const y = H - (r / 100) * H;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        const peakIdx = riskHistory.indexOf(maxRiskVal);
        const peakX = riskHistory.length > 1 ? (peakIdx / (riskHistory.length - 1)) * W : 0;
        const peakY = H - (maxRiskVal / 100) * H;

        // System vs biomechanical notice detection
        const SYSTEM_KEYWORDS = ['camera', 'confidence', 'adjust', 'visibility', 'frame'];
        const biomechSuggestions = (sessionStats.suggestions || []).filter(s => !SYSTEM_KEYWORDS.some(k => s.toLowerCase().includes(k)));
        const systemNotices = (sessionStats.suggestions || []).filter(s => SYSTEM_KEYWORDS.some(k => s.toLowerCase().includes(k)));

        // Check if most unstable joint is a system artifact
        const isSystemArtifact = sessionStats.mostUnstableJoint && SYSTEM_KEYWORDS.some(k => sessionStats.mostUnstableJoint.toLowerCase().includes(k));

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)', padding: '40px', borderRadius: '22px', border: '1px solid rgba(14,165,233,0.3)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', width: '660px', maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto' }}
            >
              {/* Heading */}
              <div style={{ borderBottom: '1px solid #1e3a5f', paddingBottom: '18px', marginBottom: '24px' }}>
                <h2 style={{ color: 'white', margin: '0 0 6px 0', fontSize: '1.65rem', fontWeight: '800', letterSpacing: '-0.3px' }}>
                  🧠 Performance Analysis Complete
                </h2>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Stridex AI Engine · {sessionStats.durationS > 0 ? `${Math.floor(sessionStats.durationS / 60)}m ${sessionStats.durationS % 60}s session` : 'Session'} · {sportMode === 'default' ? 'General' : sportMode}
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '18px 14px', borderRadius: '14px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Avg Risk</div>
                  <div style={{ color: sessionStats.avgRisk > 60 ? '#ef4444' : sessionStats.avgRisk > 30 ? '#f59e0b' : '#10b981', fontSize: '2.1rem', fontWeight: '900', lineHeight: 1 }}>{sessionStats.avgRisk}%</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '18px 14px', borderRadius: '14px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Peak Risk</div>
                  <div style={{ color: '#ef4444', fontSize: '2.1rem', fontWeight: '900', lineHeight: 1 }}>{sessionStats.maxRisk ?? sessionStats.avgRisk}%</div>
                  {sessionStats.peakRiskTs && <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>@ {sessionStats.peakRiskTs}</div>}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '18px 14px', borderRadius: '14px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Fatigue</div>
                  <div style={{ color: sessionStats.maxFatigue > 50 ? '#f59e0b' : '#3b82f6', fontSize: '2.1rem', fontWeight: '900', lineHeight: 1 }}>{sessionStats.maxFatigue}</div>
                </div>
              </div>

              {/* ── Risk Timeline Chart ─────────────────────────────────────── */}
              {riskHistory.length > 2 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '700', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>📈 Risk Timeline</span>
                    <span style={{ color: '#64748b', fontSize: '12px' }}>Session Duration →</span>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '8px', overflow: 'hidden' }}>
                    <svg width="100%" viewBox={`0 0 ${W} ${H + 10}`} style={{ display: 'block' }}>
                      {/* High risk zone fill */}
                      <rect x="0" y="0" width={W} height={H * 0.4} fill="rgba(239,68,68,0.08)" rx="4" />
                      {/* Moderate risk zone fill */}
                      <rect x="0" y={H * 0.4} width={W} height={H * 0.3} fill="rgba(245,158,11,0.06)" rx="4" />
                      {/* Zone labels */}
                      <text x="4" y="10" fontSize="8" fill="rgba(239,68,68,0.5)" fontWeight="600">HIGH</text>
                      <text x="4" y={H * 0.55} fontSize="8" fill="rgba(245,158,11,0.5)" fontWeight="600">MOD</text>
                      <text x="4" y={H * 0.92} fontSize="8" fill="rgba(16,185,129,0.5)" fontWeight="600">LOW</text>
                      {/* Risk line */}
                      {pts && <polyline points={pts} fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
                      {/* Peak marker */}
                      {peakIdx >= 0 && (
                        <>
                          <line x1={peakX} y1={0} x2={peakX} y2={H} stroke="rgba(239,68,68,0.5)" strokeWidth="1" strokeDasharray="3,3" />
                          <circle cx={peakX} cy={peakY} r="4" fill="#ef4444" stroke="white" strokeWidth="1.5" />
                          <text x={Math.min(peakX + 6, W - 40)} y={Math.max(peakY - 6, 12)} fontSize="9" fill="#ef4444" fontWeight="700">PEAK</text>
                        </>
                      )}
                    </svg>
                  </div>
                </div>
              )}

              {/* ── Time in Risk Zones ──────────────────────────────────────── */}
              {buf.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '700', marginBottom: '12px' }}>⏱ Time in Risk Zones</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { label: 'Low Risk', count: timeInZones.low, color: '#10b981' },
                      { label: 'Moderate Risk', count: timeInZones.moderate, color: '#f59e0b' },
                      { label: 'High Risk', count: timeInZones.high, color: '#ef4444' },
                    ].map(({ label, count, color }) => {
                      const pct = buf.length ? Math.round((count / buf.length) * 100) : 0;
                      return (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '110px', fontSize: '13px', color: '#cbd5e1', flexShrink: 0, fontWeight: '500' }}>{label}</div>
                          <div style={{ flex: 1, height: '9px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '999px', transition: 'width 0.5s ease' }} />
                          </div>
                          <div style={{ fontSize: '13px', color, fontWeight: '800', width: '36px', textAlign: 'right' }}>{pct}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Biomechanical Findings ──────────────────────────────────── */}
              {sessionStats.mostUnstableJoint && !isSystemArtifact && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>⚡ Biomechanical Finding</div>
                  <div style={{ fontSize: '16px', color: '#ef4444', fontWeight: '700' }}>Most Unstable Region: {sessionStats.mostUnstableJoint}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>Focus corrective exercises on this joint in your next warm-up.</div>
                </div>
              )}

              {/* ── System Notices (only camera/confidence issues) ──────────── */}
              {systemNotices.length > 0 && (
                <div style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.25)', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>📷 System Notice</div>
                  {systemNotices.map((n, i) => <div key={i} style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '4px' }}>• {n}</div>)}
                </div>
              )}

              {/* ── Structured AI Coaching ─────────────────────────────────── */}
              {biomechSuggestions.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>💡 AI Coaching Insights</div>
                  {biomechSuggestions.map((s, i) => {
                    const isRec = s.toLowerCase().startsWith('focus') || s.toLowerCase().startsWith('target') || s.toLowerCase().startsWith('increase') || s.toLowerCase().startsWith('watch') || s.toLowerCase().startsWith('keep');
                    return (
                      <div key={i} style={{ background: isRec ? 'rgba(14,165,233,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isRec ? 'rgba(14,165,233,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '10px' }}>
                        <div style={{ fontSize: '11px', color: isRec ? '#0ea5e9' : '#8b5cf6', fontWeight: '700', textTransform: 'uppercase', marginBottom: '5px' }}>
                          {isRec ? '→ Recommendation' : '↗ Observation'}
                        </div>
                        <div style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: 1.5 }}>{s}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Buttons — Priority Ordered ─────────────────────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                {/* PRIMARY — Save to Profile */}
                {isLoggedIn && !user?.isGuest && (
                  <button
                    onClick={() => handleSaveSession(sessionStats)}
                    disabled={savingSession || sessionSaved}
                    style={{ width: '100%', padding: '15px', background: sessionSaved ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: sessionSaved ? 'default' : 'pointer', fontSize: '15px', transition: 'all 0.2s', boxShadow: '0 8px 20px rgba(14,165,233,0.35)', opacity: savingSession ? 0.75 : 1 }}
                  >
                    <FiSave style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    {savingSession ? 'Saving to profile…' : sessionSaved ? '✓ Saved to Profile' : 'Save to Athlete Profile'}
                  </button>
                )}

                {/* SECONDARY — PDF + CSV */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleDownloadReport}
                    style={{ flex: 1, padding: '13px', background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' }}
                  >
                    <FiDownload style={{ marginRight: 6, verticalAlign: 'middle' }} /> PDF Report
                  </button>
                  <button
                    onClick={() => {
                      const rows = [['Timestamp', 'Risk Score', 'Fatigue Score']];
                      recordBufferRef.current.forEach(f => rows.push([f.ts, f.athletes[0]?.risk_score ?? '', f.athletes[0]?.fatigue_score ?? '']));
                      const csv = rows.map(r => r.join(',')).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `stridex_session_${Date.now()}.csv`; a.click();
                    }}
                    style={{ flex: 1, padding: '12px', background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.35)', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }}
                  >
                    📊 Export CSV
                  </button>
                </div>

                {/* TERTIARY — Close (muted) */}
                <button
                  onClick={() => setShowSummary(false)}
                  style={{ width: '100%', padding: '10px', background: 'transparent', color: '#475569', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontWeight: '500', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}


      {/* ── TRACKING Warning Strip (non-intrusive, pre-emergency) ──────────── */}
      {emergencyState === 'TRACKING' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          style={{ background: 'linear-gradient(90deg,rgba(245,158,11,0.18),rgba(239,68,68,0.12))', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '12px', padding: '10px 18px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}
          role="status"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>⏳</span>
            <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '700' }}>Sustained high risk detected — monitoring…</span>
            <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: '800' }}>{emergencyRiskScore}%</span>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            Emergency mode activates after {riskConfig.sustained_duration_seconds}s of sustained HIGH risk
          </div>
        </motion.div>
      )}

      {/* ── COOLDOWN Notice Strip ───────────────────────────────────────────── */}
      {emergencyState === 'COOLDOWN' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', padding: '10px 18px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}
          role="status"
        >
          <span style={{ fontSize: '16px' }}>✅</span>
          <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '700' }}>Risk stabilized — {riskConfig.emergency_cooldown_seconds}s cooldown in progress before re-arming.</span>
        </motion.div>
      )}

      {/* ── FULL-SCREEN EMERGENCY OVERLAY ──────────────────────────────────── */}
      <AnimatePresence>
        {(emergencyState === 'EMERGENCY' || emergencyState === 'ESCALATED') && (
          <motion.div
            key="emergency-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            role="alertdialog"
            aria-live="assertive"
            aria-modal="false"
            aria-label={emergencyState === 'ESCALATED' ? 'Stop activity immediately — severe injury risk' : 'High injury risk emergency alert'}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9990,
              pointerEvents: 'none',   // Don't block camera interactions
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Background flash overlay — safe 2Hz pulse via CSS animation */}
            {flashingEnabled && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: emergencyState === 'ESCALATED'
                  ? 'rgba(239,68,68,0.22)'
                  : 'rgba(220,38,38,0.15)',
                animation: 'emergencyPulse 0.5s ease-in-out infinite alternate',
                pointerEvents: 'none',
              }} />
            )}

            {/* Central warning banner — pointer events enabled */}
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                position: 'relative',
                zIndex: 9991,
                pointerEvents: 'all',
                background: emergencyState === 'ESCALATED'
                  ? 'linear-gradient(135deg,rgba(127,29,29,0.97),rgba(153,27,27,0.97))'
                  : 'linear-gradient(135deg,rgba(30,10,10,0.95),rgba(100,14,14,0.95))',
                border: `2px solid ${emergencyState === 'ESCALATED' ? '#ef4444' : 'rgba(239,68,68,0.7)'}`,
                borderRadius: '20px',
                padding: '36px 44px',
                maxWidth: '520px',
                width: '90vw',
                textAlign: 'center',
                boxShadow: '0 0 60px rgba(239,68,68,0.5), 0 20px 60px rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {/* Icon */}
              <div style={{ fontSize: '3.2rem', marginBottom: '12px', lineHeight: 1 }}>
                {emergencyState === 'ESCALATED' ? '🛑' : '⚠️'}
              </div>

              {/* Headline */}
              <h2 style={{
                margin: '0 0 8px',
                fontSize: emergencyState === 'ESCALATED' ? '1.7rem' : '1.5rem',
                fontWeight: '900',
                color: '#fef2f2',
                letterSpacing: '-0.3px',
                lineHeight: 1.2,
              }}>
                {emergencyState === 'ESCALATED'
                  ? 'STOP ACTIVITY IMMEDIATELY'
                  : '⚠ HIGH INJURY RISK DETECTED'}
              </h2>

              {/* Subtext */}
              <p style={{ margin: '0 0 20px', color: '#fca5a5', fontSize: '14px', fontWeight: '500' }}>
                {emergencyState === 'ESCALATED'
                  ? 'Sustained severe risk — cease exercise now and rest.'
                  : 'Correct your form immediately to prevent injury.'}
              </p>

              {/* Live stats */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '22px', flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px', padding: '10px 20px', minWidth: '100px' }}>
                  <div style={{ fontSize: '11px', color: '#fca5a5', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Risk</div>
                  <div style={{ fontSize: '2rem', fontWeight: '900', color: '#fef2f2' }}>{emergencyRiskScore}%</div>
                </div>
                {emergencyJoint && (
                  <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px', padding: '10px 20px' }}>
                    <div style={{ fontSize: '11px', color: '#fca5a5', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contributing Joint</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fef2f2' }}>{emergencyJoint}</div>
                  </div>
                )}
              </div>

              {/* User controls — accessibility */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setEmergencyMuted(m => !m)}
                  aria-label={emergencyMuted ? 'Unmute emergency audio' : 'Mute emergency audio'}
                  style={{ padding: '9px 18px', background: emergencyMuted ? 'rgba(255,255,255,0.12)' : 'rgba(239,68,68,0.3)', color: '#fef2f2', border: '1px solid rgba(239,68,68,0.5)', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {emergencyMuted ? <FiVolumeX /> : <FiVolume2 />}
                  {emergencyMuted ? 'Unmute Audio' : 'Mute Audio'}
                </button>
                <button
                  onClick={() => setFlashingEnabled(f => !f)}
                  aria-label={flashingEnabled ? 'Disable flashing effect' : 'Enable flashing effect'}
                  style={{ padding: '9px 18px', background: 'rgba(255,255,255,0.08)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                >
                  {flashingEnabled ? '🔇 Disable Flash' : '💡 Enable Flash'}
                </button>
              </div>

              <p style={{ marginTop: '16px', fontSize: '11px', color: '#6b7280' }}>
                Alert will dismiss automatically when risk drops below {riskConfig.high_risk_threshold}% threshold.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── State-Aware Header ───────────────────────────────────────────────── */}
      <div
        style={{
          background: HEADER_GRADIENTS[headerState],
          padding: '32px 40px 24px',
          borderRadius: '25px',
          marginBottom: '32px',
          boxShadow: HEADER_GLOW[headerState],
          border: `1px solid ${headerState === 'HIGH_RISK' ? 'rgba(239,68,68,0.4)' : 'rgba(6,182,212,0.25)'}`,
          color: 'white',
          transition: 'background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
        }}
      >
        {/* Title Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <h2 style={{ margin: 0, fontSize: '1.9rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
                <FiCamera style={{ marginRight: '12px', verticalAlign: 'middle' }} />
                Live Camera Analysis
              </h2>
              {demoMode && (
                <span style={{ fontSize: '11px', fontWeight: '700', background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '20px', letterSpacing: '1px' }}>DEMO</span>
              )}
              {analyzing && headerState === 'HIGH_RISK' && (
                <span style={{ fontSize: '11px', fontWeight: '700', background: 'rgba(239,68,68,0.4)', padding: '3px 10px', borderRadius: '20px', letterSpacing: '1px', animation: 'pulse 1.5s infinite' }}>⚠ HIGH RISK</span>
              )}
            </div>
            <p style={{ margin: 0, opacity: 0.75, fontSize: '13px' }}>
              ⚡ Real-time biomechanical risk detection — Stridex AI Engine v2.4
            </p>
          </div>

          {/* Risk Thermometer */}
          {analyzing && (
            <div style={{ minWidth: '200px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', opacity: 0.8, fontWeight: '600' }}>Live Risk</span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: riskBarColor }}>{currentRiskScore}% — {riskLabel}</span>
              </div>
              <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${currentRiskScore}%`,
                  background: riskBarColor,
                  borderRadius: '999px',
                  transition: 'width 0.4s ease, background 0.4s ease',
                  boxShadow: `0 0 8px ${riskBarColor}80`,
                }} />
              </div>
            </div>
          )}
        </div>

        {/* ── Live System Status Strip ─────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px', padding: '10px 14px', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: analyzing ? '#34d399' : '#94a3b8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: analyzing ? '#34d399' : '#94a3b8', display: 'inline-block', boxShadow: analyzing ? '0 0 6px #34d399' : 'none' }} />
            {analyzing ? 'LIVE' : 'STANDBY'}
          </span>
          <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: '500' }}>FPS: <b style={{ color: fps >= 20 ? '#34d399' : '#fbbf24' }}>{fps}</b></span>
          <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: '500' }}>Confidence: <b style={{ color: currentConfidence >= 65 ? '#34d399' : '#fbbf24' }}>{analyzing ? `${currentConfidence}%` : '—'}</b></span>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Model: <b style={{ color: '#e2e8f0' }}>Stridex-v2.4</b></span>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Mode: <b style={{ color: '#e2e8f0' }}>{sportMode === 'default' ? 'General' : sportMode.charAt(0).toUpperCase() + sportMode.slice(1)}</b></span>
          {athletes.length > 1 && <span style={{ fontSize: '12px', color: '#a78bfa', fontWeight: '700' }}>{athletes.length} Athletes Detected</span>}
        </div>

        {/* ── Button Hierarchy ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>

          {/* PRIMARY — Start / Stop */}
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleStart} disabled={analyzing}
            style={{ padding: '13px 28px', background: analyzing ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: analyzing ? '1px solid rgba(255,255,255,0.15)' : 'none', borderRadius: '12px', cursor: analyzing ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: !analyzing ? '0 6px 20px rgba(16,185,129,0.45)' : 'none', transition: 'all 0.3s', opacity: analyzing ? 0.5 : 1 }}
          ><FiCamera /> Start Analysis</motion.button>

          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleStop} disabled={!analyzing}
            style={{ padding: '13px 28px', background: analyzing ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(255,255,255,0.1)', color: 'white', border: analyzing ? 'none' : '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', cursor: !analyzing ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: analyzing ? '0 6px 20px rgba(239,68,68,0.45)' : 'none', transition: 'all 0.3s', opacity: !analyzing ? 0.5 : 1 }}
          ><FiStopCircle /> Stop</motion.button>

          <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.15)' }} />

          {/* SECONDARY — Voice, Sensitivity */}
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            style={{ padding: '11px 20px', background: voiceEnabled ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.08)', color: 'white', border: `1px solid ${voiceEnabled ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.15)'}`, borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.2s' }}
          >{voiceEnabled ? <><FiVolume2 /> Voice On</> : <><FiVolumeX /> Voice Off</>}</motion.button>

          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setAdaptiveMode(!adaptiveMode)}
            style={{ padding: '11px 20px', background: adaptiveMode ? 'rgba(14,165,233,0.3)' : 'rgba(255,255,255,0.08)', color: 'white', border: `1px solid ${adaptiveMode ? 'rgba(14,165,233,0.5)' : 'rgba(255,255,255,0.15)'}`, borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.2s' }}
          >🎯 {adaptiveMode ? 'Sensitivity: High' : 'Sensitivity: General'}</motion.button>

          <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.15)' }} />

          {/* TERTIARY — Demo Mode (outlined) */}
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setDemoMode(true); setAnalyzing(false); }} disabled={demoMode}
            style={{ padding: '11px 20px', background: 'transparent', color: demoMode ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.85)', border: `1px solid ${demoMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.35)'}`, borderRadius: '10px', cursor: demoMode ? 'not-allowed' : 'pointer', fontWeight: '500', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.2s' }}
          ><FiPlay /> {demoMode ? 'Demo Active' : 'Demo Mode'}</motion.button>

          {/* Sport Selector — compact */}
          <select value={sportMode} onChange={(e) => setSportMode(e.target.value)}
            style={{ padding: '11px 16px', background: 'rgba(245,158,11,0.25)', color: 'white', border: '1px solid rgba(245,158,11,0.5)', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', outline: 'none' }}
          >
            <option value="default" style={{ color: 'black' }}>🏋️ General</option>
            <option value="basketball" style={{ color: 'black' }}>🏀 Basketball</option>
            <option value="sprinting" style={{ color: 'black' }}>🏃 Sprinting</option>
            <option value="squats" style={{ color: 'black' }}>🦵 Squats</option>
            <option value="cricket" style={{ color: 'black' }}>🏏 Cricket</option>
            <option value="soccer" style={{ color: 'black' }}>⚽ Soccer</option>
            <option value="tennis" style={{ color: 'black' }}>🎾 Tennis</option>
            <option value="weightlifting" style={{ color: 'black' }}>🏋️ Weightlifting</option>
            <option value="volleyball" style={{ color: 'black' }}>🏐 Volleyball</option>
          </select>
        </div>
      </div>

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
        @keyframes emergencyPulse {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div >
  );
}

export default EnhancedLiveCamera;