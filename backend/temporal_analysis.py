import time
from collections import deque
from injury_model import injury_estimator
from projection_engine import calculate_projection

class StrategyRecommendationEngine:
    """Intelligently analyzes temporal session data to output coaching decisions."""
    @staticmethod
    def generate_recommendation(fatigue_score, injury_prob, trend, risk_scores, session_duration):
        # Default
        rec = "Continue training"
        reason = "Stable biomechanics and acceptable fatigue."
        
        # High Risk Overrides
        if injury_prob > 0.65 or fatigue_score > 85:
            rec = "Substitute player"
            if injury_prob > 0.65:
                reason = f"Critical injury probability detected ({(injury_prob*100):.0f}%)."
            else:
                reason = "Severe fatigue saturation reached."
            return {"recommendation": rec, "reason": reason}
            
        # Medium Risk / Deteriorating Trend
        if trend == "degrading":
            if fatigue_score > 60:
                rec = "Reduce intensity"
                reason = "Form is deteriorating rapidly under accumulating fatigue."
            elif injury_prob > 0.4:
                rec = "Monitor closely"
                reason = f"Deteriorating kinematics pushing injury risk to {(injury_prob*100):.0f}%."
                
        # Time-based / Fatigue-based
        elif fatigue_score > 50 and session_duration > 180: # 3 minutes approx
            rec = "Consider rotation"
            reason = "Prolonged exertion leading to elevated baseline fatigue."

        return {"recommendation": rec, "reason": reason}

