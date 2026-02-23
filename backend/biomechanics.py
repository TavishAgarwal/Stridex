import numpy as np
import math
from sport_rules import SportRuleFactory

def check_visibility(landmark, threshold=0.5):
    """Check if a landmark is visible enough for analysis"""
    return landmark.visibility >= threshold

def check_landmarks_visible(landmarks_list, threshold=0.5):
    """Check if all landmarks in list are visible"""
    return all(check_visibility(lm, threshold) for lm in landmarks_list)

def calculate_angle(point1, point2, point3):
    """Calculate angle at point2 using 3D coordinates (x, y, z) for better depth-aware measurement."""
    a = np.array([point1.x, point1.y, getattr(point1, 'z', 0.0)])
    b = np.array([point2.x, point2.y, getattr(point2, 'z', 0.0)])
    c = np.array([point3.x, point3.y, getattr(point3, 'z', 0.0)])
    
    ba = a - b
    bc = c - b
    
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    
    return np.degrees(angle)

def analyze_knee_valgus(landmarks):
    """
    Analyze knee valgus (inward knee collapse)
    Returns angles and confidence scores
    """
    # Landmark indices
    LEFT_HIP = 23
    LEFT_KNEE = 25
    LEFT_ANKLE = 27
    RIGHT_HIP = 24
    RIGHT_KNEE = 26
    RIGHT_ANKLE = 28
    
    result = {
        'left_angle': None,
        'right_angle': None,
        'left_risk': False,
        'right_risk': False,
        'confidence': 0.0
    }
    
    # Check left leg visibility
    left_visible = check_landmarks_visible([
        landmarks[LEFT_HIP],
        landmarks[LEFT_KNEE],
        landmarks[LEFT_ANKLE]
    ], threshold=0.5)
    
    # Check right leg visibility
    right_visible = check_landmarks_visible([
        landmarks[RIGHT_HIP],
        landmarks[RIGHT_KNEE],
        landmarks[RIGHT_ANKLE]
    ], threshold=0.5)
    
    if not (left_visible or right_visible):
        return result
    
    # Calculate left knee angle
    if left_visible:
        left_angle = calculate_angle(
            landmarks[LEFT_HIP],
            landmarks[LEFT_KNEE],
            landmarks[LEFT_ANKLE]
        )
        result['left_angle'] = f"{left_angle:.1f}°"
        result['left_risk'] = bool(left_angle < 160)
    
    # Calculate right knee angle
    if right_visible:
        right_angle = calculate_angle(
            landmarks[RIGHT_HIP],
            landmarks[RIGHT_KNEE],
            landmarks[RIGHT_ANKLE]
        )
        result['right_angle'] = f"{right_angle:.1f}°"
        result['right_risk'] = bool(right_angle < 160)
    
    # Calculate confidence based on visibility
    visible_count = sum([left_visible, right_visible])
    avg_visibility = sum([
        landmarks[LEFT_KNEE].visibility if left_visible else 0,
        landmarks[RIGHT_KNEE].visibility if right_visible else 0
    ]) / max(visible_count, 1)
    
    result['confidence'] = float(avg_visibility)
    
    return result

