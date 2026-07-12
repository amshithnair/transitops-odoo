$ErrorActionPreference = "Stop"
$API_URL = "http://localhost:8000"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " TransitOps Backend API E2E Test (Docker)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Auth Login
Write-Host "1. Testing Auth Login..." -ForegroundColor Yellow
$loginPayload = @{
    email = "fleet@transitops.com"
    password = "Fleet@123"
}
$loginJson = $loginPayload | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method Post -Body $loginJson -ContentType "application/json"
$token = $loginResponse.access_token
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}
Write-Host "Login successful, got token!" -ForegroundColor Green

# 2. Get Vehicles and Drivers
Write-Host "2. Fetching Seeded Vehicles and Drivers..." -ForegroundColor Yellow
$vehicles = Invoke-RestMethod -Uri "$API_URL/vehicles" -Method Get -Headers $headers
$vehicle = $vehicles | Where-Object { $_.registration_number -eq "VAN-05" }
$drivers = Invoke-RestMethod -Uri "$API_URL/drivers" -Method Get -Headers $headers
$driver = $drivers | Where-Object { $_.name -eq "Alex Johnson" }
Write-Host "Fetched Vehicle: $($vehicle.registration_number)" -ForegroundColor Green
Write-Host "Fetched Driver: $($driver.name)" -ForegroundColor Green

# 3. Create and Dispatch Trip
Write-Host "3. Testing Trip Creation and Dispatch..." -ForegroundColor Yellow
$tripPayload = @{
    source = "Warehouse A"
    destination = "Store B"
    vehicle_id = $vehicle.id
    driver_id = $driver.id
    cargo_weight_kg = 500
    planned_distance_km = 100
    revenue = 2000
    dispatch = $true
}
$tripJson = $tripPayload | ConvertTo-Json

try {
    $trip = Invoke-RestMethod -Uri "$API_URL/trips" -Method Post -Body $tripJson -Headers $headers
    Write-Host "Trip Created and Dispatched! Status: $($trip.status)" -ForegroundColor Green
} catch {
    Write-Host "ERROR on Trip Creation: $($_.Exception.Message)" -ForegroundColor Red
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response Body: $responseBody" -ForegroundColor Red
    throw
}

# 4. Complete Trip
Write-Host "4. Testing Trip Completion..." -ForegroundColor Yellow
$completePayload = @{
    final_odometer = $vehicle.odometer_km + 105
    fuel_consumed = 15.5
    revenue = 2500
}
$completeJson = $completePayload | ConvertTo-Json
$completedTrip = Invoke-RestMethod -Uri "$API_URL/trips/$($trip.id)/complete" -Method Post -Body $completeJson -Headers $headers
Write-Host "Trip Completed! Status: $($completedTrip.status)" -ForegroundColor Green

# 5. Create Maintenance
Write-Host "5. Testing Maintenance Creation..." -ForegroundColor Yellow
$maintPayload = @{
    vehicle_label = $vehicle.registration_number
    service_type = "Routine Check"
    description = "Oil and brake inspection"
    cost = 150.0
    odometer_at_service_km = $completedTrip.actual_distance_km
}
$maintJson = $maintPayload | ConvertTo-Json
try {
    $maintenance = Invoke-RestMethod -Uri "$API_URL/maintenance" -Method Post -Body $maintJson -Headers $headers
    Write-Host "Maintenance Created! Status: $($maintenance.status)" -ForegroundColor Green
} catch {
    Write-Host "ERROR on Maintenance Creation: $($_.Exception.Message)" -ForegroundColor Red
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response Body: $responseBody" -ForegroundColor Red
    throw
}

# 6. Update/Close Maintenance
Write-Host "6. Testing Maintenance Update (Close)..." -ForegroundColor Yellow
$maintUpdatePayload = @{
    status = "Closed"
}
$maintUpdateJson = $maintUpdatePayload | ConvertTo-Json
$closedMaint = Invoke-RestMethod -Uri "$API_URL/maintenance/$($maintenance.id)" -Method Patch -Body $maintUpdateJson -Headers $headers
Write-Host "Maintenance Closed! Status: $($closedMaint.status)" -ForegroundColor Green

# 7. Predictive Maintenance Forecast
Write-Host "7. Testing Predictive Maintenance Forecast..." -ForegroundColor Yellow
$forecast = Invoke-RestMethod -Uri "$API_URL/maintenance/forecast" -Method Get -Headers $headers
Write-Host "Forecast generated for $($forecast.Length) vehicles." -ForegroundColor Green

# 8. Digital Vehicle Passport
Write-Host "8. Testing Digital Vehicle Passport..." -ForegroundColor Yellow
try {
    $passport = Invoke-RestMethod -Uri "$API_URL/vehicles/$($vehicle.id)/passport" -Method Get -Headers $headers
    Write-Host "Passport successfully retrieved!" -ForegroundColor Green
    Write-Host "Vehicle Reg: $($passport.vehicle.registration_number)" -ForegroundColor Green
    Write-Host "Total trips: $($passport.summary.total_trips)" -ForegroundColor Green
    Write-Host "Timeline events: $($passport.compliance_timeline.Length)" -ForegroundColor Green
    if ($passport.vehicle.documents.Length -gt 0) {
        Write-Host "Documents verified: $($passport.vehicle.documents[0].label)" -ForegroundColor Green
    }
} catch {
    Write-Host "ERROR on Digital Passport Retrieval: $($_.Exception.Message)" -ForegroundColor Red
    throw
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " All API Tests Passed Successfully! " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
