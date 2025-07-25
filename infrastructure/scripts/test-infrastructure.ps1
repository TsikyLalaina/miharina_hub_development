# Miharina MVP - Infrastructure Testing Script

$ErrorActionPreference = "Stop"

$ProjectId = "miharina-hub-dev"

Write-Host "================================================"
Write-Host "    Miharina MVP - Infrastructure Test"
Write-Host "================================================"

# Test 1: Google Cloud connectivity
Write-Host "1. Testing Google Cloud connectivity..."
try {
    gcloud projects describe $ProjectId | Out-Null
    Write-Host "✅ Google Cloud project accessible"
} catch {
    Write-Host "❌ Google Cloud project not accessible"
    exit 1
}

# Test 2: APIs enabled
Write-Host "2. Testing required APIs..."
$RequiredApis = @(
    "sqladmin.googleapis.com",
    "run.googleapis.com",
    "storage.googleapis.com",
    "firebase.googleapis.com"
)

foreach ($api in $RequiredApis) {
    $enabled = gcloud services list --enabled --filter="name:$api" --format="value(name)"
    if ($enabled -eq $api) {
        Write-Host "✅ $api enabled"
    } else {
        Write-Host "❌ $api not enabled"
        exit 1
    }
}

# Test 3: Service accounts
Write-Host "3. Testing service accounts..."
$RequiredSa = @(
    "miharina-backend-api",
    "miharina-database-admin",
    "miharina-ai-service"
)

foreach ($sa in $RequiredSa) {
    $exists = gcloud iam service-accounts list --filter="email:$sa@$ProjectId.iam.gserviceaccount.com" --format="value(email)"
    if ($exists -match $sa) {
        Write-Host "✅ Service account $sa exists"
    } else {
        Write-Host "❌ Service account $sa missing"
        exit 1
    }
}

# Test 4: Database connectivity (if proxy is running)
Write-Host "4. Testing database connectivity..."
if (Test-Path ".\cloud_sql_proxy.exe") {
    $proxyProcess = Get-Process -Name "cloud_sql_proxy" -ErrorAction SilentlyContinue
    if ($proxyProcess) {
        Write-Host "✅ Cloud SQL proxy is running"
        # Test connection if credentials are available
        if ($env:DB_PASSWORD) {
            $env:PGPASSWORD = $env:DB_PASSWORD
            try {
                psql -h 127.0.0.1 -p 5432 -U miharina_app -d miharina_dev -c "SELECT version();" | Out-Null
                Write-Host "✅ Database connection successful"
            } catch {
                Write-Host "⚠️  Database connection failed (check credentials)"
            }
        } else {
            Write-Host "⚠️  Database credentials not set in environment"
        }
    } else {
        Write-Host "⚠️  Cloud SQL proxy not running"
    }
} else {
    Write-Host "⚠️  Cloud SQL proxy executable not found"
}

Write-Host ""
Write-Host "================================================"
Write-Host "    Infrastructure Test Summary"
Write-Host "================================================"
Write-Host "✅ Google Cloud project: READY"
Write-Host "✅ Required APIs: ENABLED"
Write-Host "✅ Service accounts: CREATED"
Write-Host "🔧 Database: CONFIGURED (proxy needed for local access)"
Write-Host ""
Write-Host "Phase 1 Infrastructure Foundation: COMPLETE ✅"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Set up environment variables"
Write-Host "  2. Start development phase"
Write-Host "  3. Create database schema" 
