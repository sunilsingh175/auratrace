# AuraTrace - Telemetry Ingestion Test Script
$API_KEY = "c3ddb967bbe1d7f25d44a09922e11f8a"

$body = @{
    event_type = "crash"
    service_name = "payment-service"
    error_type = "NullPointerException"
    error_message = "Cannot read property 'amount' of undefined in processPayment"
    stack_trace = "at processPayment (payment.js:42:15)`nat checkout (checkout.js:18:3)"
    latency_ms = 4200
} | ConvertTo-Json

Write-Host "`n🚀 Sending Telemetry Crash Event to Ingestion Gateway..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/v1/ingest" `
        -Method Post `
        -Headers @{ "X-API-Key" = $API_KEY } `
        -Body $body `
        -ContentType "application/json"

    Write-Host "`n✅ Crash telemetry event accepted!" -ForegroundColor Green
    Write-Host "   Status:             $($response.status)" -ForegroundColor Cyan
    Write-Host "   Event ID:           $($response.event_id)" -ForegroundColor Cyan
    Write-Host "   Incident Signature: $($response.incident_signature)" -ForegroundColor Cyan
    Write-Host "`n⏳ Wait 5-10 seconds for Isolation Forest scoring and RAG Doctor diagnosis, then refresh dashboard at http://localhost:3000" -ForegroundColor Yellow
} catch {
    Write-Host "`n❌ Error sending telemetry event: $_" -ForegroundColor Red
}
