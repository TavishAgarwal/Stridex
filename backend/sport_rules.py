class SportRule:
    """Base class for sport-specific biomechanical risk adjustments."""
    
    def apply_rules(self, base_score, risk_factors, biomechanics):
        """
        Takes the baseline computed risk and factors, and adjusting them
        according to the specific demands of the sport.
        Must return (modified_score, updated_risk_factors)
        """
        return base_score, risk_factors
        
    def _add_or_update_factor(self, factors, factor_name, detail, severity, confidence):
        # Remove existing factor if it exists to overwrite with sport-specific context
        factors = [f for f in factors if f['factor'] != factor_name]
        factors.append({
            "factor": factor_name,
            "detail": detail,
            "severity": severity,
            "confidence": confidence
        })
        return factors


class BasketballRule(SportRule):
    """
    Basketball focus: High risk of ACL tears from jump landings (knee valgus).
    Asymmetry is less critical than strict knee alignment.
    """
    def apply_rules(self, base_score, risk_factors, biomechanics):
        score = base_score
        b_mech = biomechanics.get('knee_valgus', {})
        conf = b_mech.get('confidence', 0.5)
        
        left_valgus = b_mech.get('left_risk', False)
        right_valgus = b_mech.get('right_risk', False)
        
        if left_valgus or right_valgus:
            # Extreme penalty for valgus in basketball
            score += 40 * conf
            
            detail = "Critical Jump Landing Risk: "
            if left_valgus and right_valgus:
                detail += f"Bilateral inward collapse (L: {b_mech.get('left_angle')}, R: {b_mech.get('right_angle')})"
            else:
                side = "Left" if left_valgus else "Right"
                angle = b_mech.get('left_angle') if left_valgus else b_mech.get('right_angle')
                detail += f"{side} knee inward collapse ({angle})"
                
            risk_factors = self._add_or_update_factor(risk_factors, "Knee Valgus", detail, "HIGH", conf)
            
        return score, risk_factors


class SprintingRule(SportRule):
    """
    Sprinting focus: Cadence and stride symmetry are paramount. 
    Posture degradation indicates severe fatigue (late-race breakdown).
    """
    def apply_rules(self, base_score, risk_factors, biomechanics):
        score = base_score
        
        # 1. Heavily penalize Asymmetry
        asym_mech = biomechanics.get('stride_asymmetry', {})
        asym_conf = asym_mech.get('confidence', 0.5)
        asym_pct_str = asym_mech.get('asymmetry_percent', "0%")
        
        try:
            asym_pct = float(asym_pct_str.replace('%', ''))
        except (ValueError, TypeError):
            asym_pct = 0.0
            
        if asym_pct > 8.0:
            score += (asym_pct * 2.5) * asym_conf
            risk_factors = self._add_or_update_factor(
                risk_factors, 
                "Stride Asymmetry", 
                f"Sprinting kinematic imbalance: {asym_pct_str} stride difference.", 
                "HIGH" if asym_pct > 15 else "MEDIUM", 
                asym_conf
            )
            
        # 2. Heavily penalize Posture (Forward lean breakdown)
        post_mech = biomechanics.get('posture', {})
        post_score = post_mech.get('posture_score', 1.0)
        post_conf = post_mech.get('confidence', 0.5)
        
        if post_score < 0.75:
            score += 25 * post_conf
            risk_factors = self._add_or_update_factor(
                risk_factors, 
                "Posture", 
                f"Late-race fatigue mechanics: Core/Shoulder breakdown ({post_score}).", 
                "MEDIUM", 
                post_conf
            )
            
        return score, risk_factors


class SquatRule(SportRule):
    """
    Squatting focus: Absolute strictness on knee valgus under heavy load.
    Posture (chest up) is critical. Asymmetry is moderately important.
    """
    def apply_rules(self, base_score, risk_factors, biomechanics):
        score = base_score
        
        k_mech = biomechanics.get('knee_valgus', {})
        k_conf = k_mech.get('confidence', 0.5)
        
        left_angle_str = k_mech.get('left_angle', '180')
        right_angle_str = k_mech.get('right_angle', '180')
        try:
            left = float(left_angle_str.replace('°', ''))
            right = float(right_angle_str.replace('°', ''))
        except (ValueError, TypeError):
            left = right = 180.0
            
        min_angle = min(left, right)
        
        # Under load, any valgus < 165 is highly dangerous
        if min_angle < 165.0:
            score += 50 * k_conf
            risk_factors = self._add_or_update_factor(
                risk_factors, 
                "Knee Valgus", 
                f"DANGEROUS LIFT METRICS: Knee caving under load ({min_angle}°).", 
                "HIGH", 
                k_conf
            )
            
        return score, risk_factors


class CricketRule(SportRule):
    """
    Cricket Bowling focus: Insane rotational forces. 
    Focuses heavily on shoulder tilt/posture during the delivery stride.
    """
    def apply_rules(self, base_score, risk_factors, biomechanics):
        score = base_score
        
        post_mech = biomechanics.get('posture', {})
        post_score = post_mech.get('posture_score', 1.0)
        post_conf = post_mech.get('confidence', 0.5)
        
        # Fast bowlers have natural lateral flexion, but excessive breakdown is a warning
        if post_score < 0.65:
            score += 30 * post_conf
            risk_factors = self._add_or_update_factor(
                risk_factors, 
                "Posture", 
                f"Delivery stride collapse: Excessive lateral spine flexion ({post_score}).", 
                "HIGH", 
                post_conf
            )
            
        return score, risk_factors


