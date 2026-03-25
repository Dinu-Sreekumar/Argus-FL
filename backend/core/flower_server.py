"""
Standalone Flower Server Script.
This is spawned as a subprocess by server.py to avoid eventlet conflicts.
Usage: python flower_server.py <num_rounds> <round_offset>
"""
import sys
import os
import json
import logging
import numpy as np

# Suppress TensorFlow noise
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import tensorflow as tf
tf.get_logger().setLevel('ERROR')

import flwr as fl
from typing import List, Tuple, Optional, Dict, Union
from flwr.common import Scalar, parameters_to_ndarrays

# Configure logging
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger("FlowerServer")

class ArgusStrategy(fl.server.strategy.FedAvg):
    def __init__(self, round_offset=0):
        self.round_offset = round_offset
        self.final_parameters = None  # Track final aggregated weights
        self.best_parameters = None   # Track best performing weights
        self.best_loss = float('inf') # Track best loss
        super().__init__(
            min_fit_clients=3,
            min_evaluate_clients=3,
            min_available_clients=3,
        )
    
    def aggregate_fit(self, server_round, results, failures):
        """Aggregate model updates and store final parameters for saving."""
        aggregated_parameters, aggregated_metrics = super().aggregate_fit(
            server_round, results, failures
        )
        
        # Store the latest aggregated parameters for model saving
        if aggregated_parameters is not None:
            self.final_parameters = aggregated_parameters
            
        return aggregated_parameters, aggregated_metrics

    def aggregate_evaluate(
        self,
        server_round: int,
        results: List[Tuple[fl.server.client_proxy.ClientProxy, fl.common.EvaluateRes]],
        failures: List[Union[Tuple[fl.server.client_proxy.ClientProxy, fl.common.EvaluateRes], BaseException]],
    ) -> Tuple[Optional[float], Dict[str, Scalar]]:
        """Aggregate evaluation metrics using weighted average."""
        
        if not results:
            return None, {}
        
        aggregated_loss, aggregated_metrics = super().aggregate_evaluate(server_round, results, failures)

        # Get sample counts for weighted averaging
        examples = [r.num_examples for _, r in results]
        total_examples = sum(examples)
        
        # Weighted average for accuracy (existing)
        accuracies = [r.metrics["accuracy"] * r.num_examples for _, r in results]
        accuracy = sum(accuracies) / total_examples if total_examples > 0 else 0
        
        # === SECURITY OPERATOR METRICS ===
        # Weighted average for F1-Score, precision, recall
        f1_scores = [r.metrics.get("f1_score", 0) * r.num_examples for _, r in results]
        precisions = [r.metrics.get("precision", 0) * r.num_examples for _, r in results]
        recalls = [r.metrics.get("recall", 0) * r.num_examples for _, r in results]
        
        f1_score = sum(f1_scores) / total_examples if total_examples > 0 else 0
        precision = sum(precisions) / total_examples if total_examples > 0 else 0
        recall = sum(recalls) / total_examples if total_examples > 0 else 0
        
        # Sum confusion matrix values across all clients
        tp = sum(r.metrics.get("tp", 0) for _, r in results)
        tn = sum(r.metrics.get("tn", 0) for _, r in results)
        fp = sum(r.metrics.get("fp", 0) for _, r in results)
        fn = sum(r.metrics.get("fn", 0) for _, r in results)
        
        # Check if this is the best model so far
        if aggregated_loss is not None and aggregated_loss < self.best_loss:
            self.best_loss = aggregated_loss
            self.best_parameters = self.final_parameters

        global_round = server_round + self.round_offset

        # Write extended metrics to a file that the main process can read
        # Go up one level from core/ to backend/
        metrics_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'training_metrics.json')
        with open(metrics_file, 'w') as f:
            json.dump({
                'round': global_round,
                'accuracy': round(accuracy, 4),
                'loss': round(aggregated_loss, 4) if aggregated_loss else 0,
                'f1_score': round(f1_score, 4),
                'precision': round(precision, 4),
                'recall': round(recall, 4),
                'tp': int(tp),
                'tn': int(tn),
                'fp': int(fp),
                'fn': int(fn)
            }, f)

        return aggregated_loss, aggregated_metrics


def save_global_model(strategy, script_dir):
    """Save the trained global model to disk."""
    
    # Prioritize the Best Model (Official Checkpoint)
    if strategy.best_parameters is not None:
        params_to_save = strategy.best_parameters
    elif strategy.final_parameters is not None:
        logger.warning("Best model not found, saving FINAL model instead.")
        params_to_save = strategy.final_parameters
    else:
        logger.warning("No parameters to save - training may not have completed")
        return False
    
    try:
        # Extract weights from Flower parameters
        weights = parameters_to_ndarrays(params_to_save)
        
        # Determine input shape from first layer weights
        input_shape = weights[0].shape[0]
        
        # Recreate the model architecture (must match client.py - binary classification)
        NUM_CLASSES = 2
        model = tf.keras.models.Sequential([
            tf.keras.layers.Dense(128, activation='relu', input_shape=(input_shape,)),
            tf.keras.layers.Dropout(0.3),
            tf.keras.layers.Dense(64, activation='relu'),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(32, activation='relu'),
            tf.keras.layers.Dense(1, activation='sigmoid')  # Binary output
        ])
        
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
            loss='binary_crossentropy',  # Binary loss
            metrics=['accuracy']
        )
        
        # Set the trained weights
        model.set_weights(weights)
        
        # Create save directory
        # script_dir is backend/core/, so we go up one level to backend/
        backend_dir = os.path.dirname(script_dir)
        save_dir = os.path.join(backend_dir, 'models', 'saved_models')
        os.makedirs(save_dir, exist_ok=True)
        
        # Save the model
        filename = sys.argv[3] if len(sys.argv) > 3 else 'demo_model.keras'
        model_path = os.path.join(save_dir, filename)
        model.save(model_path)
        
        # Save metadata
        metadata = {
            'input_shape': input_shape,
            'num_classes': NUM_CLASSES,
            'architecture': '128-64-32-1',
            'saved_at': str(np.datetime64('now'))
        }
        metadata_path = os.path.join(save_dir, 'model_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to save model: {e}")
        return False


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python flower_server.py <num_rounds> <round_offset>")
        sys.exit(1)
    
    num_rounds = int(sys.argv[1])
    round_offset = int(sys.argv[2])
    
    # Get script directory for saving model
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    strategy = ArgusStrategy(round_offset=round_offset)
    

    
    try:
        fl.server.start_server(
            server_address="0.0.0.0:8080",
            config=fl.server.ServerConfig(num_rounds=num_rounds),
            strategy=strategy
        )
        

        
        # === SAVE THE TRAINED GLOBAL MODEL ===
        save_global_model(strategy, script_dir)
        
        # Write completion marker
        complete_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'training_complete.json')
        with open(complete_file, 'w') as f:
            json.dump({'status': 'finished'}, f)
    except Exception as e:
        logger.error(f"Flower server error: {e}")
        error_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'training_error.json')
        with open(error_file, 'w') as f:
            json.dump({'error': str(e)}, f)

