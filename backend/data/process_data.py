import pandas as pd
import numpy as np
import os
import json
from sklearn.preprocessing import StandardScaler

# Constants
# Script is now in backend/data/
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Data file is in the same directory now
DATA_PATH = os.path.join(SCRIPT_DIR, 'data.csv')
LABEL_ENCODER_PATH = os.path.join(SCRIPT_DIR, 'label_encoder.json')
# Output partitions to partitions/ subdirectory
OUTPUT_DIR = os.path.join(SCRIPT_DIR, 'partitions')
PARTITION_NAMES = ['client_1.npz', 'client_2.npz', 'client_3.npz']

# Number of classes (0 = BENIGN, 1 = ATTACK)
NUM_CLASSES = 2

def load_label_encoder():
    """Load label encoder mapping from JSON file."""
    if not os.path.exists(LABEL_ENCODER_PATH):
        raise FileNotFoundError(f"Label encoder not found at {LABEL_ENCODER_PATH}")
    
    with open(LABEL_ENCODER_PATH, 'r') as f:
        encoder = json.load(f)
    
    print(f"Loaded label encoder with {len(encoder['label_mapping'])} mappings")
    print(f"Classes: {encoder['class_names']}")
    return encoder

def load_and_preprocess_data(label_encoder):
    print(f"Loading data from {DATA_PATH}...")
    df = pd.read_csv(DATA_PATH)
    
    # Get the label mapping
    label_mapping = label_encoder['label_mapping']
    
    # 2. Binary Label Mapping (BENIGN=0, ATTACK=1)
    print("Mapping labels to binary (BENIGN=0, ATTACK=1)...")
    
    # Map labels, default to -1 for unknown (will be filtered)
    df['label'] = df['label'].apply(lambda x: label_mapping.get(x, -1))
    
    # Count unknown labels
    unknown_count = (df['label'] == -1).sum()
    if unknown_count > 0:
        print(f"  WARNING: {unknown_count} samples with unknown labels will be dropped")
        df = df[df['label'] != -1]
    
    # 3. Drop non-numerical columns
    print("Dropping non-numerical columns...")
    df_numeric = df.select_dtypes(include=[np.number])
    
    # User Request: Handle NaN/Infinity
    print("Handling NaN and Infinity...")
    df_numeric = df_numeric.replace([np.inf, -np.inf], np.nan)
    df_numeric = df_numeric.dropna()
    
    # Ensure label is int
    df_numeric['label'] = df_numeric['label'].astype(int)
    
    # Print class distribution before balancing
    print("\nClass distribution before balancing:")
    for class_id in range(NUM_CLASSES):
        count = (df_numeric['label'] == class_id).sum()
        class_name = label_encoder['class_names'][class_id]
        print(f"  {class_id} ({class_name}): {count}")
    
    # Separate features and labels for SMOTE
    X = df_numeric.drop(columns=['label'])
    y = df_numeric['label']
    
    # 4. SMOTE + RandomUnderSampler Strategy
    # SMOTE creates synthetic samples by interpolating between minority class samples
    # RandomUnderSampler reduces majority classes to target size
    print("\nBalancing classes using SMOTE...")
    
    try:
        from imblearn.over_sampling import SMOTE
        from imblearn.under_sampling import RandomUnderSampler
        from imblearn.pipeline import Pipeline
    except ImportError:
        print("ERROR: imbalanced-learn not installed. Installing...")
        import subprocess
        subprocess.check_call(['pip', 'install', 'imbalanced-learn'])
        from imblearn.over_sampling import SMOTE
        from imblearn.under_sampling import RandomUnderSampler
        from imblearn.pipeline import Pipeline
    
    TARGET_PER_CLASS = 1000  # Target samples per class
    
    # Calculate sampling strategy
    # For SMOTE: oversample minority classes to at least k_neighbors + 1 or target
    # For RandomUnderSampler: undersample majority classes to target
    
    # Get current class counts
    class_counts = y.value_counts().to_dict()
    
    # SMOTE requires at least k_neighbors+1 samples (default k=5, so min 6)
    # We'll set k_neighbors dynamically based on smallest class
    min_class_count = min(class_counts.values())
    k_neighbors = min(5, min_class_count - 1) if min_class_count > 1 else 1
    print(f"  Using k_neighbors={k_neighbors} for SMOTE (min class has {min_class_count} samples)")
    
    # SMOTE strategy: oversample all minority classes to target
    smote_strategy = {}
    for class_id, count in class_counts.items():
        if count < TARGET_PER_CLASS:
            smote_strategy[class_id] = TARGET_PER_CLASS
    
    # Undersample strategy: reduce all majority classes to target
    under_strategy = {class_id: TARGET_PER_CLASS for class_id in class_counts.keys()}
    
    # Create pipeline: first SMOTE, then undersample
    pipeline = Pipeline([
        ('smote', SMOTE(sampling_strategy=smote_strategy, k_neighbors=k_neighbors, random_state=42)),
        ('undersample', RandomUnderSampler(sampling_strategy=under_strategy, random_state=42))
    ])
    
    print("  Applying SMOTE + RandomUnderSampler pipeline...")
    X_balanced, y_balanced = pipeline.fit_resample(X, y)
    
    # Create balanced dataframe
    df_balanced = pd.DataFrame(X_balanced, columns=X.columns)
    df_balanced['label'] = y_balanced
    
    # Print results
    print("\nClass distribution after SMOTE balancing:")
    for class_id in range(NUM_CLASSES):
        count = (y_balanced == class_id).sum()
        class_name = label_encoder['class_names'][class_id]
        original = class_counts.get(class_id, 0)
        if count > original:
            method = "SMOTE synthetic"
        elif count < original:
            method = "undersampled"
        else:
            method = "unchanged"
        print(f"  {class_id} ({class_name}): {count} ({method} from {original})")
    
    # Shuffle
    df_balanced = df_balanced.sample(frac=1, random_state=42).reset_index(drop=True)
    
    print(f"\n  Balanced dataset size: {len(df_balanced)}")

    return df_balanced

