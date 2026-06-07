"""Register the currently trained model in the model_versions DB table."""
import sys, os, json

# Fix path so we can import from src/backend
PROJ_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(PROJ_ROOT, 'src', 'backend'))
from database import PWOSDatabase

META_PATH = os.path.join(PROJ_ROOT, 'src', 'backend', 'models', 'artifacts', 'model_metadata.json')
MODEL_PATH = os.path.join(PROJ_ROOT, 'src', 'backend', 'models', 'artifacts', 'rf_model.pkl')

with open(META_PATH) as f:
    meta = json.load(f)

db = PWOSDatabase()

version_tag = "v2_suppression_225k"
metrics = {
    'accuracy':  float(meta.get('accuracy', 0.0)),
    'precision': float(meta.get('metrics', {}).get('precision', 0.0)),
    'recall':    float(meta.get('metrics', {}).get('recall', 0.0)),
    'f1_score':  float(meta.get('metrics', {}).get('f1_score', 0.0)),
}
samples = int(meta.get('training_samples', 225000))

print(f"Registering model: {version_tag}")
print(f"  Accuracy:  {metrics['accuracy']:.4f}")
print(f"  Precision: {metrics['precision']:.4f}")
print(f"  Recall:    {metrics['recall']:.4f}")
print(f"  F1-Score:  {metrics['f1_score']:.4f}")
print(f"  Samples:   {samples:,}")
print(f"  Path:      {MODEL_PATH}")

db.log_model_version(version_tag, metrics, samples, MODEL_PATH)
print("\nDone — model registered in model_versions table.")
