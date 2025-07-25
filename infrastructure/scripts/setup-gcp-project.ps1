# Miharina MVP - Google Cloud Project Setup Script

$ErrorActionPreference = "Stop"

$ProjectId = "miharina-hub-dev"
$Region = "us-central1"
$Zone = "us-central1-a"

Write-Host "================================================"
Write-Host "    Miharina MVP - GCP Project Setup"
Write-Host "================================================"

# Set project
Write-Host "Setting project to $ProjectId..."
gcloud config set project $ProjectId

# Set default region and zone
Write-Host "Setting default region and zone..."
gcloud config set compute/region $Region
gcloud config set compute/zone $Zone

# Verify project access
Write-Host "Verifying project access..."
gcloud projects describe $ProjectId

Write-Host "✅ Google Cloud project setup complete!"
Write-Host "Current configuration:"
gcloud config list