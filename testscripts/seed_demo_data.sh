#!/bin/bash
set -e

# seed_demo_data.sh
# Seeding example workflow data for demo purposes.

echo "=============================================="
echo "Seeding TransitOps Demo Data..."
echo "=============================================="

# Run the python seeding function inside the backend container
docker compose exec -T backend python -c "
from app.database import SessionLocal
from app.seed import seed_database
db = SessionLocal()
seed_database(db)
db.close()
"

echo "Seeding complete!"
