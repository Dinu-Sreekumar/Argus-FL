"""
Argus-FL ML Inference Engine (Multi-Class)
===========================================
Loads trained FL model and runs multi-class inference for 7 attack categories.
Used by Sentry for real-time ML-based attack classification.
"""

import os
import json
import random
import logging
import numpy as np

# Lazy load TensorFlow to avoid import delays
_model = None
_label_encoder = None
_scaler_params = None
_initialized = False

logger = logging.getLogger("MLInference")

# Number of classes
NUM_CLASSES = 7


def get_paths():
    """Get paths to model, label encoder, and scaler files."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(script_dir)
    
    model_path = os.path.join(backend_dir, 'models', 'saved_models', 'global_model.keras')
    label_encoder_path = os.path.join(backend_dir, 'data', 'label_encoder.json')
    scaler_path = os.path.join(backend_dir, 'data', 'scaler_params.json')
    
    return model_path, label_encoder_path, scaler_path


def initialize():
    """Initialize the inference engine by loading model and label encoder."""
    global _model, _label_encoder, _scaler_params, _initialized
    
    if _initialized:
        return True
    
    model_path, label_encoder_path, scaler_path = get_paths()
    
    # Check if files exist
    if not os.path.exists(model_path):
        logger.warning(f"Model not found at {model_path}. Train the FL model first.")
        return False
    
    if not os.path.exists(label_encoder_path):
        logger.warning(f"Label encoder not found at {label_encoder_path}.")
        return False
    
    try:
        # Load TensorFlow and model
        import tensorflow as tf
        logger.info(f"Loading model from {model_path}...")
        _model = tf.keras.models.load_model(model_path)
        logger.info(f"Model loaded successfully. Output shape: {_model.output_shape}")
        
        # Load label encoder
        logger.info(f"Loading label encoder from {label_encoder_path}...")
        with open(label_encoder_path, 'r') as f:
            _label_encoder = json.load(f)
        logger.info(f"Label encoder loaded: {_label_encoder['class_names']}")
        
        # Load scaler params (optional)
        if os.path.exists(scaler_path):
            with open(scaler_path, 'r') as f:
                _scaler_params = json.load(f)
            logger.info("Scaler parameters loaded")
        
        _initialized = True
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize inference engine: {e}")
        return False


def predict(features: np.ndarray) -> dict:
    """
    Run multi-class inference on a feature vector.
    
    Args:
        features: numpy array of shape (1, num_features) or (num_features,)
    
    Returns:
        dict with: class_id, class_name, confidence, all_probabilities
    """
    global _model, _label_encoder
    
    # Ensure initialized
    if not _initialized:
        if not initialize():
            return {
                'class_id': -1,
                'class_name': 'ERROR',
                'confidence': 0.0,
                'error': 'Inference engine not initialized. Train model first.'
            }
    
    try:
        # Ensure correct shape
        if features.ndim == 1:
            features = features.reshape(1, -1)
        
        # Run prediction
        predictions = _model.predict(features, verbose=0)[0]
        
        # Get class with highest probability
        class_id = int(np.argmax(predictions))
        confidence = float(predictions[class_id])
        class_name = _label_encoder['class_names'][class_id]
        
        # Get all probabilities as dict
        all_probs = {
            _label_encoder['class_names'][i]: float(predictions[i])
            for i in range(len(predictions))
        }
        
        return {
            'class_id': class_id,
            'class_name': class_name,
            'confidence': round(confidence, 4),
            'is_attack': class_id != 0,  # 0 = BENIGN
            'all_probabilities': all_probs
        }
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return {
            'class_id': -1,
            'class_name': 'ERROR',
            'confidence': 0.0,
            'error': str(e)
        }


def get_class_names() -> list:
    """Get list of class names."""
    if _label_encoder is None:
        # Try to load just the label encoder
        _, label_encoder_path, _ = get_paths()
        if os.path.exists(label_encoder_path):
            with open(label_encoder_path, 'r') as f:
                encoder = json.load(f)
            return encoder['class_names']
        return ['BENIGN', 'DDOS', 'PROBE', 'WEB_ATTACK', 'BRUTE_FORCE', 'SPOOFING', 'MALWARE']
    return _label_encoder['class_names']


def is_ready() -> bool:
    """Check if the inference engine is ready."""
    model_path, label_encoder_path, _ = get_paths()
    return os.path.exists(model_path) and os.path.exists(label_encoder_path)


def get_status() -> dict:
    """Get the current status of the inference engine."""
    model_path, label_encoder_path, scaler_path = get_paths()
    
    return {
        'initialized': _initialized,
        'model_exists': os.path.exists(model_path),
        'label_encoder_exists': os.path.exists(label_encoder_path),
        'scaler_exists': os.path.exists(scaler_path),
        'model_path': model_path,
        'class_names': get_class_names(),
        'num_classes': NUM_CLASSES
    }


# Singleton inference engine instance for import
class InferenceEngine:
    """Wrapper class for easier import and usage."""
    
    def __init__(self):
        self._auto_init = False
    
    def predict(self, features: np.ndarray) -> dict:
        """Run multi-class prediction on features."""
        return predict(features)
    
    def get_class_names(self) -> list:
        """Get list of class names."""
        return get_class_names()
    
    def is_ready(self) -> bool:
        """Check if ready for inference."""
        return is_ready()
    
    def initialize(self) -> bool:
        """Initialize the engine."""
        return initialize()
    
    def status(self) -> dict:
        """Get status info."""
        return get_status()


# Create singleton instance
inference_engine = InferenceEngine()


if __name__ == "__main__":
    # Test the inference engine
    logging.basicConfig(level=logging.INFO)
    
    print("=" * 60)
    print("ML INFERENCE ENGINE TEST (Multi-Class)")
    print("=" * 60)
    
    status = get_status()
    print(f"\nStatus: {json.dumps(status, indent=2)}")
    
    if not status['model_exists']:
        print("\nERROR: Model not found. Train the FL model first.")
        exit(1)
    
    print("\nInitializing...")
    if initialize():
        print("Initialization successful!")
        
        # Generate a random test feature vector
        print("\nTesting with random features...")
        # Assuming 46 features like CICIDS2017
        test_features = np.random.randn(46).astype(np.float32)
        
        result = predict(test_features)
        print(f"\nPrediction Result:")
        print(f"  Class ID: {result['class_id']}")
        print(f"  Class Name: {result['class_name']}")
        print(f"  Confidence: {result['confidence']:.1%}")
        print(f"  Is Attack: {result.get('is_attack', 'N/A')}")
        
        if 'all_probabilities' in result:
            print(f"\n  All Probabilities:")
            for name, prob in result['all_probabilities'].items():
                print(f"    {name}: {prob:.1%}")
    else:
        print("Initialization failed!")

