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

def analyze_elbow_flare(landmarks):
    """
    Analyze elbow flare angle — indicator of shoulder impingement risk.
    Uses shoulder-elbow-wrist angle. Risk if angle < 70° during overhead/pressing.
    """
    LEFT_SHOULDER, RIGHT_SHOULDER = 11, 12
    LEFT_ELBOW, RIGHT_ELBOW = 13, 14
    LEFT_WRIST, RIGHT_WRIST = 15, 16

    result = {
        'left_angle': None, 'right_angle': None,
        'left_risk': False, 'right_risk': False,
        'status': 'good', 'confidence': 0.0,
        'plain_english': 'Elbows are well-positioned — no impingement risk detected.'
    }

    left_visible = check_landmarks_visible(
        [landmarks[LEFT_SHOULDER], landmarks[LEFT_ELBOW], landmarks[LEFT_WRIST]], 0.5)
    right_visible = check_landmarks_visible(
        [landmarks[RIGHT_SHOULDER], landmarks[RIGHT_ELBOW], landmarks[RIGHT_WRIST]], 0.5)

    if not (left_visible or right_visible):
        result['plain_english'] = 'Arms not clearly visible for elbow analysis.'
        return result

    if left_visible:
        angle = calculate_angle(landmarks[LEFT_SHOULDER], landmarks[LEFT_ELBOW], landmarks[LEFT_WRIST])
        result['left_angle'] = f"{angle:.1f}°"
        result['left_risk'] = bool(angle < 70)

    if right_visible:
        angle = calculate_angle(landmarks[RIGHT_SHOULDER], landmarks[RIGHT_ELBOW], landmarks[RIGHT_WRIST])
        result['right_angle'] = f"{angle:.1f}°"
        result['right_risk'] = bool(angle < 70)

    visible_count = sum([left_visible, right_visible])
    avg_vis = sum([
        landmarks[LEFT_ELBOW].visibility if left_visible else 0,
        landmarks[RIGHT_ELBOW].visibility if right_visible else 0
    ]) / max(visible_count, 1)
    result['confidence'] = float(avg_vis)

    if result['left_risk'] or result['right_risk']:
        result['status'] = 'concern'
        result['plain_english'] = 'Your elbows are flaring out excessively, which can pinch the shoulder tendons (impingement). Keep elbows tucked closer to your body.'
    elif left_visible or right_visible:
        la = float(result['left_angle'].replace('°','')) if result['left_angle'] else 180
        ra = float(result['right_angle'].replace('°','')) if result['right_angle'] else 180
        if min(la, ra) < 90:
            result['status'] = 'fair'
            result['plain_english'] = 'Mild elbow flare detected. Not critical, but be mindful during pressing movements.'

    return result


def analyze_shoulder_symmetry(landmarks):
    """
    Analyze shoulder symmetry — compensation pattern detection.
    Compares left vs right shoulder height and forward projection.
    """
    LEFT_SHOULDER, RIGHT_SHOULDER = 11, 12
    LEFT_HIP, RIGHT_HIP = 23, 24

    result = {
        'height_diff': 0.0, 'forward_diff': 0.0,
        'asymmetry_percent': 0.0, 'risk': False,
        'status': 'good', 'confidence': 0.0,
        'plain_english': 'Shoulders are level and symmetric — no compensation patterns detected.'
    }

    visible = check_landmarks_visible(
        [landmarks[LEFT_SHOULDER], landmarks[RIGHT_SHOULDER]], 0.6)
    if not visible:
        result['plain_english'] = 'Shoulders not clearly visible for symmetry analysis.'
        return result

    ls = landmarks[LEFT_SHOULDER]
    rs = landmarks[RIGHT_SHOULDER]

    # Height difference (Y axis — lower Y = higher on screen)
    height_diff = abs(ls.y - rs.y)
    shoulder_width = abs(ls.x - rs.x) + 1e-6
    height_pct = (height_diff / shoulder_width) * 100

    # Forward difference (Z axis)
    forward_diff = abs(getattr(ls, 'z', 0) - getattr(rs, 'z', 0))

    total_asym = height_pct + (forward_diff * 50)

    result['height_diff'] = round(height_diff, 4)
    result['forward_diff'] = round(forward_diff, 4)
    result['asymmetry_percent'] = round(total_asym, 1)
    result['risk'] = bool(total_asym > 15)
    result['confidence'] = float((ls.visibility + rs.visibility) / 2)

    if total_asym > 25:
        result['status'] = 'concern'
        result['plain_english'] = 'Significant shoulder asymmetry detected — one shoulder is noticeably higher or more forward. This compensation pattern can lead to neck/back pain.'
    elif total_asym > 15:
        result['status'] = 'fair'
        result['plain_english'] = 'Mild shoulder unevenness detected. This is common but worth monitoring during heavy lifts.'

    return result


