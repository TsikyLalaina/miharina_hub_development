 
# Miharina MVP - Service Account Creation Script

$ErrorActionPreference = "Stop"

$ProjectId = "miharina-hub-dev"

Write-Host "Creating service accounts for Miharina MVP..."

# Backend API Service Account
Write-Host "Creating backend API service account..."
gcloud iam service-accounts create miharina-backend-api `
    --display-name="Miharina Backend API Service Account" `
    --description="Service account for Miharina backend API operations"

# Frontend Deploy Service Account
Write-Host "Creating frontend deploy service account..."
gcloud iam service-accounts create miharina-frontend-deploy `
    --display-name="Miharina Frontend Deploy Service Account" `
    --description="Service account for Miharina frontend deployment"

# Database Admin Service Account
Write-Host "Creating database admin service account..."
gcloud iam service-accounts create miharina-database-admin `
    --display-name="Miharina Database Admin Service Account" `
    --description="Service account for Miharina database administration"

# AI Service Account
Write-Host "Creating AI service account..."
gcloud iam service-accounts create miharina-ai-service `
    --display-name="Miharina AI Service Account" `
    --description="Service account for Miharina AI and ML operations"

Write-Host "✅ All service accounts created successfully!"

Write-Host "Setting up IAM roles..."

# Backend API permissions
gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:miharina-backend-api@$ProjectId.iam.gserviceaccount.com" `
    --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:miharina-backend-api@$ProjectId.iam.gserviceaccount.com" `
    --role="roles/storage.objectAdmin"

# Database admin permissions
gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:miharina-database-admin@$ProjectId.iam.gserviceaccount.com" `
    --role="roles/cloudsql.admin"

Write-Host "✅ IAM roles configured successfully!"