class TemporalState:
    def __init__(self, max_frames=40):
        self.max_frames = max_frames
        self.history = deque(maxlen=max_frames)
        self.session_start = None
        self.baseline_frames = []
        self.baseline_stats = None
        self.last_recommendation = {}
        
    def add_frame(self, frame_data, timestamp=None):
        if timestamp is None:
            timestamp = time.time()
        frame_data['timestamp'] = timestamp
        
        if self.session_start is None:
            self.session_start = timestamp
            
        if timestamp - self.session_start <= 30.0 and len(self.baseline_frames) < 300:
            self.baseline_frames.append(frame_data)
        elif self.baseline_stats is None and len(self.baseline_frames) > 0:
            def get_stats(data):
                valid = [x for x in data if x is not None]
                if not valid: return 0.0, 1.0
                mean = sum(valid) / len(valid)
                variance = sum((x - mean)**2 for x in valid) / len(valid)
                std = variance**0.5 if variance > 0 else 1.0
                return mean, std
            
            knees = [f['left_angle'] for f in self.baseline_frames if f['left_angle'] is not None] + \
                    [f['right_angle'] for f in self.baseline_frames if f['right_angle'] is not None]
            k_mean, k_std = get_stats(knees)
            a_mean, a_std = get_stats([f['asymmetry'] for f in self.baseline_frames])
            p_mean, p_std = get_stats([f['posture'] for f in self.baseline_frames])
            
            self.baseline_stats = {
                'knee_mean': k_mean, 'knee_std': k_std,
                'asym_mean': a_mean, 'asym_std': a_std,
                'post_mean': p_mean, 'post_std': p_std
            }
            
        self.history.append(frame_data)
        
    def analyze(self, adaptive_mode=False):
        # We need at least two frames to calculate any meaningful differences
        if len(self.history) < 2:
            return {
                "fatigue_score": 0,
                "trend_direction": "stable",
                "injury_probability": 0.0,
                "baseline_comparison": {
                    "knee_deviation": 0.0,
                    "stride_deviation": 0.0,
                    "posture_deviation": 0.0,
                    "status": "collecting"
                }
            }
            
        left_angles = [f['left_angle'] for f in self.history if f['left_angle'] is not None]
        right_angles = [f['right_angle'] for f in self.history if f['right_angle'] is not None]
        asymmetries = [f['asymmetry'] for f in self.history if f['asymmetry'] is not None]
        postures = [f['posture'] for f in self.history if f['posture'] is not None]
        risk_scores = [f['risk_score'] for f in self.history if f['risk_score'] is not None]
        timestamps = [f['timestamp'] for f in self.history]
        
        fatigue_score = 0.0
        degradations = 0
        improvements = 0

        def fast_stats(data):
            n = len(data)
            if n < 2: return (data[0] if n==1 else 0.0), 0.0, 0.0
            
            # 1. Moving mean
            mean = sum(data) / n
            
            # 2. Instability variance
            variance = sum((x - mean)**2 for x in data) / n
            
            # 3. Slope of trend (pure python linear regression)
            x_mean = (n - 1) / 2.0
            num = sum((i - x_mean) * (data[i] - mean) for i in range(n))
            den = sum((i - x_mean)**2 for i in range(n))
            slope = num / den if den != 0 else 0.0
            
            return mean, variance, slope

        left_mean, left_var, left_slope = fast_stats(left_angles)
        right_mean, right_var, right_slope = fast_stats(right_angles)
        asym_mean, asym_var, asym_slope = fast_stats(asymmetries)
        post_mean, post_var, post_slope = fast_stats(postures)

        # --- High-Performance Fatigue Score ---
        # "weighted combination of: variance + slope + asymmetry drift"
        
        knee_variance = max(left_var, right_var)
        knee_slope = min(left_slope, right_slope) # Negative slope implies valgus collapse over the window
        asym_drift = asym_slope # Positive slope implies worsening asymmetry
        
        var_weight = 0.5
        slope_weight = 15.0 # Penalty per degree of negative slope per frame
        drift_weight = 20.0 # Penalty per percent of asymmetry drift per frame
        
        knee_slope_val = abs(knee_slope * slope_weight) if knee_slope < -0.1 else 0
        asym_drift_val = (asym_drift * drift_weight) if asym_drift > 0.1 else 0
        
        fatigue_score += (knee_variance * var_weight) + knee_slope_val + asym_drift_val
        
        # Trend tracking for AI Strategy Engine
        if knee_slope < -0.5 or asym_drift > 0.5 or post_slope < -0.01:
            degradations += 1
        elif knee_slope > 0.5 and asym_drift < -0.5:
            improvements += 1

        # Fallback safety bounds
        if post_mean < 0.75: fatigue_score += 15
        if asym_mean > 15.0: fatigue_score += 15

        # Adaptive Mode Z-Score Replace
        baseline_comparison = {
            "knee_deviation": 0.0,
            "stride_deviation": 0.0,
            "posture_deviation": 0.0,
            "status": "collecting" if self.baseline_stats is None else "ready"
        }
        
        if adaptive_mode and self.baseline_stats is not None:
            baseline_comparison["status"] = "active"
            recent = self.history[-1]
            k_val = min(recent['left_angle'] or 180, recent['right_angle'] or 180)
            a_val = recent['asymmetry'] or 0.0
            p_val = recent['posture'] or 1.0
            
            k_mean, k_std = self.baseline_stats['knee_mean'], self.baseline_stats['knee_std']
            a_mean, a_std = self.baseline_stats['asym_mean'], self.baseline_stats['asym_std']
            p_mean, p_std = self.baseline_stats['post_mean'], self.baseline_stats['post_std']
            
            baseline_comparison["knee_deviation"] = round(((k_val - k_mean) / max(k_mean, 1.0)) * 100, 2)
            baseline_comparison["stride_deviation"] = round(((a_val - a_mean) / max(a_mean, 0.01)) * 100, 2)
            baseline_comparison["posture_deviation"] = round(((p_val - p_mean) / max(p_mean, 0.01)) * 100, 2)
            
            k_z = (k_val - k_mean) / k_std
            a_z = (a_val - a_mean) / a_std
            p_z = (p_val - p_mean) / p_std
            
            z_risk = 0.0
            if k_z < -2.0: 
                z_risk += abs(k_z) * 5
                degradations += 1
            if p_z < -2.0: 
                z_risk += abs(p_z) * 5
                degradations += 1
            if a_z > 2.0: 
                z_risk += abs(a_z) * 5
                degradations += 1
            
            fatigue_score = z_risk

        # Finalize Trend
        if degradations > improvements and degradations >= 1:
            trend_direction = "degrading"
        elif improvements > degradations and improvements >= 1:
            trend_direction = "improving"
        else:
            trend_direction = "stable"

        # Cap fatigue score at 100 max
        fatigue_score = min(max(fatigue_score, 0), 100)

        # Calculate Injury Probability using ML Model
        k_var_mean = sum((x - k_mean)**2 for x in left_angles + right_angles) / len(left_angles + right_angles) if (left_angles or right_angles) and k_mean else 0
        current_k_mean = sum(left_angles + right_angles) / len(left_angles + right_angles) if (left_angles or right_angles) else 180.0
        current_a_mean = sum(asymmetries) / len(asymmetries) if asymmetries else 0.0
        current_p_mean = sum(postures) / len(postures) if postures else 1.0
        
        # Determine actual fatigue accumulation rate for the projection engine
        fatigue_slope = max(0.0, asym_slope + (abs(knee_slope) if knee_slope < 0 else 0.0))
        
        ml_prediction = injury_estimator.predict(
            knee_variance=k_var_mean,
            knee_mean=current_k_mean,
            stride_asymmetry=current_a_mean,
            posture_score=current_p_mean,
            fatigue_index=fatigue_score,
            elbow_flare_score=sum(f.get('elbow_score', 0) for f in self.history) / len(self.history) if self.history else 0,
            shoulder_asymmetry=sum(f.get('shoulder_asym', 0) for f in self.history) / len(self.history) if self.history else 0,
            wrist_deviation=sum(f.get('wrist_dev', 0) for f in self.history) / len(self.history) if self.history else 0
        )
        
        injury_prob = ml_prediction["injury_probability"]
        ml_risk_level = ml_prediction["risk_level"]
        
        # --- Forward Injury Projection ---
        current_features = [k_var_mean, current_k_mean, current_a_mean, current_p_mean]
        projection = calculate_projection(injury_estimator, current_features, fatigue_score, fatigue_slope)
        
        # --- Generate Coaching Recommendation ---
        session_duration = timestamps[-1] - self.session_start if timestamps and self.session_start else 0
        coaching = StrategyRecommendationEngine.generate_recommendation(
            fatigue_score, 
            injury_prob, 
            trend_direction, 
            risk_scores, 
            session_duration
        )
        self.last_recommendation = coaching

        return {
            "fatigue_score": int(fatigue_score),
            "trend_direction": trend_direction,
            "injury_probability": injury_prob,
            "ml_risk_level": ml_risk_level,
            "baseline_comparison": baseline_comparison,
            "coaching_recommendation": coaching,
            "projection": projection
        }

