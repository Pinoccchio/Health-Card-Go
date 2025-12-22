# Test Cron Endpoint - Automatic No-Show Detection
# This script tests the cron job API endpoint

$token = "6e6a66756d9d2ad952598f78eda08b77e800b13e79406b1a5f77e9e1dc38ec44"
$baseUrl = "http://localhost:3000"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing No-Show Detection Cron Job" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check (GET)
Write-Host "Test 1: Health Check (GET request)" -ForegroundColor Yellow
Write-Host "URL: $baseUrl/api/cron/check-no-shows" -ForegroundColor Gray

try {
    $healthCheck = Invoke-RestMethod `
        -Uri "$baseUrl/api/cron/check-no-shows" `
        -Method GET

    Write-Host "✅ Health Check Passed!" -ForegroundColor Green
    Write-Host "Status: $($healthCheck.status)" -ForegroundColor Green
    Write-Host "Configured: $($healthCheck.configured)" -ForegroundColor Green
    Write-Host ""

} catch {
    Write-Host "❌ Health Check Failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 2: Trigger No-Show Detection (POST with Auth)
Write-Host "Test 2: Trigger No-Show Detection (POST request)" -ForegroundColor Yellow
Write-Host "URL: $baseUrl/api/cron/check-no-shows" -ForegroundColor Gray
Write-Host "Authorization: Bearer token (hidden)" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod `
        -Uri "$baseUrl/api/cron/check-no-shows" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }

    Write-Host "✅ No-Show Detection Executed Successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "RESULTS:" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    # Display stats
    Write-Host "Timestamp: $($response.timestamp)" -ForegroundColor White
    Write-Host "Success: $($response.success)" -ForegroundColor White
    Write-Host "Message: $($response.message)" -ForegroundColor White
    Write-Host ""

    Write-Host "Statistics:" -ForegroundColor Yellow
    Write-Host "  - Total Appointments Checked: $($response.stats.totalAppointmentsChecked)" -ForegroundColor White
    Write-Host "  - Total Marked as No-Show: $($response.stats.totalMarkedNoShow)" -ForegroundColor White
    Write-Host "  - Total Patients Suspended: $($response.stats.totalPatientsSuspended)" -ForegroundColor White
    Write-Host ""

    if ($response.stats.totalMarkedNoShow -gt 0) {
        Write-Host "Appointments Marked:" -ForegroundColor Yellow
        foreach ($apt in $response.stats.details.appointmentsMarked) {
            Write-Host "  - Appointment ID: $($apt.appointmentId)" -ForegroundColor White
            Write-Host "    Patient ID: $($apt.patientId)" -ForegroundColor White
            Write-Host "    Date: $($apt.appointmentDate)" -ForegroundColor White
            Write-Host "    No-Show Count: $($apt.noShowCount)" -ForegroundColor White
            Write-Host ""
        }
    }

    if ($response.stats.totalPatientsSuspended -gt 0) {
        Write-Host "Patients Suspended:" -ForegroundColor Red
        foreach ($patient in $response.stats.details.patientsSuspended) {
            Write-Host "  - Patient ID: $($patient.patientId)" -ForegroundColor White
            Write-Host "    Suspended Until: $($patient.suspendedUntil)" -ForegroundColor White
            Write-Host "    No-Show Count: $($patient.noShowCount)" -ForegroundColor White
            Write-Host ""
        }
    }

    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Full JSON Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10

} catch {
    Write-Host "❌ No-Show Detection Failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red

    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