def analyze_stride_asymmetry(landmarks):
    """
    Analyze stride asymmetry (leg length difference)
    Returns percentage difference and confidence
    """
    LEFT_HIP = 23
    LEFT_KNEE = 25
    LEFT_ANKLE = 27
    RIGHT_HIP = 24
    RIGHT_KNEE = 26
    RIGHT_ANKLE = 28
    
    result = {
        'asymmetry_percent': "0.0%",
        'asymmetry_risk': False,
        'confidence': 0.0
    }
    
    # Check visibility
    left_visible = check_landmarks_visible([
        landmarks[LEFT_HIP],
        landmarks[LEFT_KNEE],
        landmarks[LEFT_ANKLE]
    ], threshold=0.5)
    
    right_visible = check_landmarks_visible([
        landmarks[RIGHT_HIP],
        landmarks[RIGHT_KNEE],
        landmarks[RIGHT_ANKLE]
    ], threshold=0.5)
    
    if not (left_visible and right_visible):
        return result
    
    # Calculate leg lengths
    left_hip = np.array([landmarks[LEFT_HIP].x, landmarks[LEFT_HIP].y])
    left_ankle = np.array([landmarks[LEFT_ANKLE].x, landmarks[LEFT_ANKLE].y])
    right_hip = np.array([landmarks[RIGHT_HIP].x, landmarks[RIGHT_HIP].y])
    right_ankle = np.array([landmarks[RIGHT_ANKLE].x, landmarks[RIGHT_ANKLE].y])
    
    left_length = np.linalg.norm(left_hip - left_ankle)
    right_length = np.linalg.norm(right_hip - right_ankle)
    
    # Calculate asymmetry
    avg_length = (left_length + right_length) / 2
    asymmetry = abs(left_length - right_length) / avg_length * 100
    
    result['asymmetry_percent'] = f"{asymmetry:.1f}%"
    result['asymmetry_risk'] = bool(asymmetry > 10)
    
    # Calculate confidence
    avg_visibility = (
        landmarks[LEFT_HIP].visibility + 
        landmarks[LEFT_ANKLE].visibility +
        landmarks[RIGHT_HIP].visibility + 
        landmarks[RIGHT_ANKLE].visibility
    ) / 4
    
    result['confidence'] = float(avg_visibility)
    
    return result

def analyze_posture(landmarks):
    """
    Analyze overall posture alignment
    Returns posture score and confidence
    """
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_HIP = 23
    RIGHT_HIP = 24
    
    result = {
        'posture_score': 1.0,
        'posture_risk': False,
        'message': "Good posture",
        'confidence': 0.0
    }
    
    # Check shoulder visibility (critical for posture)
    shoulders_visible = check_landmarks_visible([
        landmarks[LEFT_SHOULDER],
        landmarks[RIGHT_SHOULDER]
    ], threshold=0.7)  # Higher threshold for shoulders
    
    if not shoulders_visible:
        result['message'] = "Shoulders not clearly visible (possible back view)"
        result['confidence'] = float(landmarks[LEFT_SHOULDER].visibility)
        return result
    
    # Check hip visibility
    hips_visible = check_landmarks_visible([
        landmarks[LEFT_HIP],
        landmarks[RIGHT_HIP]
    ], threshold=0.5)
    
    if not hips_visible:
        result['message'] = "Hips not clearly visible"
        result['confidence'] = float(landmarks[LEFT_HIP].visibility)
        return result
    
    # Calculate shoulder alignment
    left_shoulder = np.array([landmarks[LEFT_SHOULDER].x, landmarks[LEFT_SHOULDER].y])
    right_shoulder = np.array([landmarks[RIGHT_SHOULDER].x, landmarks[RIGHT_SHOULDER].y])
    
    shoulder_diff = abs(left_shoulder[1] - right_shoulder[1])
    shoulder_distance = np.linalg.norm(left_shoulder - right_shoulder)
    
    # Calculate hip alignment
    left_hip = np.array([landmarks[LEFT_HIP].x, landmarks[LEFT_HIP].y])
    right_hip = np.array([landmarks[RIGHT_HIP].x, landmarks[RIGHT_HIP].y])
    
    hip_diff = abs(left_hip[1] - right_hip[1])
    hip_distance = np.linalg.norm(left_hip - right_hip)
    
    # Calculate posture score
    shoulder_alignment = 1 - min(shoulder_diff / (shoulder_distance + 1e-6), 1.0)
    hip_alignment = 1 - min(hip_diff / (hip_distance + 1e-6), 1.0)
    
    posture_score = (shoulder_alignment + hip_alignment) / 2
    
    result['posture_score'] = float(round(posture_score, 2))
    result['posture_risk'] = bool(posture_score < 0.7)
    
    # Calculate overall confidence
    avg_visibility = (
        landmarks[LEFT_SHOULDER].visibility +
        landmarks[RIGHT_SHOULDER].visibility +
        landmarks[LEFT_HIP].visibility +
        landmarks[RIGHT_HIP].visibility
    ) / 4
    
    result['confidence'] = float(avg_visibility)
    
    # Update message based on score and confidence
    if result['confidence'] > 0.6:
        if posture_score >= 0.8:
            result['message'] = "Excellent posture"
        elif posture_score >= 0.7:
            result['message'] = "Good posture with minor imbalance"
        else:
            result['message'] = "Posture imbalance detected"
    else:
        result['message'] = "Low confidence - adjust camera angle"
    
    return result

