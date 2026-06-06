import sys, os

# Fix path so we can import from src/backend
PROJ_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(PROJ_ROOT, 'src', 'backend'))
from database import PWOSDatabase

db = PWOSDatabase()
conn = db.get_connection()
cursor = conn.cursor()

# Make the bad model inactive
cursor.execute("UPDATE model_versions SET is_active = FALSE")
# Reactivate our v2_suppression_225k model
cursor.execute("UPDATE model_versions SET is_active = TRUE WHERE version_tag = 'v2_suppression_225k'")
conn.commit()
conn.close()

# Tell MLPredictor to reload using the proper DB method
db.set_system_setting('model_needs_reload', 'true')

print("Rolled back to v2_suppression_225k successfully.")
