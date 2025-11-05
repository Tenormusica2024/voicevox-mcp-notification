#!/bin/bash

# ========================================
# VOICEVOX MCP Notification System
# Integrated Startup Script (Mac/Linux)
# ========================================
echo
echo "========================================"
echo "VOICEVOX MCP Notification System"
echo "========================================"
echo

# 1. VOICEVOX Engine起動確認
echo "[1/4] Checking VOICEVOX Engine..."
if ! curl -s http://localhost:50021/version > /dev/null 2>&1; then
    echo "VOICEVOX Engine not running. Starting..."
    echo "Please wait for VOICEVOX to fully initialize..."
    
    # Mac: VOICEVOX.appを起動
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open -a VOICEVOX
    # Linux: voicevoxコマンドを起動
    else
        if command -v voicevox &> /dev/null; then
            voicevox &
        else
            echo "ERROR: VOICEVOX not found. Please install VOICEVOX first."
            exit 1
        fi
    fi
    
    sleep 10
    echo "Waiting for VOICEVOX Engine to be ready..."
    while ! curl -s http://localhost:50021/version > /dev/null 2>&1; do
        sleep 2
    done
    echo "VOICEVOX Engine started successfully."
else
    echo "VOICEVOX Engine already running."
fi
echo

# 2. VRM Bridge Server起動確認（オプション）
echo "[2/4] Checking VRM Bridge Server (optional)..."
if ! curl -s http://localhost:8765 > /dev/null 2>&1; then
    if [ -f "$HOME/vrm-bridge-server/index.js" ]; then
        echo "VRM Bridge Server not running. Starting..."
        node "$HOME/vrm-bridge-server/index.js" &
        sleep 5
        echo "VRM Bridge Server started."
    else
        echo "VRM Bridge Server not found (skipping - VRM integration is optional)."
    fi
else
    echo "VRM Bridge Server already running."
fi
echo

# 3. 依存関係確認
echo "[3/4] Checking Node.js dependencies..."
cd "$HOME/voicevox-mcp-notification"
if ! npm list > /dev/null 2>&1; then
    echo "Dependencies not installed. Running npm install..."
    npm install
else
    echo "Dependencies OK."
fi
echo

# 4. 動作確認
echo "[4/4] System health check..."
echo "- Node.js version:"
node -e "console.log('  ' + process.version)"
echo "- VOICEVOX API status:"
curl -s http://localhost:50021/version
echo

# 5. 完了報告
echo "========================================"
echo "System Ready!"
echo "========================================"
echo
echo "You can now use VOICEVOX MCP Notification in Claude Code."
echo
echo "To test the system, run:"
echo "  node \"$HOME/zundamon_speak.js\" \"Test message\""
echo

read -p "Press Enter to continue..."
