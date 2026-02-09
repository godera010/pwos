import time
import numpy as np
import warnings

# Suppress warnings for cleaner output
warnings.filterwarnings("ignore")

print("="*50)
print("   SCIKIT-LEARN & INTEL ACCELERATION TEST")
print("="*50)

# 1. Check Scikit-learn Installation
try:
    import sklearn
    print(f"[OK] Scikit-learn installed: v{sklearn.__version__}")
except ImportError:
    print("[FAIL] Scikit-learn NOT installed!")
    exit(1)

# 2. Check Intel Acceleration
print("\n[INFO] Checking Acceleration Status...")
try:
    from sklearnex import patch_sklearn
    patch_sklearn()
    print("[OK] Intel Extension (sklearnex) is ACTIVE 🚀")
    print("     (Using Intel oneDAL optimized primitives)")
except ImportError:
    print("[NOTE] Intel Extension (sklearnex) NOT found.")
    print("     (Running in standard CPU mode)")
except Exception as e:
    print(f"[WARN] Failed to enable acceleration: {e}")
    print("     (Running in standard CPU mode)")

# 3. Functional Test (Mini Benchmark)
print("\n[TEST] Running functional benchmark...")
try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.datasets import make_classification
    
    # Generate large-ish synthetic data
    X, y = make_classification(n_samples=10000, n_features=20, random_state=42)
    
    # Train
    start_time = time.time()
    clf = RandomForestClassifier(n_estimators=100, n_jobs=-1, random_state=42)
    clf.fit(X, y)
    end_time = time.time()
    
    duration = end_time - start_time
    print(f"[OK] Random Forest trained successfully!")
    print(f"     Rows: 10,000 | Features: 20")
    print(f"     Time: {duration:.4f} seconds")
    
except Exception as e:
    print(f"[FAIL] Training failed: {e}")
    exit(1)

print("\n" + "="*50)
print("   TEST COMPLETE - SYSTEM READY")
print("="*50)
