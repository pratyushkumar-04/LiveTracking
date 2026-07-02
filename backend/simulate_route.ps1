# simulate_route.ps1
# PowerShell script to simulate a bus moving sequentially through Route 101 stops

$busId = 1
$routeName = "Route 101 - North Line"
$finalName = "School Campus"
$finalLat = 20.3504665
$finalLng = 85.8065029

# Define stops
$stops = @(
    @{ name = "Stop A - Master Canteen"; lat = 20.2980; lng = 85.8270 },
    @{ name = "Stop B - Jayadev Vihar"; lat = 20.2950; lng = 85.8210 },
    @{ name = "School Campus"; lat = 20.3504665; lng = 85.8065029 }
)

$startLat = 20.2910
$startLng = 85.8150

Write-Host "Starting Route Simulation for $routeName..." -ForegroundColor Cyan

# Leg 1: Start to Stop A
$nextStop = $stops[0]
$steps1 = 5
$latStep1 = ($nextStop.lat - $startLat) / $steps1
$lngStep1 = ($nextStop.lng - $startLng) / $steps1

for ($i = 0; $i -le $steps1; $i++) {
    $currentLat = $startLat + ($latStep1 * $i)
    $currentLng = $startLng + ($lngStep1 * $i)
    $speed = 35.0 + (Get-Random -Minimum -5 -Maximum 5)
    
    $body = @{
        busId = $busId
        latitude = $currentLat
        longitude = $currentLng
        speed = $speed
        destinationName = $nextStop.name
        destinationLatitude = $nextStop.lat
        destinationLongitude = $nextStop.lng
        routeName = $routeName
        nextStopName = $nextStop.name
        nextStopLatitude = $nextStop.lat
        nextStopLongitude = $nextStop.lng
        finalDestinationName = $finalName
        finalDestinationLatitude = $finalLat
        finalDestinationLongitude = $finalLng
    } | ConvertTo-Json

    Write-Host "Leg 1 (-> Stop A) Update $i - Lat=$currentLat, Lng=$currentLng, Next Stop=$($nextStop.name)" -ForegroundColor Yellow
    Invoke-RestMethod -Uri "http://localhost:8080/api/location/update" -Method Post -Body $body -ContentType "application/json"
    Start-Sleep -Seconds 1.5
}

# Leg 2: Stop A to Stop B
$startLat2 = $nextStop.lat
$startLng2 = $nextStop.lng
$nextStop = $stops[1]
$steps2 = 5
$latStep2 = ($nextStop.lat - $startLat2) / $steps2
$lngStep2 = ($nextStop.lng - $startLng2) / $steps2

for ($i = 1; $i -le $steps2; $i++) {
    $currentLat = $startLat2 + ($latStep2 * $i)
    $currentLng = $startLng2 + ($lngStep2 * $i)
    $speed = 35.0 + (Get-Random -Minimum -5 -Maximum 5)
    
    $body = @{
        busId = $busId
        latitude = $currentLat
        longitude = $currentLng
        speed = $speed
        destinationName = $nextStop.name
        destinationLatitude = $nextStop.lat
        destinationLongitude = $nextStop.lng
        routeName = $routeName
        nextStopName = $nextStop.name
        nextStopLatitude = $nextStop.lat
        nextStopLongitude = $nextStop.lng
        finalDestinationName = $finalName
        finalDestinationLatitude = $finalLat
        finalDestinationLongitude = $finalLng
    } | ConvertTo-Json

    Write-Host "Leg 2 (-> Stop B) Update $i - Lat=$currentLat, Lng=$currentLng, Next Stop=$($nextStop.name)" -ForegroundColor Yellow
    Invoke-RestMethod -Uri "http://localhost:8080/api/location/update" -Method Post -Body $body -ContentType "application/json"
    Start-Sleep -Seconds 1.5
}

# Leg 3: Stop B to School Campus
$startLat3 = $nextStop.lat
$startLng3 = $nextStop.lng
$nextStop = $stops[2]
$steps3 = 8
$latStep3 = ($nextStop.lat - $startLat3) / $steps3
$lngStep3 = ($nextStop.lng - $startLng3) / $steps3

for ($i = 1; $i -le $steps3; $i++) {
    $currentLat = $startLat3 + ($latStep3 * $i)
    $currentLng = $startLng3 + ($lngStep3 * $i)
    $speed = 35.0 + (Get-Random -Minimum -5 -Maximum 5)
    
    $body = @{
        busId = $busId
        latitude = $currentLat
        longitude = $currentLng
        speed = $speed
        destinationName = $nextStop.name
        destinationLatitude = $nextStop.lat
        destinationLongitude = $nextStop.lng
        routeName = $routeName
        nextStopName = $nextStop.name
        nextStopLatitude = $nextStop.lat
        nextStopLongitude = $nextStop.lng
        finalDestinationName = $finalName
        finalDestinationLatitude = $finalLat
        finalDestinationLongitude = $finalLng
    } | ConvertTo-Json

    Write-Host "Leg 3 (-> School) Update $i - Lat=$currentLat, Lng=$currentLng, Next Stop=$($nextStop.name)" -ForegroundColor Yellow
    Invoke-RestMethod -Uri "http://localhost:8080/api/location/update" -Method Post -Body $body -ContentType "application/json"
    Start-Sleep -Seconds 1.5
}

Write-Host "Route simulation completed!" -ForegroundColor Green
