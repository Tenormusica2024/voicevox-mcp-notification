@echo off
REM ========================================
REM VOICEVOX MCP Notification System
REM Integrated Startup Script
REM ========================================
echo.
echo ========================================
echo VOICEVOX MCP Notification System
echo ========================================
echo.

REM 1. VOICEVOX Engine起動確認
echo [1/4] Checking VOICEVOX Engine...
curl -s http://localhost:50021/version >nul 2>&1
if %errorlevel% neq 0 (
    echo VOICEVOX Engine not running. Starting...
    echo Please wait for VOICEVOX to fully initialize...
    start "" "C:\Program Files\VOICEVOX\VOICEVOX.exe"
    timeout /t 10 /nobreak >nul
    echo Waiting for VOICEVOX Engine to be ready...
    :wait_voicevox
    curl -s http://localhost:50021/version >nul 2>&1
    if %errorlevel% neq 0 (
        timeout /t 2 /nobreak >nul
        goto wait_voicevox
    )
    echo VOICEVOX Engine started successfully.
) else (
    echo VOICEVOX Engine already running.
)
echo.

REM 2. VRM Bridge Server起動確認（オプション）
echo [2/4] Checking VRM Bridge Server (optional)...
curl -s http://localhost:8765 >nul 2>&1
if %errorlevel% neq 0 (
    if exist "C:\Users\Tenormusica\vrm-bridge-server\index.js" (
        echo VRM Bridge Server not running. Starting...
        start /B node "C:\Users\Tenormusica\vrm-bridge-server\index.js"
        timeout /t 5 /nobreak >nul
        echo VRM Bridge Server started.
    ) else (
        echo VRM Bridge Server not found (skipping - VRM integration is optional).
    )
) else (
    echo VRM Bridge Server already running.
)
echo.

REM 3. 依存関係確認
echo [3/4] Checking Node.js dependencies...
cd "C:\Users\Tenormusica\voicevox-mcp-notification"
npm list >nul 2>&1
if %errorlevel% neq 0 (
    echo Dependencies not installed. Running npm install...
    npm install
) else (
    echo Dependencies OK.
)
echo.

REM 4. 動作確認
echo [4/4] System health check...
echo - Node.js version:
node -e "console.log('  ' + process.version)"
echo - VOICEVOX API status:
curl -s http://localhost:50021/version
echo.

REM 5. 完了報告
echo ========================================
echo System Ready!
echo ========================================
echo.
echo You can now use VOICEVOX MCP Notification in Claude Code.
echo.
echo To test the system, run:
echo   node "C:\Users\Tenormusica\zundamon_speak.js" "Test message"
echo.
pause
