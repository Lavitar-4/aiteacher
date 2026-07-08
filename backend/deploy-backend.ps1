# Google Cloud Run Deployment Script for Physics AI Backend
# Make sure you have installed the Google Cloud CLI (gcloud) from: https://cloud.google.com/sdk/docs/install
# Then run: gcloud auth login

$PROJECT_ID = "physicsai-27c2f"
$SERVICE_NAME = "physics-ai-backend"
$REGION = "us-central1"

# Add gcloud to PATH temporarily if it's installed in the default AppData location
$gcloudPath = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin"
if (Test-Path "$gcloudPath\gcloud.cmd") {
    $env:PATH = "$gcloudPath;$env:PATH"
}

Write-Host "Deploying Backend to Google Cloud Run..." -ForegroundColor Cyan

gcloud run deploy $SERVICE_NAME `
    --source . `
    --project $PROJECT_ID `
    --region $REGION `
    --allow-unauthenticated `
    --port 8080 `
    --set-env-vars GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"

Write-Host "Deployment Complete!" -ForegroundColor Green