class TemporalEngine:
    SESSION_TTL_SECONDS = 30 * 60  # 30 minutes of inactivity
    
    def __init__(self):
        self.sessions = {}
        self._last_accessed = {}
        
    def _cleanup_stale_sessions(self):
        """Remove sessions inactive for more than SESSION_TTL_SECONDS."""
        now = time.time()
        stale = [sid for sid, ts in self._last_accessed.items() if now - ts > self.SESSION_TTL_SECONDS]
        for sid in stale:
            del self.sessions[sid]
            del self._last_accessed[sid]
        
    def get_session(self, session_id):
        if session_id not in self.sessions:
            self.sessions[session_id] = TemporalState()
            # Periodically cleanup stale sessions (every new session creation)
            self._cleanup_stale_sessions()
        self._last_accessed[session_id] = time.time()
        return self.sessions[session_id]
        
    def process_frame(self, session_id, risk_assessment, adaptive_mode=False):
        session = self.get_session(session_id)
        
        biomechanics = risk_assessment.get('biomechanics', {})
        knee_valgus = biomechanics.get('knee_valgus', {})
        
        def parse_angle(val):
            if isinstance(val, str) and '°' in val:
                try:
                    return float(val.replace('°', ''))
                except (ValueError, TypeError):
                    return None
            return None
            
        left_angle = parse_angle(knee_valgus.get('left_angle'))
        right_angle = parse_angle(knee_valgus.get('right_angle'))
        
        asym_str = biomechanics.get('stride_asymmetry', {}).get('asymmetry_percent', '0%')
        try:
            asymmetry = float(asym_str.replace('%', ''))
        except (ValueError, TypeError):
            asymmetry = 0.0
            
        posture_score = biomechanics.get('posture', {}).get('posture_score', 1.0)
        risk_score = risk_assessment.get('risk_score', 0)
        
        # Extract new biomechanics
        elbow = biomechanics.get('elbow_flare', {})
        elbow_l = parse_angle(elbow.get('left_angle'))
        elbow_r = parse_angle(elbow.get('right_angle'))
        elbow_score = 0.0
        if elbow_l is not None and elbow_r is not None:
            avg_elbow = (elbow_l + elbow_r) / 2
            elbow_score = max(0, 90 - avg_elbow)  # deviation from safe 90°
        
        shoulder_asym = biomechanics.get('shoulder_symmetry', {}).get('asymmetry_percent', 0)
        if isinstance(shoulder_asym, str):
            try: shoulder_asym = float(shoulder_asym.replace('%', ''))
            except: shoulder_asym = 0.0
        
        wrist = biomechanics.get('wrist_alignment', {})
        wrist_l = parse_angle(wrist.get('left_angle'))
        wrist_r = parse_angle(wrist.get('right_angle'))
        wrist_dev = 0.0
        if wrist_l is not None and wrist_r is not None:
            avg_wrist = (wrist_l + wrist_r) / 2
            wrist_dev = abs(170 - avg_wrist)  # deviation from neutral 170°
        
        frame_data = {
            'left_angle': left_angle,
            'right_angle': right_angle,
            'asymmetry': asymmetry,
            'posture': posture_score,
            'risk_score': risk_score,
            'elbow_score': elbow_score,
            'shoulder_asym': shoulder_asym,
            'wrist_dev': wrist_dev
        }
        
        session.add_frame(frame_data)
        return session.analyze(adaptive_mode=adaptive_mode)

temporal_engine = TemporalEngine()
