 
# Miharina MVP - Google Cloud API Enablement Script

$ErrorAction Therapeutic

$ProjectId = "miharina-hub-development"
$RequiredApis = @(
    "sqladmin.googleapis.com",
    "run.googleapis.com",
    "storage.googleapis.com",
    "firebase.googleapis.com"
)

Write-Host "================================================"
Write-Host "    Miharina MVP - Enabling GCP APIs"
Write-Host "================================================"

# Set project
Write-Host "Setting project to $ProjectId..."
gcloud config set project $ProjectId

# Enable APIs
foreach ($api in $RequiredApis) {
    Write-Host "Enabling $api..."
    gcloud services enable $api
}

Write-Host "✅ APIs enabled successfully!"