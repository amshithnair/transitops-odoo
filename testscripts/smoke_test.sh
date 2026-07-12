#!/bin/bash
set -e

# smoke_test.sh
# Curl-based end-to-end smoke test of the TransitOps workflow.

API_URL=${VITE_API_URL:-"http://localhost:8000"}

echo "=============================================="
echo "TransitOps Curl-based Smoke Test"
echo "=============================================="
echo "API URL: $API_URL"

# 1. Login as fleet_manager to get JWT token
echo -n "1. Logging in as Fleet Manager... "
LOGIN_RESP=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "fleet@transitops.com", "password": "fleet123"}')

TOKEN=$(echo "$LOGIN_RESP" | grep -o '"access_token":"[^"]*' | grep -o '[^"]*$')
if [ -z "$TOKEN" ]; then
  echo "FAILED"
  echo "Login Response: $LOGIN_RESP"
  exit 1
fi
echo "SUCCESS (Token obtained)"

AUTH_HEADER="Authorization: Bearer $TOKEN"

# 2. Register a new vehicle
echo -n "2. Registering a new vehicle... "
VEHICLE_NUM="SMOKE-VEH-$(date +%s)"
VEHICLE_RESP=$(curl -s -X POST "$API_URL/vehicles" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "registration_number": "'"$VEHICLE_NUM"'",
    "name_model": "Smoke Test Van",
    "type": "Van",
    "max_load_capacity_kg": 3000.0,
    "odometer_km": 10000.0,
    "acquisition_cost": 50000.0,
    "status": "Available",
    "region": "South"
  }')

VEHICLE_ID=$(echo "$VEHICLE_RESP" | grep -o '"id":"[^"]*' | grep -o '[^"]*$')
if [ -z "$VEHICLE_ID" ]; then
  echo "FAILED"
  echo "Vehicle Response: $VEHICLE_RESP"
  exit 1
fi
echo "SUCCESS (ID: $VEHICLE_ID)"

# 3. Register a new driver
echo -n "3. Registering a new driver... "
DRIVER_LIC="LIC-$(date +%s)"
DRIVER_RESP=$(curl -s -X POST "$API_URL/drivers" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Smoke Driver",
    "license_number": "'"$DRIVER_LIC"'",
    "license_category": "B",
    "license_expiry_date": "2028-12-31",
    "contact_number": "+1-555-0000",
    "safety_score": 100.0,
    "status": "Available"
  }')

DRIVER_ID=$(echo "$DRIVER_RESP" | grep -o '"id":"[^"]*' | grep -o '[^"]*$')
if [ -z "$DRIVER_ID" ]; then
  echo "FAILED"
  echo "Driver Response: $DRIVER_RESP"
  exit 1
fi
echo "SUCCESS (ID: $DRIVER_ID)"

# 4. Create a Trip (Draft)
echo -n "4. Creating a new Trip (Draft)... "
TRIP_RESP=$(curl -s -X POST "$API_URL/trips" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "Warehouse X",
    "destination": "Retail Y",
    "vehicle_id": "'"$VEHICLE_ID"'",
    "driver_id": "'"$DRIVER_ID"'",
    "cargo_weight_kg": 1500.0,
    "planned_distance_km": 120.0,
    "revenue": 800.0
  }')

TRIP_ID=$(echo "$TRIP_RESP" | grep -o '"id":"[^"]*' | grep -o '[^"]*$')
if [ -z "$TRIP_ID" ]; then
  echo "FAILED"
  echo "Trip Response: $TRIP_RESP"
  exit 1
fi
echo "SUCCESS (ID: $TRIP_ID)"

# 5. Dispatch the Trip
echo -n "5. Dispatching the Trip... "
DISPATCH_RESP=$(curl -s -X POST "$API_URL/trips/$TRIP_ID/dispatch" \
  -H "$AUTH_HEADER")
TRIP_STATUS=$(echo "$DISPATCH_RESP" | grep -o '"status":"[^"]*' | grep -o '[^"]*$')
if [ "$TRIP_STATUS" != "Dispatched" ]; then
  echo "FAILED"
  echo "Dispatch Response: $DISPATCH_RESP"
  exit 1
fi
echo "SUCCESS (Status: $TRIP_STATUS)"

# 6. Complete the Trip
echo -n "6. Completing the Trip... "
COMPLETE_RESP=$(curl -s -X POST "$API_URL/trips/$TRIP_ID/complete" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "actual_distance_km": 118.5,
    "fuel_consumed_liters": 15.0,
    "final_odometer_km": 10118.5
  }')
TRIP_STATUS=$(echo "$COMPLETE_RESP" | grep -o '"status":"[^"]*' | grep -o '[^"]*$')
if [ "$TRIP_STATUS" != "Completed" ]; then
  echo "FAILED"
  echo "Complete Response: $COMPLETE_RESP"
  exit 1
fi
echo "SUCCESS (Status: $TRIP_STATUS)"

# 7. Create a Maintenance Log (Flips vehicle status to In Shop)
echo -n "7. Creating Maintenance Log... "
MAINT_RESP=$(curl -s -X POST "$API_URL/maintenance" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "'"$VEHICLE_ID"'",
    "service_type": "Standard Oil Change",
    "cost": 150.0
  }')
MAINT_ID=$(echo "$MAINT_RESP" | grep -o '"id":"[^"]*' | grep -o '[^"]*$')
if [ -z "$MAINT_ID" ]; then
  echo "FAILED"
  echo "Maintenance Response: $MAINT_RESP"
  exit 1
fi
echo "SUCCESS (ID: $MAINT_ID)"

# 8. Verify Reports (Fuel Efficiency, Utilization, Operational Cost, ROI)
echo "8. Verifying reports..."
REPORTS=("fuel-efficiency" "fleet-utilization" "operational-cost" "vehicle-roi")
for REPORT in "${REPORTS[@]}"; do
  echo -n "   - Fetching report '$REPORT'... "
  REPORT_RESP=$(curl -s -H "$AUTH_HEADER" "$API_URL/reports/$REPORT")
  if [[ "$REPORT_RESP" == *"detail"* || -z "$REPORT_RESP" ]]; then
    echo "FAILED"
    echo "Report Response: $REPORT_RESP"
    exit 1
  fi
  echo "SUCCESS"
done

echo "=============================================="
echo "SMOKE TEST PASSED SUCCESSFULLY!"
echo "=============================================="
