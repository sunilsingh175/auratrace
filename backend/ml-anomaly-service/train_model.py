import pickle
import os
import numpy as np
from sklearn.ensemble import IsolationForest

def train():
    print("Training dummy Isolation Forest for Log Length & Error Frequency...")
    # Synthetic normal training data
    X_train = np.random.normal(loc=[100, 0.1], scale=[20, 0.05], size=(1000, 2))
    
    model = IsolationForest(contamination=0.05, random_state=42)
    model.fit(X_train)
    
    model_path = os.path.join(os.path.dirname(__file__), "isolation_forest.pkl")
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    train()