def analyze_wrist_alignment(landmarks):
    """
    Analyze wrist alignment — hyperextension under load.
    Uses elbow-wrist-index finger angle. Risk if angle > 190° (hyperextension).
    """
    LEFT_ELBOW, RIGHT_ELBOW = 13, 14
    LEFT_WRIST, RIGHT_WRIST = 15, 16
    LEFT_INDEX, RIGHT_INDEX = 19, 20

    result = {
        'left_angle': None, 'right_angle': None,
        'left_risk': False, 'right_risk': False,
        'status': 'good', 'confidence': 0.0,
        'plain_english': 'Wrists are in a neutral, safe position.'
    }

    left_visible = check_landmarks_visible(
        [landmarks[LEFT_ELBOW], landmarks[LEFT_WRIST], landmarks[LEFT_INDEX]], 0.4)
    right_visible = check_landmarks_visible(
        [landmarks[RIGHT_ELBOW], landmarks[RIGHT_WRIST], landmarks[RIGHT_INDEX]], 0.4)

    if not (left_visible or right_visible):
        result['plain_english'] = 'Wrists/hands not clearly visible for alignment analysis.'
        return result

    if left_visible:
        angle = calculate_angle(landmarks[LEFT_ELBOW], landmarks[LEFT_WRIST], landmarks[LEFT_INDEX])
        result['left_angle'] = f"{angle:.1f}°"
        result['left_risk'] = bool(angle > 190 or angle < 140)

    if right_visible:
        angle = calculate_angle(landmarks[RIGHT_ELBOW], landmarks[RIGHT_WRIST], landmarks[RIGHT_INDEX])
        result['right_angle'] = f"{angle:.1f}°"
        result['right_risk'] = bool(angle > 190 or angle < 140)

    visible_count = sum([left_visible, right_visible])
    avg_vis = sum([
        landmarks[LEFT_WRIST].visibility if left_visible else 0,
        landmarks[RIGHT_WRIST].visibility if right_visible else 0
    ]) / max(visible_count, 1)
    result['confidence'] = float(avg_vis)

    if result['left_risk'] or result['right_risk']:
        result['status'] = 'concern'
        result['plain_english'] = 'Wrist hyperextension or excessive flexion detected. This puts strain on the carpal tunnel and wrist ligaments. Keep wrists neutral.'
    elif left_visible or right_visible:
        la = float(result['left_angle'].replace('°','')) if result['left_angle'] else 170
        ra = float(result['right_angle'].replace('°','')) if result['right_angle'] else 170
        if min(la, ra) < 150 or max(la, ra) > 185:
            result['status'] = 'fair'
            result['plain_english'] = 'Minor wrist deviation from neutral. Keep an eye on wrist position during loaded movements.'

    return result


def detect_body_context(landmarks):
    """
    Smart Context Detection — auto-classifies view as upper_body, lower_body, or full_body
    based on which landmark groups are visible.
    """
    upper_indices = [11, 12, 13, 14, 15, 16]  # shoulders, elbows, wrists
    lower_indices = [23, 24, 25, 26, 27, 28]  # hips, knees, ankles

    upper_vis = sum(1 for i in upper_indices if landmarks[i].visibility >= 0.5)
    lower_vis = sum(1 for i in lower_indices if landmarks[i].visibility >= 0.5)

    upper_pct = upper_vis / len(upper_indices)
    lower_pct = lower_vis / len(lower_indices)

    if upper_pct >= 0.6 and lower_pct >= 0.6:
        context = 'full_body'
        label = 'Full Body'
        description = 'Both upper and lower body are visible — all metrics are active.'
    elif upper_pct >= 0.5:
        context = 'upper_body'
        label = 'Upper Body'
        description = 'Primarily upper body visible — elbow, shoulder, wrist, and posture metrics are active.'
    elif lower_pct >= 0.5:
        context = 'lower_body'
        label = 'Lower Body'
        description = 'Primarily lower body visible — knee, stride, and posture metrics are active.'
    else:
        context = 'partial'
        label = 'Partial View'
        description = 'Limited body visibility — move camera back or adjust angle for full analysis.'

    return {
        'context': context,
        'label': label,
        'description': description,
        'upper_visibility': round(upper_pct, 2),
        'lower_visibility': round(lower_pct, 2)
    }


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
    elbow_flare = analyze_elbow_flare(landmarks)
    shoulder_symmetry = analyze_shoulder_symmetry(landmarks)
    wrist_alignment = analyze_wrist_alignment(landmarks)
    body_context = detect_body_context(landmarks)
    
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
    # Elbow flare contribution (0-15 points)
    if elbow_flare['left_risk'] or elbow_flare['right_risk']:
        elbow_points = 15 * elbow_flare['confidence']
        risk_score += elbow_points
        risk_factors.append({
            "factor": "Elbow Flare",
            "detail": elbow_flare['plain_english'],
            "severity": "MEDIUM",
            "confidence": elbow_flare['confidence']
        })

    # Shoulder symmetry contribution (0-10 points)
    if shoulder_symmetry['risk']:
        shoulder_points = 10 * shoulder_symmetry['confidence']
        risk_score += shoulder_points
        risk_factors.append({
            "factor": "Shoulder Asymmetry",
            "detail": shoulder_symmetry['plain_english'],
            "severity": "MEDIUM" if shoulder_symmetry['asymmetry_percent'] > 25 else "LOW",
            "confidence": shoulder_symmetry['confidence']
        })

    # Wrist alignment contribution (0-10 points)
    if wrist_alignment['left_risk'] or wrist_alignment['right_risk']:
        wrist_points = 10 * wrist_alignment['confidence']
        risk_score += wrist_points
        risk_factors.append({
            "factor": "Wrist Alignment",
            "detail": wrist_alignment['plain_english'],
            "severity": "MEDIUM",
            "confidence": wrist_alignment['confidence']
        })

    # Calculate overall confidence across all 6 metrics
    all_confs = [
        knee_valgus['confidence'],
        stride_asymmetry['confidence'],
        posture['confidence'],
        elbow_flare['confidence'],
        shoulder_symmetry['confidence'],
        wrist_alignment['confidence']
    ]
    overall_confidence = float(sum(all_confs) / len(all_confs))
    
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
        "posture": posture,
        "elbow_flare": elbow_flare,
        "shoulder_symmetry": shoulder_symmetry,
        "wrist_alignment": wrist_alignment,
        "body_context": body_context
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