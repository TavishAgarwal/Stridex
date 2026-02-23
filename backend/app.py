import asyncio
import logging
import threading
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import cv2
import mediapipe as mp
import numpy as np
import base64
import tempfile
import os
import json
import time
from pydantic import BaseModel
from biomechanics import calculate_injury_risk
from temporal_analysis import temporal_engine
from pdf_generator import generate_session_report

logger = logging.getLogger("stridex")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

app = FastAPI()

SESSION_HISTORY_FILE = "session_history.json"
session_lock = threading.Lock()

# CORS configuration
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MediaPipe Tasks API
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

base_options = python.BaseOptions(model_asset_path='pose_landmarker_full.task')
options = vision.PoseLandmarkerOptions(
    base_options=base_options,
    output_segmentation_masks=False,
    num_poses=2
)
detector = vision.PoseLandmarker.create_from_options(options)

@app.get("/")
def read_root():
    return {
        "message": "STRIDEX-AI Backend API",
        "version": "2.0.0",
        "status": "running"
    }

@app.post("/analyze-frame")
async def analyze_frame(file: UploadFile = File(...), session_id: str = Form("default"), adaptive_mode: bool = Form(False), sport: str = Form("default")):
    """Analyze a single frame for real-time detection of up to 2 athletes"""
    try:
        # Read image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image")
        
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        
        # Process with MediaPipe Tasks API
        detection_result = await asyncio.to_thread(detector.detect, mp_image)
        
        if not detection_result.pose_landmarks:
            return JSONResponse({
                "success": False,
                "pose_detected": False,
                "message": "No pose detected in frame"
            })
            
        # Spatial Sorter: Order athletes left-to-right to maintain stable IDs
        athletes_pts = []
        for landmarks in detection_result.pose_landmarks:
            avg_x = sum([lm.x for lm in landmarks]) / len(landmarks)
            athletes_pts.append((avg_x, landmarks))
            
        athletes_pts.sort(key=lambda x: x[0])
        
        athletes_data = []
        for i, (avg_x, landmarks) in enumerate(athletes_pts):
            athlete_internal_id = f"{session_id}_p{i+1}"
            
            # Calculate injury risk with sport rules
            risk_assessment = calculate_injury_risk(landmarks, sport)
            temporal_results = temporal_engine.process_frame(athlete_internal_id, risk_assessment, adaptive_mode)
            
            # Extract raw landmarks for frontend Canvas rendering
            landmarks_data = []
            for lm in landmarks:
                vis = getattr(lm, 'visibility', 0.0)
                landmarks_data.append({"x": lm.x, "y": lm.y, "z": lm.z, "visibility": vis if vis is not None else 0.0})
                
            athletes_data.append({
                "athlete_id": athlete_internal_id,
                "risk_assessment": risk_assessment,
                "temporal_analysis": temporal_results,
                "landmarks": landmarks_data
            })
            
        return JSONResponse({
            "success": True,
            "pose_detected": True,
            "athletes": athletes_data
        })
            
    except Exception as e:
        logger.error(f"Error in analyze_frame: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-video-enhanced")