class SoccerRule(SportRule):
    """
    Soccer focus: High risk of knee injuries during rapid deceleration/change of direction.
    Asymmetry in stride and excessive knee valgus are key indicators.
    """
    def apply_rules(self, base_score, risk_factors, biomechanics):
        score = base_score
        
        # 1. Penalize Asymmetry (cutting/sprinting)
        asym_mech = biomechanics.get('stride_asymmetry', {})
        asym_pct_str = asym_mech.get('asymmetry_percent', "0%")
        asym_conf = asym_mech.get('confidence', 0.5)
        try:
            asym_pct = float(asym_pct_str.replace('%', ''))
        except (ValueError, TypeError):
            asym_pct = 0.0
            
        if asym_pct > 12.0:
            score += 20 * asym_conf
            risk_factors = self._add_or_update_factor(
                risk_factors,
                "Stride Asymmetry",
                f"Soccer kinematic imbalance: {asym_pct_str} stride difference.",
                "HIGH" if asym_pct > 20 else "MEDIUM",
                asym_conf
            )
            
        # 2. Penalize Knee Valgus (cutting/landing risk)
        k_mech = biomechanics.get('knee_valgus', {})
        k_conf = k_mech.get('confidence', 0.5)
        if k_mech.get('left_risk', False) or k_mech.get('right_risk', False):
            score += 30 * k_conf
            risk_factors = self._add_or_update_factor(
                risk_factors,
                "Knee Valgus",
                f"Direction Change Risk: Inward knee collapse detected.",
                "HIGH",
                k_conf
            )
            
        return score, risk_factors


class TennisRule(SportRule):
    """
    Tennis focus: High lateral movement forces and serve mechanics.
    Posture breakdown and extreme asymmetric loading are major risks.
    """
    def apply_rules(self, base_score, risk_factors, biomechanics):
        score = base_score
        
        # Posture breakdown (core stabilization during shots)
        post_mech = biomechanics.get('posture', {})
        post_score = post_mech.get('posture_score', 1.0)
        post_conf = post_mech.get('confidence', 0.5)
        
        if post_score < 0.70:
            score += 25 * post_conf
            risk_factors = self._add_or_update_factor(
                risk_factors,
                "Posture",
                f"Core Stabilization Failure: Excessive lateral/forward flexion ({post_score}).",
                "HIGH",
                post_conf
            )
            
        return score, risk_factors


class WeightliftingRule(SportRule):
    """
    Weightlifting focus: Strict adherence to symmetry and posture under extreme loads.
    Any deviation in lifting posture is critical.
    """
    def apply_rules(self, base_score, risk_factors, biomechanics):
        score = base_score
        
        # Posture (Spinal alignment under load)
        post_mech = biomechanics.get('posture', {})
        post_score = post_mech.get('posture_score', 1.0)
        post_conf = post_mech.get('confidence', 0.5)
        
        if post_score < 0.85:
            score += 40 * post_conf
            risk_factors = self._add_or_update_factor(
                risk_factors,
                "Posture",
                f"SEVERE LIFTING RISK: Spinal alignment compromise detected ({post_score}).",
                "HIGH",
                post_conf
            )
            
        return score, risk_factors


class VolleyballRule(SportRule):
    """
    Volleyball focus: Repeated explosive vertical jumping.
    Knee alignment (valgus) on landing is the absolute primary risk.
    """
    def apply_rules(self, base_score, risk_factors, biomechanics):
        score = base_score
        b_mech = biomechanics.get('knee_valgus', {})
        conf = b_mech.get('confidence', 0.5)
        
        left_valgus = b_mech.get('left_risk', False)
        right_valgus = b_mech.get('right_risk', False)
        
        if left_valgus or right_valgus:
            score += 45 * conf
            detail = "Critical Jump Landing Risk: "
            if left_valgus and right_valgus:
                detail += f"Bilateral inward collapse (L: {b_mech.get('left_angle')}, R: {b_mech.get('right_angle')})"
            else:
                side = "Left" if left_valgus else "Right"
                angle = b_mech.get('left_angle') if left_valgus else b_mech.get('right_angle')
                detail += f"{side} knee inward collapse ({angle})"
                
            risk_factors = self._add_or_update_factor(risk_factors, "Knee Valgus", detail, "HIGH", conf)
            
        return score, risk_factors


class SportRuleFactory:
    _rules = {
        "basketball": BasketballRule(),
        "sprinting": SprintingRule(),
        "squats": SquatRule(),
        "cricket": CricketRule(),
        "soccer": SoccerRule(),
        "tennis": TennisRule(),
        "weightlifting": WeightliftingRule(),
        "volleyball": VolleyballRule(),
        "default": SportRule()
    }
    
    @classmethod
    def get_rule(cls, sport_name: str) -> SportRule:
        sport_name = str(sport_name).lower().strip()
        return cls._rules.get(sport_name, cls._rules["default"])
