import sys, os

sys.path.insert(0, os.path.join(os.getcwd(), 'src', 'backend'))
from database import PWOSDatabase

db = PWOSDatabase()
conn = db.get_connection()
cursor = conn.cursor()

# Delete models with accuracy >= 99.9% as they are poisoned
cursor.execute("DELETE FROM model_versions WHERE accuracy >= 0.999")
conn.commit()
conn.close()

print('Cleaned up poisoned models from DB.')