async def analyze_video_enhanced(file: UploadFile = File(...)):
    """Enhanced video analysis with frame samples using Tasks API"""
    temp_file = None
    temp_path = None
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_file:
            contents = await file.read()
            temp_file.write(contents)
            temp_path = temp_file.name
        
        # Open video
        cap = cv2.VideoCapture(temp_path)
        
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Could not open video file")
        
        # Get video info
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0
        
        logger.info(f"Processing video: {total_frames} frames, {fps} fps, {duration:.2f}s")
        
        frame_results = []
        timeline = []
        frame_count = 0
        
        # Process every 5th frame for performance
        frame_skip = 5
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            
            # Skip frames for performance
            if frame_count % frame_skip != 0:
                continue
            
            # Process frame using Tasks API detector
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            detection_result = await asyncio.to_thread(detector.detect, mp_image)
            
            if detection_result.pose_landmarks:
                # Analyze the first detected person
                landmarks = detection_result.pose_landmarks[0]
                risk_assessment = calculate_injury_risk(landmarks)
                
                # Store results
                timestamp = round(frame_count / fps, 2)
                frame_data = {
                    "frame_number": frame_count,
                    "timestamp": timestamp,
                    "risk_score": risk_assessment['risk_score'],
                    "risk_level": risk_assessment['risk_level'],
                    "risk_factors": risk_assessment['risk_factors'],
                    "biomechanics": risk_assessment['biomechanics'],
                    "overall_confidence": risk_assessment.get('overall_confidence', 0),
                    "action": risk_assessment.get('action', '')
                }
                
                frame_results.append(frame_data)
                timeline.append({
                    "timestamp": timestamp,
                    "risk_score": risk_assessment['risk_score'],
                    "risk_level": risk_assessment['risk_level']
                })
        
        cap.release()
        
        # Calculate summary statistics
        if frame_results:
            risk_scores = [f['risk_score'] for f in frame_results]
            n = len(risk_scores)
            avg_risk = round(sum(risk_scores) / n, 1)
            max_risk = max(risk_scores)
            min_risk = min(risk_scores)
            
            high_risk_count = sum(1 for f in frame_results if f['risk_level'] == 'HIGH')
            medium_risk_count = sum(1 for f in frame_results if f['risk_level'] == 'MEDIUM')
            low_risk_count = sum(1 for f in frame_results if f['risk_level'] == 'LOW')
            
            # --- Overall Video Score (0-100, higher = better form) ---
            # Component 1: Inverse average risk (0-40 pts)
            base_score = max(0, 40 - (avg_risk * 0.4))
            
            # Component 2: Risk distribution penalty (0-25 pts)
            high_pct = high_risk_count / n if n > 0 else 0
            med_pct = medium_risk_count / n if n > 0 else 0
            dist_score = max(0, 25 - (high_pct * 50) - (med_pct * 15))
            
            # Component 3: Consistency bonus — low variance = stable form (0-20 pts)
            mean_r = sum(risk_scores) / n
            variance = sum((x - mean_r) ** 2 for x in risk_scores) / n
            consistency_score = max(0, 20 - min(variance * 0.05, 20))
            
            # Component 4: Confidence bonus (0-15 pts)
            avg_conf = sum(f.get('overall_confidence', 0.5) for f in frame_results) / n
            confidence_score = round(avg_conf * 15, 1)
            
            overall_video_score = int(min(100, round(base_score + dist_score + consistency_score + confidence_score)))
            
            # --- Descriptive risk category (replaces letter grade) ---
            if overall_video_score >= 85:
                risk_category = "Low Risk – Great Form"
                risk_color = "green"
                what_this_means = "Your movement quality is excellent. Your joints stay well-aligned throughout the video and there are no concerning compensations. This level of form significantly reduces your injury risk during training."
                motivational = "You're in the top tier! Keep doing what you're doing — your body mechanics are working exactly as they should."
            elif overall_video_score >= 70:
                risk_category = "Mild Risk – Good with Notes"
                risk_color = "blue"
                what_this_means = "Your overall form is solid, but we spotted some minor areas that could use attention. These aren't urgent injury concerns, but addressing them will help you train harder and safer over time."
                motivational = "Strong foundation! A few tweaks will take you from good to elite."
            elif overall_video_score >= 50:
                risk_category = "Moderate Risk – Needs Attention"
                risk_color = "yellow"
                what_this_means = "We've identified movement patterns that could lead to strain or injury if not corrected. Your body is compensating in ways that put extra stress on certain joints. The good news: these are fixable with targeted exercises."
                motivational = "You've got the drive — now let's refine the mechanics. Small corrections lead to big gains."
            elif overall_video_score >= 30:
                risk_category = "Elevated Risk – Action Required"
                risk_color = "orange"
                what_this_means = "Multiple biomechanical concerns were detected throughout your video. Your movement patterns show stress on joints and muscles that could lead to overuse injuries. We strongly recommend incorporating the corrective exercises below before your next session."
                motivational = "Every expert was once a beginner. These corrections will protect you and unlock better performance."
            else:
                risk_category = "High Risk – Immediate Correction Needed"
                risk_color = "red"
                what_this_means = "Your movement shows significant form breakdowns that put you at high risk for acute injury. Please review the specific areas flagged below and consider working with a coach or physiotherapist to address these patterns before continuing at this intensity."
                motivational = "Your safety comes first. Addressing these issues now will prevent setbacks later."
            
            summary = {
                "overall_video_score": overall_video_score,
                "risk_category": risk_category,
                "risk_color": risk_color,
                "what_this_means": what_this_means,
                "motivational": motivational,
                "average_risk": avg_risk,
                "max_risk": max_risk,
                "min_risk": min_risk,
                "frames_analyzed": n,
                "high_risk_count": high_risk_count,
                "medium_risk_count": medium_risk_count,
                "low_risk_count": low_risk_count,
                "score_breakdown": {
                    "form_quality": {"score": round(base_score, 1), "max": 40, "label": "How well you maintained proper joint angles and posture"},
                    "risk_distribution": {"score": round(dist_score, 1), "max": 25, "label": "What percentage of your movement was in a safe range"},
                    "consistency": {"score": round(consistency_score, 1), "max": 20, "label": "How stable your form stayed over time (lower is better)"},
                    "detection_confidence": {"score": round(confidence_score, 1), "max": 15, "label": "How clearly the camera could track your body positions"}
                }
            }
        else:
            summary = {
                "overall_video_score": 0,
                "risk_category": "No Data",
                "risk_color": "gray",
                "what_this_means": "No pose was detected in this video. Try recording with better lighting, a clearer background, and ensure your full body is visible.",
                "motivational": "",
                "average_risk": 0, "max_risk": 0, "min_risk": 0, "frames_analyzed": 0,
                "high_risk_count": 0, "medium_risk_count": 0, "low_risk_count": 0,
                "score_breakdown": {}
            }
        
        # --- Aggregate Biomechanics for Whole Video ---
        video_biomechanics = {}
        recommendations = []
        strengths = []
        priority_ranking = []
        fatigue_projection = {}
        timeline_events = []
        
        if frame_results:
            # Parse all biomechanics across the video
            left_angles = []
            right_angles = []
            asymmetries = []
            posture_scores = []
            
            for f in frame_results:
                bio = f.get('biomechanics', {})
                kv = bio.get('knee_valgus', {})
                sa = bio.get('stride_asymmetry', {})
                ps = bio.get('posture', {})
                
                for angle_str, target in [(kv.get('left_angle'), left_angles), (kv.get('right_angle'), right_angles)]:
                    if angle_str and isinstance(angle_str, str) and '°' in angle_str:
                        try:
                            target.append(float(angle_str.replace('°', '')))
                        except (ValueError, TypeError):
                            pass
                
                asym_str = sa.get('asymmetry_percent', '0%')
                if isinstance(asym_str, str):
                    try:
                        asymmetries.append(float(asym_str.replace('%', '')))
                    except (ValueError, TypeError):
                        pass
                
                p_val = ps.get('posture_score')
                if p_val is not None:
                    try:
                        posture_scores.append(float(p_val))
                    except (ValueError, TypeError):
                        pass
            
            # Compute aggregates
            def safe_stats(data):
                if not data:
                    return {"avg": None, "min": None, "max": None, "trend": "unknown"}
                avg = round(sum(data) / len(data), 1)
                mn = round(min(data), 1)
                mx = round(max(data), 1)
                q = max(1, len(data) // 4)
                first_q = sum(data[:q]) / q
                last_q = sum(data[-q:]) / q
                diff = last_q - first_q
                if abs(diff) < 1.0: trend = "stable"
                elif diff > 0: trend = "worsening"
                else: trend = "improving"
                return {"avg": avg, "min": mn, "max": mx, "trend": trend}
            
            left_stats = safe_stats(left_angles)
            right_stats = safe_stats(right_angles)
            asym_stats = safe_stats(asymmetries)
            posture_stats = safe_stats(posture_scores)
            
            factor_counts = {}
            for f in frame_results:
                for rf in f.get('risk_factors', []):
                    name = rf.get('factor', 'Unknown')
                    factor_counts[name] = factor_counts.get(name, 0) + 1
            top_factors = sorted(factor_counts.items(), key=lambda x: x[1], reverse=True)
            
            # Simplified biomechanics with human-readable descriptions
            all_knees = left_angles + right_angles
            avg_knee = sum(all_knees) / len(all_knees) if all_knees else 180
            knee_risk_frames = sum(1 for a in all_knees if a < 160)
            knee_risk_pct = (knee_risk_frames / len(all_knees) * 100) if all_knees else 0
            avg_asym = sum(asymmetries) / len(asymmetries) if asymmetries else 0
            high_asym_frames = sum(1 for a in asymmetries if a > 10)
            avg_posture = sum(posture_scores) / len(posture_scores) if posture_scores else 1.0
            poor_posture_frames = sum(1 for p in posture_scores if p < 0.7)
            poor_posture_pct = (poor_posture_frames / len(posture_scores) * 100) if posture_scores else 0
            
            # Human-readable knee description
            if avg_knee >= 170:
                knee_plain = "Your knees stayed well-aligned throughout — excellent tracking."
                knee_status = "good"
            elif avg_knee >= 160:
                knee_plain = "Your knees mostly tracked well, with occasional inward dipping. Minor correction needed."
                knee_status = "fair"
            else:
                knee_plain = "Your knees frequently collapsed inward (valgus), which puts stress on your ACL and meniscus. This is the most important thing to fix."
                knee_status = "concern"
            
            # Human-readable asymmetry description
            if avg_asym < 5:
                asym_plain = "Your left and right sides are well-balanced — no significant asymmetry detected."
                asym_status = "good"
            elif avg_asym < 10:
                asym_plain = "There's a mild imbalance between your left and right sides. Not urgent but worth monitoring."
                asym_status = "fair"
            else:
                asym_plain = "A noticeable left-right imbalance was detected. This can lead to overuse injuries on the dominant side."
                asym_status = "concern"
            
            # Human-readable posture description
            if avg_posture >= 0.85:
                posture_plain = "Your upper body alignment is strong — shoulders stayed squared and spine neutral."
                posture_status = "good"
            elif avg_posture >= 0.7:
                posture_plain = "Your posture was generally good but showed some rounding or leaning, especially later in the video."
                posture_status = "fair"
            else:
                posture_plain = "Significant upper body breakdown detected — forward lean, rounded shoulders, or lateral tilt. Core strength work is recommended."
                posture_status = "concern"
            
            video_biomechanics = {
                "knee_valgus": {
                    "title": "Knee Alignment",
                    "plain_english": knee_plain,
                    "status": knee_status,
                    "left_knee": {"avg_angle": left_stats["avg"], "min_angle": left_stats["min"], "max_angle": left_stats["max"], "trend": left_stats["trend"]},
                    "right_knee": {"avg_angle": right_stats["avg"], "min_angle": right_stats["min"], "max_angle": right_stats["max"], "trend": right_stats["trend"]},
                    "frames_at_risk": knee_risk_frames,
                    "total_measurements": len(all_knees),
                    "tooltip": "Knee valgus is when your knees cave inward during movement. Healthy range is 170-180°. Below 160° indicates risk."
                },
                "stride_asymmetry": {
                    "title": "Left-Right Balance",
                    "plain_english": asym_plain,
                    "status": asym_status,
                    "avg_asymmetry": asym_stats["avg"],
                    "max_asymmetry": asym_stats["max"],
                    "trend": asym_stats["trend"],
                    "frames_above_10pct": high_asym_frames,
                    "tooltip": "Stride asymmetry measures the difference in movement between your left and right sides. Under 5% is ideal, over 10% needs attention."
                },
                "posture": {
                    "title": "Upper Body Alignment",
                    "plain_english": posture_plain,
                    "status": posture_status,
                    "avg_score": posture_stats["avg"],
                    "min_score": posture_stats["min"],
                    "trend": posture_stats["trend"],
                    "frames_at_risk": poor_posture_frames,
                    "tooltip": "Posture score measures how well your shoulders, spine, and hips stay aligned. 1.0 is perfect, below 0.7 indicates breakdown."
                },
                "most_common_risk_factors": [{"factor": name, "occurrences": count, "frequency_pct": round(count / n * 100, 1)} for name, count in top_factors[:5]]
            }
            
            # --- Performance Strengths ---
            if knee_status == "good":
                strengths.append({"area": "Knee Tracking", "icon": "🦵", "message": "Excellent knee alignment maintained throughout. Your lower body mechanics are protecting your joints well."})
            if asym_status == "good":
                strengths.append({"area": "Bilateral Balance", "icon": "⚖️", "message": "Great symmetry between left and right sides. This indicates balanced muscle development and reduces overuse injury risk."})
            if posture_status == "good":
                strengths.append({"area": "Core Stability", "icon": "🎯", "message": "Strong upper body alignment. Your core is doing its job stabilizing your spine during movement."})
            if variance < 50:
                strengths.append({"area": "Form Consistency", "icon": "📊", "message": "Your movement quality stayed consistent across the video. This shows good body awareness and control."})
            if low_risk_count > n * 0.7:
                strengths.append({"area": "Safe Movement Zone", "icon": "🛡️", "message": f"{round(low_risk_count / n * 100)}% of your movement was in the low-risk zone. Keep training at this quality level."})
            if not strengths:
                strengths.append({"area": "Effort & Dedication", "icon": "💪", "message": "Recording and analyzing your form shows commitment. The corrections below will help you improve quickly."})
            
            # --- Recommendations (enhanced with priority) ---
            priority_score = 0
            if all_knees and knee_risk_pct > 40:
                priority_score += 1
                recommendations.append({
                    "area": "Knee Alignment", "severity": "HIGH", "icon": "🦵", "priority": priority_score,
                    "finding": f"Your knees caved inward in {knee_risk_pct:.0f}% of frames. Average knee angle: {avg_knee:.0f}° (healthy: 170°+).",
                    "what_to_do": "Before every workout, do the activation exercises below. During squats and lunges, actively push your knees outward over your pinky toes.",
                    "exercises": ["Banded Clamshells (3×15)", "Lateral Band Walks (3×12 each side)", "Single-Leg RDL (3×10)", "Wall Sits with band (3×30s)"]
                })
            elif all_knees and knee_risk_pct > 15:
                priority_score += 1
                recommendations.append({
                    "area": "Knee Alignment", "severity": "MEDIUM", "icon": "🦵", "priority": priority_score,
                    "finding": f"Mild knee inward collapse detected in {knee_risk_pct:.0f}% of frames.",
                    "what_to_do": "Add glute activation to your warm-up. Place a light band above your knees during squats to build awareness.",
                    "exercises": ["Glute Bridges (3×15)", "Monster Walks (2×10)", "Goblet Squats with pause (3×8)"]
                })
            
            if asymmetries and sum(1 for a in asymmetries if a > 10) / len(asymmetries) > 0.3:
                priority_score += 1
                recommendations.append({
                    "area": "Left-Right Balance", "severity": "HIGH", "icon": "⚖️", "priority": priority_score,
                    "finding": f"Significant left-right imbalance ({avg_asym:.1f}% avg). One side is doing more work than the other.",
                    "what_to_do": "Add unilateral (single-leg) exercises to address the weaker side. Start with your weaker leg first each set.",
                    "exercises": ["Single-Leg Balance (3×30s each)", "Bulgarian Split Squats (3×10 each)", "Step-Ups (3×12 each)", "Foam Roll IT band & hip flexors"]
                })
            elif asymmetries and avg_asym > 5:
                priority_score += 1
                recommendations.append({
                    "area": "Left-Right Balance", "severity": "MEDIUM", "icon": "⚖️", "priority": priority_score,
                    "finding": f"Mild asymmetry detected ({avg_asym:.1f}% avg).",
                    "what_to_do": "Focus on equal depth and tempo for each leg. Use a mirror for form checks.",
                    "exercises": ["Lunges with even depth (3×10 each)", "Single-Leg Glute Bridges (3×12 each)"]
                })
            
            if posture_scores and poor_posture_pct > 30:
                priority_score += 1
                recommendations.append({
                    "area": "Upper Body Alignment", "severity": "HIGH", "icon": "🎯", "priority": priority_score,
                    "finding": f"Posture breakdown in {poor_posture_pct:.0f}% of frames. Your torso lost alignment as the movement continued.",
                    "what_to_do": "Strengthen your core and upper back. Think 'chest up, shoulders back' as a cue during every rep.",
                    "exercises": ["Dead Bugs (3×10 each side)", "Bird Dogs (3×10 each side)", "Band Pull-Aparts (3×15)", "Planks (3×45s)", "Face Pulls (3×12)"]
                })
            elif posture_scores and avg_posture < 0.85:
                priority_score += 1
                recommendations.append({
                    "area": "Upper Body Alignment", "severity": "MEDIUM", "icon": "🎯", "priority": priority_score,
                    "finding": f"Minor posture drift detected (avg score: {avg_posture:.2f}/1.0).",
                    "what_to_do": "Add core bracing to your warm-up. Take a deep breath and brace your core before each rep.",
                    "exercises": ["Plank Hold (3×30s)", "Pallof Press (3×10 each side)"]
                })
            
            # Fatigue-based recommendation
            form_worsening = posture_stats["trend"] == "worsening" or (left_stats["trend"] == "worsening" and right_stats["trend"] == "worsening")
            if form_worsening:
                priority_score += 1
                recommendations.append({
                    "area": "Fatigue Management", "severity": "MEDIUM", "icon": "⏱️", "priority": priority_score,
                    "finding": "Your form got worse as the video progressed — a clear sign of fatigue.",
                    "what_to_do": "Your body is telling you it's tired. Add more rest between sets, or reduce volume. Quality reps > quantity.",
                    "exercises": ["Add 30-60s rest between sets", "Reduce working sets by 20%", "Focus on RPE 7-8 instead of max effort"]
                })
            
            if not recommendations:
                recommendations.append({
                    "area": "Overall Assessment", "severity": "LOW", "icon": "✅", "priority": 0,
                    "finding": "No significant biomechanical issues detected.",
                    "what_to_do": "Your form is clean! Consider progressively increasing intensity to keep challenging yourself.",
                    "exercises": []
                })
            
            # --- Priority Ranking ---
            priority_ranking = sorted(
                [r for r in recommendations if r["severity"] != "LOW"],
                key=lambda x: 0 if x["severity"] == "HIGH" else 1
            )
            for i, pr in enumerate(priority_ranking):
                pr["priority"] = i + 1
            
            # --- Fatigue Projection ---
            if len(risk_scores) >= 4:
                q = max(1, len(risk_scores) // 4)
                q1_avg = sum(risk_scores[:q]) / q
                q4_avg = sum(risk_scores[-q:]) / q
                fatigue_delta = round(q4_avg - q1_avg, 1)
                
                if fatigue_delta > 15:
                    fatigue_message = "Your risk increased significantly toward the end. If you continued at this pace, injury probability would escalate rapidly. Consider stopping or resting sooner."
                    fatigue_status = "high"
                elif fatigue_delta > 5:
                    fatigue_message = "Moderate fatigue detected. Your form started to slip in the second half. Adding a rest break mid-session would help maintain quality."
                    fatigue_status = "moderate"
                elif fatigue_delta > 0:
                    fatigue_message = "Minimal fatigue detected. Your body handled this workload well, with only slight form changes toward the end."
                    fatigue_status = "low"
                else:
                    fatigue_message = "No fatigue detected — your form actually improved or stayed consistent throughout. Excellent stamina and body control."
                    fatigue_status = "none"
                
                fatigue_projection = {
                    "start_risk": round(q1_avg, 1),
                    "end_risk": round(q4_avg, 1),
                    "delta": fatigue_delta,
                    "status": fatigue_status,
                    "message": fatigue_message
                }
            
            # --- Timeline Event Markers (explain risk spikes) ---
            if len(risk_scores) >= 3:
                mean_risk = sum(risk_scores) / len(risk_scores)
                std_risk = (sum((x - mean_risk) ** 2 for x in risk_scores) / len(risk_scores)) ** 0.5
                spike_threshold = mean_risk + max(std_risk * 1.5, 10)
                
                for i, f in enumerate(frame_results):
                    if f['risk_score'] >= spike_threshold:
                        # Determine cause
                        causes = [rf['factor'] for rf in f.get('risk_factors', [])]
                        cause_text = ", ".join(causes[:2]) if causes else "Multiple factors"
                        timeline_events.append({
                            "timestamp": f['timestamp'],
                            "risk_score": f['risk_score'],
                            "label": f"⚠️ Risk spike at {f['timestamp']}s",
                            "explanation": f"Risk jumped to {f['risk_score']}% here due to: {cause_text}.",
                            "type": "spike"
                        })
                
                # Mark best moment too
                best_frame = min(frame_results, key=lambda f: f['risk_score'])
                timeline_events.append({
                    "timestamp": best_frame['timestamp'],
                    "risk_score": best_frame['risk_score'],
                    "label": f"✅ Best form at {best_frame['timestamp']}s",
                    "explanation": f"Your lowest risk point ({best_frame['risk_score']}%). This is what your target form looks like.",
                    "type": "best"
                })
                
                timeline_events.sort(key=lambda e: e['timestamp'])
        
        return JSONResponse({
            "success": True,
            "video_info": {
                "total_frames": total_frames,
                "fps": fps,
                "duration": round(duration, 2)
            },
            "analysis_summary": summary,
            "video_biomechanics": video_biomechanics,
            "strengths": strengths,
            "recommendations": recommendations,
            "priority_ranking": priority_ranking,
            "fatigue_projection": fatigue_projection,
            "timeline": timeline,
            "timeline_events": timeline_events,
            "frames": frame_results
        })
            
    except Exception as e:
        logger.error(f"Error in analyze_video_enhanced: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Cleanup temp file
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception: # Fixed bare except
                pass

@app.get("/generate-report/{session_id}")
async def get_report(session_id: str):
    """Generates and returns a downloadable PDF report for a completed session."""
    session = temporal_engine.get_session(session_id)
    if not session or len(session.history) == 0:
        raise HTTPException(status_code=404, detail="Session data not found or empty.")
        
    try:
        from pdf_generator import generate_session_report
        pdf_buffer = generate_session_report(list(session.history), getattr(session, 'last_recommendation', {}))
        
        return StreamingResponse(
            pdf_buffer, 
            media_type="application/pdf", 
            headers={"Content-Disposition": f"attachment; filename=stridex_report_{session_id}.pdf"}
        )
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class SessionSummary(BaseModel):
    avg_risk: int
    max_fatigue: int
    performance_score: int
    rep_count: int
    session_id: str = "default"
    sport_mode: str = "default"
    timestamp: float = 0.0

@app.post("/save-session")
def save_session(summary: SessionSummary):
    with session_lock:
        history = []
        if os.path.exists(SESSION_HISTORY_FILE):
            with open(SESSION_HISTORY_FILE, "r") as f:
                try:
                    history = json.load(f)
                except (json.JSONDecodeError, ValueError):
                    pass
                    
        history.append(summary.dict())
        
        with open(SESSION_HISTORY_FILE, "w") as f:
            json.dump(history, f)
        
    return {"success": True, "message": "Session saved"}

@app.get("/get-history")
def get_history():
    with session_lock:
        history = []
        if os.path.exists(SESSION_HISTORY_FILE):
            with open(SESSION_HISTORY_FILE, "r") as f:
                try:
                    history = json.load(f)
                except (json.JSONDecodeError, ValueError):
                    pass
    return history

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)