def calculate_injury_risk(landmarks, sport="default"):
    """
    Main function to calculate overall injury risk
    Returns comprehensive risk assessment tailored to the sport
    """
    # Fetch the sport-specific rule engine
    rule_engine = SportRuleFactory.get_rule(sport)
    
    # Analyze biomechanics
    knee_valgus = analyze_knee_valgus(landmarks)
    stride_asymmetry = analyze_stride_asymmetry(landmarks)
    posture = analyze_posture(landmarks)
    
    # Initialize risk score
    risk_score = 10  # Baseline
    risk_factors = []
    
    # Knee valgus contribution (0-40 points)
    if knee_valgus['left_risk'] or knee_valgus['right_risk']:
        knee_risk_points = 40 * knee_valgus['confidence']
        risk_score += knee_risk_points
        
        if knee_valgus['left_risk'] and knee_valgus['right_risk']:
            risk_factors.append({
                "factor": "Knee Valgus",
                "detail": f"Both knees showing inward collapse (L: {knee_valgus['left_angle']}, R: {knee_valgus['right_angle']})",
                "severity": "HIGH",
                "confidence": knee_valgus['confidence']
            })
        elif knee_valgus['left_risk']:
            risk_factors.append({
                "factor": "Knee Valgus",
                "detail": f"Left knee inward collapse detected ({knee_valgus['left_angle']})",
                "severity": "MEDIUM",
                "confidence": knee_valgus['confidence']
            })
        elif knee_valgus['right_risk']:
            risk_factors.append({
                "factor": "Knee Valgus",
                "detail": f"Right knee inward collapse detected ({knee_valgus['right_angle']})",
                "severity": "MEDIUM",
                "confidence": knee_valgus['confidence']
            })
    
    # Stride asymmetry contribution (0-25 points)
    if stride_asymmetry['asymmetry_risk']:
        asymmetry_points = 25 * stride_asymmetry['confidence']
        risk_score += asymmetry_points
        
        risk_factors.append({
            "factor": "Stride Asymmetry",
            "detail": f"Significant leg length difference detected ({stride_asymmetry['asymmetry_percent']})",
            "severity": "MEDIUM",
            "confidence": stride_asymmetry['confidence']
        })
    
    # Posture contribution (0-15 points)
    if posture['posture_risk'] and posture['confidence'] > 0.5:
        posture_points = 15 * posture['confidence']
        risk_score += posture_points
        
        risk_factors.append({
            "factor": "Posture",
            "detail": posture['message'],
            "severity": "LOW",
            "confidence": posture['confidence']
        })
    
    # Add camera angle warning if overall confidence is low
    overall_confidence = float((
        knee_valgus['confidence'] + 
        stride_asymmetry['confidence'] + 
        posture['confidence']
    ) / 3)
    
    if overall_confidence < 0.5:
        risk_factors.append({
            "factor": "Camera Angle",
            "detail": f"Suboptimal view - {int(overall_confidence * 100)}% confidence. Use front or side view for better accuracy.",
            "severity": "LOW",
            "confidence": overall_confidence
        })
        
    # --- APPLY SPORT SPECIFIC RULES ---
    biomechanics_data = {
        "knee_valgus": knee_valgus,
        "stride_asymmetry": stride_asymmetry,
        "posture": posture
    }
    
    risk_score, risk_factors = rule_engine.apply_rules(risk_score, risk_factors, biomechanics_data)
    
    # Cap risk score at 100
    risk_score = int(min(round(risk_score), 100))
    
    # Determine risk level
    if risk_score >= 70:
        risk_level = "HIGH"
        action = "Substitute player immediately - high injury risk"
        color = "#FF4B4B"
    elif risk_score >= 40:
        risk_level = "MEDIUM"
        action = "Monitor closely - moderate injury risk"
        color = "#FFA500"
    else:
        risk_level = "LOW"
        action = "Continue play - low injury risk"
        color = "#00CC00"
    
    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "action": action,
        "color": color,
        "risk_factors": risk_factors,
        "biomechanics": biomechanics_data,
        "overall_confidence": overall_confidence
    }