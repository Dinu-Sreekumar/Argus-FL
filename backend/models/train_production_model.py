import os
import sys
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_class_weight

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DATA_PATH = os.path.join(BACKEND_DIR, 'data', 'data.csv')
SAVE_DIR = os.path.join(SCRIPT_DIR, 'saved_models')

# Ensure save directory exists
os.makedirs(SAVE_DIR, exist_ok=True)

def load_and_preprocess_data():
    print(f"Loading data from {DATA_PATH}...")
    if not os.path.exists(DATA_PATH):
        print("Error: data.csv not found!")
        sys.exit(1)
        
    df = pd.read_csv(DATA_PATH)
    
    # Label Mapping
    print("Mapping labels...")
    df['label'] = df['label'].apply(lambda x: 0 if x == 'BenignTraffic' else 1)
    
    # Drop non-numerical
    df_numeric = df.select_dtypes(include=[np.number])
    df_numeric = df_numeric.replace([np.inf, -np.inf], np.nan).dropna()
    
    # Balance classes (Same logic as process_data.py for consistency)
    print("Balancing classes...")
    df_numeric['label'] = df_numeric['label'].astype(int)
    df_benign = df_numeric[df_numeric['label'] == 0]
    df_attack = df_numeric[df_numeric['label'] == 1]
    
    min_len = min(len(df_benign), len(df_attack))
    df_balanced = pd.concat([
        df_benign.sample(n=min_len, random_state=42),
        df_attack.sample(n=min_len, random_state=42)
    ]).sample(frac=1, random_state=42).reset_index(drop=True)
    
    X = df_balanced.drop(columns=['label'])
    y = df_balanced['label']
    
    # Normalize
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    return X_scaled, y

def create_model(input_shape):
    model = tf.keras.models.Sequential([
        tf.keras.layers.Dense(64, activation='relu', input_shape=(input_shape,)),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dense(1, activation='sigmoid')
    ])
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='binary_crossentropy',
        metrics=['accuracy']
    )
    return model

def main():
    print("Starting Production Model Training...")
    
    X, y = load_and_preprocess_data()
    
    # Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Class Weights
    class_weights = compute_class_weight(
        class_weight='balanced',
        classes=np.unique(y_train),
        y=y_train
    )
    class_weights_dict = dict(zip(np.unique(y_train), class_weights))
    
    # === SECURITY OPTIMIZATION: RECALL BOOST ===
    # Prioritize detecting attacks (Class 1) to reduce False Negatives
    if 1 in class_weights_dict:
        class_weights_dict[1] *= 1.2
        print(f"RECALL BOOST ACTIVATED: Applied 1.2x weight to Attack Class (New: {class_weights_dict[1]:.2f})")
    
    # Create and Train Model
    model = create_model(X_train.shape[1])
    
    # Define checkpoint to save only the best model
    model_path = os.path.join(SAVE_DIR, 'global_model.keras')
    checkpoint = tf.keras.callbacks.ModelCheckpoint(
        model_path,
        monitor='val_loss',
        verbose=1,
        save_best_only=True,
        mode='min'
    )
    
    print("Training model (20 epochs)...")
    model.fit(
        X_train, y_train,
        epochs=20,
        batch_size=64,
        validation_data=(X_test, y_test),
        class_weight=class_weights_dict,
        callbacks=[checkpoint],
        verbose=1
    )
    
    # Load best model for evaluation
    print(f"Loading best model from {model_path}...")
    best_model = tf.keras.models.load_model(model_path)
    
    # Evaluate
    loss, accuracy = best_model.evaluate(X_test, y_test)
    print(f"Final Test Accuracy (Best Model): {accuracy:.4f}")
    
    # Save call removed as Checkpoint handles it
    print(f"Production model saved to: {model_path}")

if __name__ == "__main__":
    main()
