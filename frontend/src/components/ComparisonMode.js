import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FiGitMerge, FiUpload } from 'react-icons/fi';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

function ComparisonMode() {
  const [leftVideo, setLeftVideo] = useState(null);
  const [rightVideo, setRightVideo] = useState(null);
  const [leftResult, setLeftResult] = useState(null);
  const [rightResult, setRightResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const analyzeVideo = async (file, side) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${BACKEND_URL}/analyze-video-enhanced`,
        formData
      );

      if (side === 'left') {
        setLeftResult(response.data);
      } else {
        setRightResult(response.data);
      }
    } catch (error) {
      alert(`Analysis failed for ${side} video`);
    }
  };

  const handleCompare = async () => {
    if (!leftVideo || !rightVideo) {
      alert('Please upload both videos');
      return;
    }

    setAnalyzing(true);
    await Promise.all([
      analyzeVideo(leftVideo, 'left'),
      analyzeVideo(rightVideo, 'right')
    ]);
    setAnalyzing(false);
  };

  const getRiskColor = (score) => {
    if (score >= 70) return '#ef4444';
    if (score >= 40) return '#f97316';
    return '#10b981';
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1800px', margin: '0 auto' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #8b5cf6 50%, #06b6d4 100%)',
          padding: '40px',
          borderRadius: '25px',
          marginBottom: '40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          textAlign: 'center'
        }}
      >
        <h2 style={{ color: 'white', margin: '0 0 15px 0', fontSize: '2.5rem', fontWeight: '800' }}>
          <FiGitMerge style={{ marginRight: '15px', verticalAlign: 'middle' }} />
          Side-by-Side Comparison
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0, fontSize: '16px' }}>
          Compare two videos to track improvement or analyze different techniques
        </p>
      </motion.div>

      {/* Upload Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
        {/* Left Upload */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          padding: '30px',
          borderRadius: '20px',
          border: '2px solid rgba(6, 182, 212, 0.3)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
        }}>
          <h3 style={{ color: '#06b6d4', margin: '0 0 20px 0', fontSize: '1.5rem' }}>
            📹 Video A (Before/Baseline)
          </h3>
          <label style={{
            display: 'block',
            padding: '50px 20px',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(8, 145, 178, 0.05) 100%)',
            border: '2px dashed rgba(6, 182, 212, 0.5)',
            borderRadius: '15px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(8, 145, 178, 0.1) 100%)';
              e.target.style.borderColor = '#06b6d4';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(8, 145, 178, 0.05) 100%)';
              e.target.style.borderColor = 'rgba(6, 182, 212, 0.5)';
            }}
          >
            <FiUpload style={{ fontSize: '3rem', color: '#06b6d4', marginBottom: '15px' }} />
            <p style={{ color: '#cbd5e1', margin: 0, fontSize: '15px' }}>
              {leftVideo ? `✅ ${leftVideo.name}` : 'Click to upload first video'}
            </p>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setLeftVideo(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Right Upload */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          padding: '30px',
          borderRadius: '20px',
          border: '2px solid rgba(139, 92, 246, 0.3)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
        }}>
          <h3 style={{ color: '#8b5cf6', margin: '0 0 20px 0', fontSize: '1.5rem' }}>
            📹 Video B (After/Comparison)
          </h3>
          <label style={{
            display: 'block',
            padding: '50px 20px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)',
            border: '2px dashed rgba(139, 92, 246, 0.5)',
            borderRadius: '15px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.1) 100%)';
              e.target.style.borderColor = '#8b5cf6';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)';
              e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
            }}
          >
            <FiUpload style={{ fontSize: '3rem', color: '#8b5cf6', marginBottom: '15px' }} />
            <p style={{ color: '#cbd5e1', margin: 0, fontSize: '15px' }}>
              {rightVideo ? `✅ ${rightVideo.name}` : 'Click to upload second video'}
            </p>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setRightVideo(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* Compare Button */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCompare}
          disabled={!leftVideo || !rightVideo || analyzing}
          style={{
            padding: '20px 60px',
            fontSize: '18px',
            background: leftVideo && rightVideo && !analyzing
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : '#475569',
            color: 'white',
            border: 'none',
            borderRadius: '15px',
            cursor: leftVideo && rightVideo && !analyzing ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
            boxShadow: leftVideo && rightVideo && !analyzing
              ? '0 10px 40px rgba(16, 185, 129, 0.5)'
              : 'none',
            transition: 'all 0.3s'
          }}
        >
          {analyzing ? '⏳ Analyzing Both Videos...' : '🔍 Compare Videos'}
        </motion.button>
      </div>

      {/* Results */}
      {leftResult && rightResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {/* Comparison Stats */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            padding: '40px',
            borderRadius: '25px',
            marginBottom: '30px',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
          }}>
            <h3 style={{
              color: 'white',
              margin: '0 0 30px 0',
              fontSize: '2rem',
              fontWeight: '700',
              textAlign: 'center'
            }}>
              📊 Comparison Results
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '40px', alignItems: 'center' }}>
              {/* Left Stats */}
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ color: '#06b6d4', margin: '0 0 15px 0', fontSize: '1.2rem' }}>
                  Video A
                </h4>
                <div style={{
                  padding: '30px',
                  background: `linear-gradient(135deg, ${getRiskColor(leftResult.analysis_summary.average_risk)}15 0%, ${getRiskColor(leftResult.analysis_summary.average_risk)}05 100%)`,
                  borderRadius: '20px',
                  border: `2px solid ${getRiskColor(leftResult.analysis_summary.average_risk)}30`
                }}>
                  <h2 style={{
                    margin: '0 0 10px 0',
                    fontSize: '4rem',
                    color: getRiskColor(leftResult.analysis_summary.average_risk),
                    fontWeight: '900',
                    textShadow: `0 0 30px ${getRiskColor(leftResult.analysis_summary.average_risk)}50`
                  }}>
                    {leftResult.analysis_summary.average_risk}%
                  </h2>
                  <p style={{ margin: 0, color: '#cbd5e1', fontSize: '15px' }}>Average Risk</p>
                </div>
              </div>

              {/* VS Indicator */}
              <div style={{
                padding: '20px 30px',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                borderRadius: '50px',
                color: 'white',
                fontSize: '2rem',
                fontWeight: '900',
                boxShadow: '0 10px 30px rgba(249, 115, 22, 0.5)'
              }}>
                VS
              </div>

              {/* Right Stats */}
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ color: '#8b5cf6', margin: '0 0 15px 0', fontSize: '1.2rem' }}>
                  Video B
                </h4>
                <div style={{
                  padding: '30px',
                  background: `linear-gradient(135deg, ${getRiskColor(rightResult.analysis_summary.average_risk)}15 0%, ${getRiskColor(rightResult.analysis_summary.average_risk)}05 100%)`,
                  borderRadius: '20px',
                  border: `2px solid ${getRiskColor(rightResult.analysis_summary.average_risk)}30`
                }}>
                  <h2 style={{
                    margin: '0 0 10px 0',
                    fontSize: '4rem',
                    color: getRiskColor(rightResult.analysis_summary.average_risk),
                    fontWeight: '900',
                    textShadow: `0 0 30px ${getRiskColor(rightResult.analysis_summary.average_risk)}50`
                  }}>
                    {rightResult.analysis_summary.average_risk}%
                  </h2>
                  <p style={{ margin: 0, color: '#cbd5e1', fontSize: '15px' }}>Average Risk</p>
                </div>
              </div>
            </div>

            {/* Improvement/Decline Badge */}
            {leftResult.analysis_summary.average_risk > rightResult.analysis_summary.average_risk && (
              <div style={{
                marginTop: '30px',
                padding: '20px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '15px',
                textAlign: 'center',
                boxShadow: '0 10px 30px rgba(16, 185, 129, 0.5)'
              }}>
                <h3 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
                  🎉 IMPROVEMENT DETECTED!
                  <span style={{ marginLeft: '15px', fontSize: '2rem' }}>
                    {(leftResult.analysis_summary.average_risk - rightResult.analysis_summary.average_risk).toFixed(1)}% ↓
                  </span>
                </h3>
              </div>
            )}

            {rightResult.analysis_summary.average_risk > leftResult.analysis_summary.average_risk && (
              <div style={{
                marginTop: '30px',
                padding: '20px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                borderRadius: '15px',
                textAlign: 'center',
                boxShadow: '0 10px 30px rgba(239, 68, 68, 0.5)'
              }}>
                <h3 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
                  ⚠️ RISK INCREASED
                  <span style={{ marginLeft: '15px', fontSize: '2rem' }}>
                    {(rightResult.analysis_summary.average_risk - leftResult.analysis_summary.average_risk).toFixed(1)}% ↑
                  </span>
                </h3>
              </div>
            )}

            {leftResult.analysis_summary.average_risk === rightResult.analysis_summary.average_risk && (
              <div style={{
                marginTop: '30px',
                padding: '20px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                borderRadius: '15px',
                textAlign: 'center',
                boxShadow: '0 10px 30px rgba(6, 182, 212, 0.5)'
              }}>
                <h3 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
                  ➡️ NO CHANGE IN AVERAGE RISK
                </h3>
              </div>
            )}
          </div>

          {/* Detailed Comparison Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
            {/* Left Detailed */}
            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              padding: '30px',
              borderRadius: '20px',
              border: '2px solid rgba(6, 182, 212, 0.3)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}>
              <h4 style={{ color: '#06b6d4', margin: '0 0 20px 0', fontSize: '1.3rem' }}>
                📊 Video A Details
              </h4>
              <div style={{ color: '#cbd5e1', lineHeight: '2.2' }}>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Max Risk:</span>
                  <strong style={{ color: 'white' }}>{leftResult.analysis_summary.max_risk}%</strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Min Risk:</span>
                  <strong style={{ color: 'white' }}>{leftResult.analysis_summary.min_risk}%</strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>High Risk Frames:</span>
                  <strong style={{ color: '#ef4444' }}>{leftResult.analysis_summary.high_risk_count}</strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Medium Risk Frames:</span>
                  <strong style={{ color: '#f97316' }}>{leftResult.analysis_summary.medium_risk_count}</strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Low Risk Frames:</span>
                  <strong style={{ color: '#10b981' }}>{leftResult.analysis_summary.low_risk_count}</strong>
                </p>
              </div>
            </div>

            {/* Right Detailed */}
            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              padding: '30px',
              borderRadius: '20px',
              border: '2px solid rgba(139, 92, 246, 0.3)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}>
              <h4 style={{ color: '#8b5cf6', margin: '0 0 20px 0', fontSize: '1.3rem' }}>
                📊 Video B Details
              </h4>
              <div style={{ color: '#cbd5e1', lineHeight: '2.2' }}>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Max Risk:</span>
                  <strong style={{ color: 'white' }}>{rightResult.analysis_summary.max_risk}%</strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Min Risk:</span>
                  <strong style={{ color: 'white' }}>{rightResult.analysis_summary.min_risk}%</strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>High Risk Frames:</span>
                  <strong style={{ color: '#ef4444' }}>{rightResult.analysis_summary.high_risk_count}</strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Medium Risk Frames:</span>
                  <strong style={{ color: '#f97316' }}>{rightResult.analysis_summary.medium_risk_count}</strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Low Risk Frames:</span>
                  <strong style={{ color: '#10b981' }}>{rightResult.analysis_summary.low_risk_count}</strong>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default ComparisonMode;