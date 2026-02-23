def calculate_projection(injury_estimator, current_features, fatigue_score, fatigue_slope):
    """
    Project future injury probability mathematically.
    Runs in < 1ms using pure O(1) or small-O(N) algebraically bounded increments.
    
    current_features: list of un-normalized current stats mapping to injury_model:
        [knee_variance, knee_mean, stride_asymmetry, posture_score]
    fatigue_score: float (0-100 current fatigue)
    fatigue_slope: float (rate of fatigue increasing per frame, per rolling 40 frames)
    
    Returns: dictionary containing 'is_critical' boolean and 'time_to_critical' in seconds.
    """
    # Quick Reject
    if fatigue_slope <= 0.05:
        # Not accumulating fatigue fast enough to worry
        return {"is_critical": False, "time_to_critical": None}
    
    # We estimate 30 frames pass per second (standard webcam/FastAPI processing rate)
    fatigue_increase_per_second = fatigue_slope * 30.0
    
    if fatigue_increase_per_second <= 0:
        return {"is_critical": False, "time_to_critical": None}
    
    time_limit_seconds = 180.0 # 3 minute horizon
    
    # Check if we are ALREADY critical
    current_prob = injury_estimator.predict(*current_features, fatigue_score)["injury_probability"]
    if current_prob >= 0.80:
        return {"is_critical": True, "time_to_critical": 0}
    
    # Instead of heavy algebraic solving of the sigmoid inverse, 
    # we iteratively step forward in 5-second chunks (extremely fast O(N=36) loop)
    # This guarantees <1ms execution without importing numpy or scipy optimizers
    
    simulated_fatigue = fatigue_score
    seconds_passed = 0.0
    
    for _ in range(int(time_limit_seconds / 5.0)):
        simulated_fatigue += (fatigue_increase_per_second * 5.0)
        seconds_passed += 5.0
        
        if simulated_fatigue >= 100:
            simulated_fatigue = 100.0
            
        prob = injury_estimator.predict(*current_features, simulated_fatigue)["injury_probability"]
        
        if prob >= 0.80:
            return {
                "is_critical": True, 
                "time_to_critical": int(seconds_passed)
            }
            
        if simulated_fatigue >= 100.0:
            break
            
    return {"is_critical": False, "time_to_critical": None}
