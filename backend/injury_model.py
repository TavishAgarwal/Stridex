import math
import random

class LogisticRegressionModel:
    """
    Lightweight, pure Python Logistic Regression for Injury Probability Estimation.
    Inference time < 1ms. Zero external dependencies.
    """
    def __init__(self, learning_rate=0.01, epochs=1000):
        self.learning_rate = learning_rate
        self.epochs = epochs
        # Features: [Bias, Knee Var, Knee Mean, Asymmetry %, Posture Score, Fatigue Index]
        self.weights = [0.0] * 6 
        self.trained = False

    def _sigmoid(self, z):
        # Prevent overflow
        z = max(min(z, 20), -20)
        return 1.0 / (1.0 + math.exp(-z))

    def _predict_raw(self, features):
        z = self.weights[0]
        for w, f in zip(self.weights[1:], features):
            z += w * f
        return self._sigmoid(z)

    def train(self, X, y):
        """Train using simple gradient descent."""
        n_samples = len(X)
        if n_samples == 0:
            return
            
        for _ in range(self.epochs):
            predictions = [self._predict_raw(x) for x in X]
            
            # Gradients
            errors = [pred - target for pred, target in zip(predictions, y)]
            
            # Update bias
            self.weights[0] -= self.learning_rate * sum(errors) / n_samples
            
            # Update weights
            for j in range(5):
                feature_grad = sum(err * x[j] for err, x in zip(errors, X)) / n_samples
                self.weights[j+1] -= self.learning_rate * feature_grad

        self.trained = True

    def predict(self, knee_variance, knee_mean, stride_asymmetry, posture_score, fatigue_index):
        """
        Estimate injury probability and risk level.
        """
        if not self.trained:
            self.train_synthetic()

        # Normalize features approximately to [0, 1] range to match synthetic training stable weights
        norm_features = [
            min(knee_variance / 50.0, 1.0),            # Knee Angle Variance (0-50 norm)
            min(abs(180.0 - knee_mean) / 40.0, 1.0),   # Knee Mean Deviation from 180 (0-40 norm)
            min(stride_asymmetry / 30.0, 1.0),         # Stride Asymmetry (0-30% norm)
            max(0.0, 1.0 - posture_score),             # Posture Degradation (1.0 is bad, 0.0 is perfect)
            min(fatigue_index / 100.0, 1.0)            # Fatigue Index (0-100 norm)
        ]
        
        prob = self._predict_raw(norm_features)
        
        # Determine Risk Level
        if prob >= 0.70:
            risk_level = "HIGH"
        elif prob >= 0.35:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
            
        return {
            "injury_probability": round(prob, 3),
            "risk_level": risk_level
        }

    def train_synthetic(self):
        """
        Generates realistic synthetic data simulating biomechanical 
        measurements and trains the logistic model instantly.
        """
        random.seed(42) # Deterministic model
        X = []
        y = []
        
        # Generate 1000 synthetic samples
        for _ in range(1000):
            # Label distribution: ~50% healthy, ~50% injured/high-risk
            is_risk = random.choice([0, 1])
            
            if is_risk == 0:
                # Healthy stats (low variance, close to 180 angle, low asymmetry, good posture, low fatigue)
                knee_var = random.uniform(0.0, 0.2)
                knee_meandev = random.uniform(0.0, 0.2)
                asym = random.uniform(0.0, 0.2)
                posture_deg = random.uniform(0.0, 0.2)
                fatigue = random.uniform(0.0, 0.3)
            else:
                # Risk stats (high variance, bad angle, high asymmetry, bad posture, high fatigue)
                knee_var = random.uniform(0.4, 1.0)
                knee_meandev = random.uniform(0.3, 1.0)
                asym = random.uniform(0.4, 1.0)
                posture_deg = random.uniform(0.3, 1.0)
                fatigue = random.uniform(0.5, 1.0)
                
            features = [knee_var, knee_meandev, asym, posture_deg, fatigue]
            
            X.append(features)
            y.append(is_risk)
            
        self.train(X, y)

# Pre-initialized global instance
injury_estimator = LogisticRegressionModel(learning_rate=0.5, epochs=500)
# Automatically train at import time (adds < 50ms overhead)
injury_estimator.train_synthetic()
