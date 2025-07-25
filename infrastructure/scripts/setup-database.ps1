# Miharina MVP - Database Setup Script

$ErrorActionPreference = "Stop"

$ProjectId = "miharina-hub-dev"
$InstanceName = "miharina-main-db"
$DbName = "miharina_dev"
$DbUser = "miharina_app"

Write-Host "Setting up Cloud SQL database for Miharina..."

# Create Cloud SQL instance
Write-Host "Creating Cloud SQL instance..."
gcloud sql instances create $InstanceName `
    --database-version=POSTGRES_13 `
    --tier=db-f1-micro `
    --region=us-central1 `
    --storage-type=SSD `
    --storage-size=10GB `
    --backup-start-time=03:00 `
    --maintenance-window-day=SUN `
    --maintenance-window-hour=04

Write-Host "Waiting for instance to be ready..."
gcloud sql instances describe $InstanceName --format="value(state)"

# Generate and set root password
Write-Host "Setting root password..."
$DbRootPassword = [Convert]::ToBase64String((New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes(32))
gcloud sql users set-password postgres `
    --instance=$InstanceName `
    --password=$DbRootPassword

Write-Host "Root password: $DbRootPassword"
Write-Host "⚠️  SAVE THIS PASSWORD SECURELY!"

# Create application user
Write-Host "Creating application user..."
$DbAppPassword = [Convert]::ToBase64String((New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes(32))
gcloud sql users create $DbUser `
    --instance=$InstanceName `
    --password=$DbAppPassword

Write-Host "App user password: $DbAppPassword"
Write-Host "⚠️  SAVE THIS PASSWORD SECURELY!"

# Create database
Write-Host "Creating application database..."
gcloud sql databases create $DbName --instance=$InstanceName

Write-Host "✅ Database setup complete!"
Write-Host "Connection details:"
Write-Host "  Instance: $InstanceName"
Write-Host "  Database: $DbName"
Write-Host "  User: $DbUser"
Write-Host "  Connection name: $ProjectId:us-central1:$InstanceName" 
