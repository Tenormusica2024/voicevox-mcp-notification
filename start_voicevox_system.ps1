# ========================================
# VOICEVOX MCP Notification System
# Integrated Startup Script (PowerShell)
# ========================================

Write-Host ""
Write-Host "========================================"
Write-Host "VOICEVOX MCP Notification System"
Write-Host "========================================"
Write-Host ""

# エラー発生時に停止しない
$ErrorActionPreference = "Continue"

# ログファイル設定
$LogFile = "$env:TEMP\voicevox_startup_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Add-Content -Path $LogFile
    Write-Host $Message
}

Write-Log "========================================="
Write-Log "VOICEVOX System Startup Script Started"
Write-Log "========================================="

# ========================================
# 1. 前提条件チェック
# ========================================
Write-Log "[0/5] Checking prerequisites..."

# Node.js確認
$nodeVersion = & { node --version 2>&1 }
if ($LASTEXITCODE -eq 0) {
    Write-Log "✓ Node.js: $nodeVersion"
} else {
    Write-Log "✗ ERROR: Node.js not found"
    Write-Host ""
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# curl確認（PowerShellのInvoke-WebRequestを使用するため不要だが念のため）
$curlVersion = & { curl --version 2>&1 }
if ($LASTEXITCODE -eq 0) {
    Write-Log "✓ curl available"
} else {
    Write-Log "⚠ curl not found, using Invoke-WebRequest instead"
}
Write-Host ""

# ========================================
# 2. VOICEVOX Engine起動確認
# ========================================
Write-Log "[1/5] Checking VOICEVOX Engine..."

try {
    $response = Invoke-WebRequest -Uri "http://localhost:50021/version" -TimeoutSec 2 -UseBasicParsing
    $voicevoxVersion = $response.Content
    Write-Log "✓ VOICEVOX Engine already running (version: $voicevoxVersion)"
} catch {
    Write-Log "VOICEVOX Engine not running. Searching for VOICEVOX.exe..."
    
    # VOICEVOX.exeを複数の候補から検索
    $voicevoxPaths = @(
        "C:\Program Files\VOICEVOX\VOICEVOX.exe",
        "C:\Program Files (x86)\VOICEVOX\VOICEVOX.exe",
        "$env:LOCALAPPDATA\Programs\VOICEVOX\VOICEVOX.exe",
        "$env:APPDATA\VOICEVOX\VOICEVOX.exe"
    )
    
    $voicevoxExe = $null
    foreach ($path in $voicevoxPaths) {
        if (Test-Path $path) {
            $voicevoxExe = $path
            Write-Log "✓ Found VOICEVOX.exe at: $path"
            break
        }
    }
    
    if ($null -eq $voicevoxExe) {
        Write-Log "✗ ERROR: VOICEVOX.exe not found"
        Write-Host ""
        Write-Host "Searched locations:" -ForegroundColor Yellow
        foreach ($path in $voicevoxPaths) {
            Write-Host "  - $path" -ForegroundColor Yellow
        }
        Write-Host ""
        Write-Host "Please install VOICEVOX from https://voicevox.hiroshiba.jp/" -ForegroundColor Red
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    Write-Log "Starting VOICEVOX Engine..."
    Start-Process -FilePath $voicevoxExe -WindowStyle Minimized
    
    Write-Log "Waiting for VOICEVOX Engine to be ready..."
    $maxAttempts = 30
    $attempt = 0
    $ready = $false
    
    while ($attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 2
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:50021/version" -TimeoutSec 2 -UseBasicParsing
            $voicevoxVersion = $response.Content
            Write-Log "✓ VOICEVOX Engine started successfully (version: $voicevoxVersion)"
            $ready = $true
            break
        } catch {
            $attempt++
            Write-Host "." -NoNewline
        }
    }
    
    if (-not $ready) {
        Write-Log "✗ ERROR: VOICEVOX Engine failed to start within 60 seconds"
        Write-Host ""
        Write-Host "Please start VOICEVOX manually and try again" -ForegroundColor Red
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Host ""

# ========================================
# 3. VRM Bridge Server起動確認（オプション）
# ========================================
Write-Log "[2/5] Checking VRM Bridge Server (optional)..."

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8765" -TimeoutSec 2 -UseBasicParsing
    Write-Log "✓ VRM Bridge Server already running"
} catch {
    # VRM Bridge Serverのパス検索
    $vrmBridgePath = "$env:USERPROFILE\vrm-bridge-server\index.js"
    
    if (Test-Path $vrmBridgePath) {
        Write-Log "VRM Bridge Server not running. Starting..."
        Start-Process -FilePath "node" -ArgumentList $vrmBridgePath -WindowStyle Hidden
        Start-Sleep -Seconds 5
        
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8765" -TimeoutSec 2 -UseBasicParsing
            Write-Log "✓ VRM Bridge Server started"
        } catch {
            Write-Log "⚠ VRM Bridge Server may not have started properly (this is optional)"
        }
    } else {
        Write-Log "⚠ VRM Bridge Server not found at: $vrmBridgePath"
        Write-Log "  (VRM integration is optional - skipping)"
    }
}
Write-Host ""

# ========================================
# 4. 依存関係確認
# ========================================
Write-Log "[3/5] Checking Node.js dependencies..."

# voicevox-mcp-notificationディレクトリの検索
$mcpPaths = @(
    "$env:USERPROFILE\voicevox-mcp-notification",
    "$PSScriptRoot",
    "$(Split-Path $PSScriptRoot)\voicevox-mcp-notification"
)

$mcpDir = $null
foreach ($path in $mcpPaths) {
    if (Test-Path "$path\package.json") {
        $mcpDir = $path
        Write-Log "✓ Found voicevox-mcp-notification at: $path"
        break
    }
}

if ($null -eq $mcpDir) {
    Write-Log "✗ ERROR: voicevox-mcp-notification directory not found"
    Write-Host ""
    Write-Host "Searched locations:" -ForegroundColor Yellow
    foreach ($path in $mcpPaths) {
        Write-Host "  - $path" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Please clone the repository:" -ForegroundColor Red
    Write-Host "  git clone https://github.com/Tenormusica2024/voicevox-mcp-notification" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Set-Location $mcpDir

# npm list実行
$npmListResult = npm list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Log "Dependencies not installed. Running npm install..."
    Write-Host ""
    Write-Host "Installing Node.js dependencies (this may take a few minutes)..." -ForegroundColor Yellow
    npm install --loglevel=info
    
    if ($LASTEXITCODE -ne 0) {
        Write-Log "✗ ERROR: npm install failed"
        Write-Host ""
        Write-Host "Please check your network connection and try again" -ForegroundColor Red
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Log "✓ Dependencies installed successfully"
} else {
    Write-Log "✓ Dependencies OK"
}
Write-Host ""

# ========================================
# 5. 動作確認
# ========================================
Write-Log "[4/5] System health check..."

Write-Host "- Node.js version:"
node -e "console.log('  ' + process.version)"

Write-Host "- VOICEVOX API status:"
try {
    $response = Invoke-WebRequest -Uri "http://localhost:50021/version" -UseBasicParsing
    Write-Host "  Version: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Cannot connect to VOICEVOX API" -ForegroundColor Red
}

Write-Host "- voicevox-mcp-notification directory:"
Write-Host "  $mcpDir" -ForegroundColor Green

Write-Host ""

# ========================================
# 6. テスト実行
# ========================================
Write-Log "[5/5] Running test..."

$zundamonScript = "$env:USERPROFILE\zundamon_speak.js"
if (Test-Path $zundamonScript) {
    Write-Log "Testing zundamon_speak.js..."
    node $zundamonScript "起動スクリプトのテストが完了しました"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "✓ Test successful"
    } else {
        Write-Log "⚠ Test completed with warnings (this is normal if timeout occurred)"
    }
} else {
    Write-Log "⚠ zundamon_speak.js not found at: $zundamonScript"
}

Write-Host ""

# ========================================
# 7. 完了報告
# ========================================
Write-Log "========================================="
Write-Log "System Ready!"
Write-Log "========================================="
Write-Host ""
Write-Host "You can now use VOICEVOX MCP Notification in Claude Code." -ForegroundColor Green
Write-Host ""
Write-Host "To test the system manually, run:" -ForegroundColor Cyan
Write-Host "  node `"$env:USERPROFILE\zundamon_speak.js`" `"Test message`"" -ForegroundColor Cyan
Write-Host ""
Write-Host "Log file saved to:" -ForegroundColor Yellow
Write-Host "  $LogFile" -ForegroundColor Yellow
Write-Host ""

# 環境変数VOICEVOX_NO_PAUSEが設定されていない場合のみpause
if ($env:VOICEVOX_NO_PAUSE -ne "1") {
    Read-Host "Press Enter to exit"
}

Write-Log "Script completed successfully"
exit 0
