"""Unit tests for the biomechanics module."""
import math

class MockLandmark:
    """Minimal landmark mock for testing without MediaPipe dependency."""
    def __init__(self, x, y, z=0.0, visibility=1.0):
        self.x = x
        self.y = y
        self.z = z
        self.visibility = visibility


def test_calculate_angle_straight():
    """Three collinear points should give 180° (straight line)."""
    from biomechanics import calculate_angle
    
    p1 = MockLandmark(0.0, 0.0, 0.0)
    p2 = MockLandmark(0.5, 0.0, 0.0)
    p3 = MockLandmark(1.0, 0.0, 0.0)
    
    angle = calculate_angle(p1, p2, p3)
    assert abs(angle - 180.0) < 0.5, f"Expected ~180°, got {angle}°"


def test_calculate_angle_right_angle():
    """Points forming a 90° angle."""
    from biomechanics import calculate_angle
    
    p1 = MockLandmark(0.0, 1.0, 0.0)
    p2 = MockLandmark(0.0, 0.0, 0.0)
    p3 = MockLandmark(1.0, 0.0, 0.0)
    
    angle = calculate_angle(p1, p2, p3)
    assert abs(angle - 90.0) < 0.1, f"Expected ~90°, got {angle}°"


def test_calculate_angle_3d():
    """Verify 3D coordinates are used in angle calculation."""
    from biomechanics import calculate_angle
    
    p1 = MockLandmark(0.0, 0.0, 1.0)
    p2 = MockLandmark(0.0, 0.0, 0.0)
    p3 = MockLandmark(1.0, 0.0, 0.0)
    
    angle = calculate_angle(p1, p2, p3)
    assert abs(angle - 90.0) < 0.1, f"Expected ~90° (3D), got {angle}°"


def test_analyze_knee_valgus_good_form():
    """Full landmarks with good knee angles should return no risk."""
    from biomechanics import analyze_knee_valgus
    
    # Create 33 dummy landmarks
    landmarks = [MockLandmark(0.5, 0.5, 0.0, visibility=0.9) for _ in range(33)]
    
    # Hip-Knee-Ankle aligned (straight ~180°)
    # Left: 23-hip, 25-knee, 27-ankle
    landmarks[23] = MockLandmark(0.4, 0.4, 0.0, 0.95)
    landmarks[25] = MockLandmark(0.4, 0.6, 0.0, 0.95)
    landmarks[27] = MockLandmark(0.4, 0.8, 0.0, 0.95)
    
    # Right: 24-hip, 26-knee, 28-ankle
    landmarks[24] = MockLandmark(0.6, 0.4, 0.0, 0.95)
    landmarks[26] = MockLandmark(0.6, 0.6, 0.0, 0.95)
    landmarks[28] = MockLandmark(0.6, 0.8, 0.0, 0.95)
    
    result = analyze_knee_valgus(landmarks)
    
    assert result['left_risk'] == False, "Left knee should not be at risk"
    assert result['right_risk'] == False, "Right knee should not be at risk"
    assert result['confidence'] > 0.5, f"Confidence should be high, got {result['confidence']}"


def test_injury_model_predict():
    """Test that the injury model produces valid outputs."""
    from injury_model import injury_estimator
    
    # Good stats (low risk expected)
    result = injury_estimator.predict(
        knee_variance=2.0,
        knee_mean=178.0,
        stride_asymmetry=3.0,
        posture_score=0.95,
        fatigue_index=10.0
    )
    assert 0.0 <= result['injury_probability'] <= 1.0
    assert result['risk_level'] in ['LOW', 'MEDIUM', 'HIGH']
    
    # Bad stats (higher risk expected)
    bad_result = injury_estimator.predict(
        knee_variance=40.0,
        knee_mean=150.0,
        stride_asymmetry=25.0,
        posture_score=0.4,
        fatigue_index=90.0
    )
    assert bad_result['injury_probability'] > result['injury_probability'], \
        "Bad biomechanics should produce higher injury probability"


def test_sport_rule_factory():
    """Test that all sport rules are accessible and return valid outputs."""
    from sport_rules import SportRuleFactory
    
    sports = ['basketball', 'sprinting', 'squats', 'cricket', 'soccer', 'tennis', 'weightlifting', 'volleyball', 'default', 'unknown_sport']
    
    for sport in sports:
        rule = SportRuleFactory.get_rule(sport)
        score, factors = rule.apply_rules(10, [], {
            'knee_valgus': {'left_risk': False, 'right_risk': False, 'confidence': 0.8},
            'stride_asymmetry': {'asymmetry_percent': '5%', 'confidence': 0.8},
            'posture': {'posture_score': 0.9, 'confidence': 0.8}
        })
        assert isinstance(score, (int, float)), f"Score should be numeric for {sport}"
        assert isinstance(factors, list), f"Factors should be a list for {sport}"


if __name__ == '__main__':
    tests = [
        test_calculate_angle_straight,
        test_calculate_angle_right_angle,
        test_calculate_angle_3d,
        test_analyze_knee_valgus_good_form,
        test_injury_model_predict,
        test_sport_rule_factory,
    ]
    
    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            print(f"  ✅ {test.__name__}")
            passed += 1
        except AssertionError as e:
            print(f"  ❌ {test.__name__}: {e}")
            failed += 1
        except Exception as e:
            print(f"  ❌ {test.__name__}: {type(e).__name__}: {e}")
            failed += 1
    
    print(f"\n{'='*40}")
    print(f"  {passed} passed, {failed} failed")
    print(f"{'='*40}")