def process_partitions(df):
    # Separate features and target
    X = df.drop(columns=['label'])
    y = df['label']
    
    # 4. Normalize
    print("Normalizing features...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Save scaler parameters for inference
    scaler_params = {
        'mean': scaler.mean_.tolist(),
        'scale': scaler.scale_.tolist(),
        'feature_names': X.columns.tolist()
    }
    scaler_path = os.path.join(SCRIPT_DIR, 'scaler_params.json')
    with open(scaler_path, 'w') as f:
        json.dump(scaler_params, f, indent=2)
    print(f"Saved scaler parameters to {scaler_path}")
    
    # 5. Partitioning
    print("Partitioning data...")
    total_samples = len(y)
    indices = np.arange(total_samples)
    np.random.shuffle(indices)
    
    X_shuffled = X_scaled[indices]
    y_shuffled = y.iloc[indices].values
    
    # Split into 3
    partition_size = total_samples // 3
    
    partitions = []
    start = 0
    for i in range(3):
        end = start + partition_size
        # For the last one, take everything remaining to avoid off-by-one errors
        if i == 2:
            end = total_samples
            
        p_x = X_shuffled[start:end]
        p_y = y_shuffled[start:end]
        partitions.append((p_x, p_y))
        start = end
        
    return partitions

def save_partitions(partitions, label_encoder):
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        
    for i, (p_x, p_y) in enumerate(partitions):
        filename = os.path.join(OUTPUT_DIR, PARTITION_NAMES[i])
        print(f"Saving partition {i+1} to {filename}...")
        np.savez(filename, x=p_x, y=p_y)
        
        # Print Stats with class names
        print(f"Partition {i+1} Stats:")
        print(f"  Total samples: {len(p_y)}")
        for class_id in range(NUM_CLASSES):
            count = (p_y == class_id).sum()
            class_name = label_encoder['class_names'][class_id]
            print(f"  {class_id} ({class_name}): {count}")

def main():
    if not os.path.exists(DATA_PATH):
        print(f"Error: {DATA_PATH} not found.")
        return

    # Load label encoder
    label_encoder = load_label_encoder()
    
    df = load_and_preprocess_data(label_encoder)
    if df is None:
        print("Preprocessing failed.")
        return
        
    partitions = process_partitions(df)
    save_partitions(partitions, label_encoder)
    print("\nProcessing complete.")
    print(f"Generated {len(partitions)} partitions for binary classification (BENIGN vs ATTACK).")

if __name__ == "__main__":
    main()

