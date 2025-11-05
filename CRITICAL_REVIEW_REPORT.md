# VOICEVOX Startup Script - Critical Review Report

## 検証日時
2025-11-05 14:40

## 検証環境
- OS: Windows 10/11
- Node.js: v22.18.0
- VOICEVOX Engine: v0.24.1 (起動中)
- VRM Bridge Server: 未インストール

---

## 🔴 CRITICAL ISSUES（致命的問題）

### 1. Bashからの.batファイル実行不可
**問題:**
- Claude CodeのBash toolから`.bat`ファイルを直接実行できない
- `start_voicevox_system.bat: command not found` エラー発生

**影響:**
- ユーザーは手動でダブルクリック実行する必要がある
- Claude Codeから自動起動できない
- ドキュメントで「Claude Codeと統合」を謳っているが実際は手動実行のみ

**根本原因:**
- Bash環境では.batファイルは実行できない
- `cmd /c` 経由でも出力を取得できない（新しいcmdウィンドウが開く）

**解決策:**
1. **PowerShellスクリプト版を追加**（推奨）
   - `start_voicevox_system.ps1` を作成
   - BashからPowerShellを呼び出し可能
   - 出力も取得可能

2. **Node.jsスクリプト版を追加**
   - `start_voicevox_system.js` を作成
   - クロスプラットフォーム対応
   - Bashから直接実行可能

3. **現状の対処**
   - 「手動実行専用」と明記
   - Claude Code統合は将来の課題として記載

---

### 2. voicevox-mcp-notificationディレクトリのハードコード
**問題:**
```batch
cd "C:\Users\Tenormusica\voicevox-mcp-notification"
```
- ユーザー名がハードコード
- 他のユーザーでは動作しない
- インストールパスが異なる場合も動作しない

**影響:**
- 他のPCで使用不可
- 配布・共有できない
- ドキュメントで「カスタマイズ可能」と謳っているが実際は修正必須

**解決策:**
1. **環境変数を使用**
   ```batch
   cd "%USERPROFILE%\voicevox-mcp-notification"
   ```

2. **スクリプト自身のディレクトリを基準に**
   ```batch
   cd "%~dp0"
   ```

3. **設定ファイルから読み込み**
   ```batch
   REM config.batから読み込み
   call config.bat
   cd "%VOICEVOX_MCP_DIR%"
   ```

---

### 3. VOICEVOX.exeパスのハードコード
**問題:**
```batch
start "" "C:\Program Files\VOICEVOX\VOICEVOX.exe"
```
- デフォルトインストールパスを前提
- カスタムインストール先では動作しない
- 複数バージョンのVOICEVOXがある場合に対応不可

**影響:**
- VOICEVOX.exeが見つからないエラー
- 起動スクリプトが失敗
- ユーザーはスクリプトを編集する必要がある

**解決策:**
1. **レジストリからインストールパスを取得**
   ```batch
   for /f "tokens=2*" %%a in ('reg query "HKLM\SOFTWARE\VOICEVOX" /v InstallPath 2^>nul') do set VOICEVOX_PATH=%%b
   ```

2. **環境変数PATHから検索**
   ```batch
   where voicevox.exe >nul 2>&1
   if %errorlevel% equ 0 (
       start "" voicevox.exe
   )
   ```

3. **複数候補を順次試行**
   ```batch
   if exist "C:\Program Files\VOICEVOX\VOICEVOX.exe" (
       start "" "C:\Program Files\VOICEVOX\VOICEVOX.exe"
   ) else if exist "C:\Program Files (x86)\VOICEVOX\VOICEVOX.exe" (
       start "" "C:\Program Files (x86)\VOICEVOX\VOICEVOX.exe"
   ) else if exist "%LOCALAPPDATA%\Programs\VOICEVOX\VOICEVOX.exe" (
       start "" "%LOCALAPPDATA%\Programs\VOICEVOX\VOICEVOX.exe"
   )
   ```

---

## 🟠 MAJOR ISSUES（重要な問題）

### 4. エラーハンドリングの不足
**問題:**
- `curl` コマンドが失敗した場合の詳細なエラーメッセージがない
- ネットワークエラーと「サーバー未起動」の区別ができない
- Node.jsがインストールされていない場合の対処がない

**解決策:**
```batch
REM curlの存在確認
where curl >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: curl command not found. Please install curl or Windows 10 version 1803+
    pause
    exit /b 1
)

REM Node.jsの存在確認
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
```

---

### 5. npm installの出力が非表示
**問題:**
```batch
npm install
```
- 進捗状況が見えない
- エラーが発生しても気づかない
- 初回インストール時は数分かかる可能性あり

**解決策:**
```batch
echo Installing Node.js dependencies...
npm install --loglevel=info
if %errorlevel% neq 0 (
    echo ERROR: npm install failed. Please check your network connection.
    pause
    exit /b 1
)
```

---

### 6. VRM Bridge Serverの起動確認不足
**問題:**
```batch
curl -s http://localhost:8765 >nul 2>&1
```
- HTTPエンドポイントでの確認を前提
- WebSocketサーバーの場合は確認できない可能性
- 起動後の動作確認がない

**解決策:**
```batch
REM WebSocket接続確認（wscat使用）
where wscat >nul 2>&1
if %errorlevel% equ 0 (
    wscat -c ws://localhost:8765 --execute "ping" >nul 2>&1
    if %errorlevel% equ 0 (
        echo VRM Bridge Server WebSocket OK
    )
)
```

---

## 🟡 MINOR ISSUES（軽微な問題）

### 7. タイムアウト時間が固定
**問題:**
```batch
timeout /t 10 /nobreak >nul
```
- 10秒は遅いPCでは不足
- 速いPCでは無駄な待機時間

**解決策:**
- 実際にAPIが応答するまでポーリング（既に実装済み）
- 最大待機時間を設定ファイルで変更可能に

---

### 8. ログ出力がない
**問題:**
- 実行ログが残らない
- トラブルシューティング時に情報不足
- 過去の実行履歴が確認できない

**解決策:**
```batch
REM ログファイルに出力
set LOGFILE=%TEMP%\voicevox_startup_%date:~0,4%%date:~5,2%%date:~8,2%.log
echo [%time%] Starting VOICEVOX system... >> %LOGFILE%
```

---

### 9. pause命令でユーザー操作が必要
**問題:**
```batch
pause
```
- スクリプト終了時に「続行するには何かキーを押してください」
- 自動化に不向き
- タスクスケジューラからの実行で問題になる

**解決策:**
```batch
REM 環境変数でpauseの有無を制御
if not "%VOICEVOX_NO_PAUSE%"=="1" pause
```

---

### 10. Mac/Linux版スクリプトの検証未実施
**問題:**
- `start_voicevox_system.sh` の動作確認ができていない
- Windowsでの検証のみ
- クロスプラットフォーム対応を謳っているが実際は未検証

**解決策:**
- Mac/Linux環境での実機テスト必須
- GitHub ActionsでCI/CDテスト追加

---

## 🔵 DOCUMENTATION ISSUES（ドキュメント問題）

### 11. STARTUP_SCRIPT_GUIDE.mdの誤解を招く表現
**問題:**
```markdown
### Windows

ダブルクリックで起動
start_voicevox_system.bat
```
- 「Claude Codeから自動起動」と誤解される
- 実際は手動実行のみ

**解決策:**
明確に記載：
```markdown
### Windows（手動実行）

**注意:** このスクリプトはClaude Codeから自動実行できません。手動でダブルクリックして実行してください。

ダブルクリックで起動
start_voicevox_system.bat
```

---

### 12. 「91%削減」の根拠が不明確
**問題:**
```markdown
効果: 起動時間 5分 → 30秒（91%削減）
```
- 5分かかっていた根拠が不明
- 30秒で完了する保証がない
- ユーザー環境により大きく変動

**解決策:**
```markdown
効果: 起動時間短縮の例
- 手動手順（従来）: 約5分
  - VOICEVOX.exe検索・起動: 1分
  - 完全起動待機: 2分
  - VRM Bridge Server起動: 1分
  - 依存関係確認: 1分
- 自動スクリプト: 約30秒〜2分（環境依存）
  - 自動起動・待機・確認

※ 実際の短縮効果は環境により異なります
```

---

## 📊 実際の検証結果

### 検証1: VOICEVOX Engine確認
```bash
curl -s http://localhost:50021/version
```
✅ **成功**: バージョン0.24.1を取得  
**所要時間**: 0.3秒

### 検証2: VRM Bridge Server確認
```bash
curl -s http://localhost:8765
```
❌ **失敗**: Connection refused（未インストールのため正常）  
**所要時間**: 0.1秒

### 検証3: Node.js依存関係確認
```bash
cd "C:\Users\Tenormusica\voicevox-mcp-notification" && npm list
```
✅ **成功**: 依存関係なし（empty）  
**所要時間**: 0.8秒

### 検証4: zundamon_speak.js実行
```bash
node "C:\Users\Tenormusica\zundamon_speak.js" "起動スクリプトのテストです"
```
✅ **成功**: 音声再生完了  
**所要時間**: 約3秒（音声合成 + 再生）

### 総合評価
**手動実行の各ステップは正常動作**  
**しかし.batファイル全体の動作は未確認**（Bashから実行不可）

---

## 🎯 優先度別改善提案

### 最優先（CRITICAL）
1. **PowerShell版スクリプト作成** - Bashから実行可能に
2. **パスのハードコード解消** - %USERPROFILE%等の環境変数使用
3. **ドキュメント修正** - 「手動実行専用」と明記

### 高優先（HIGH）
4. **エラーハンドリング追加** - curl/node未インストール対応
5. **npm installの可視化** - 進捗表示・エラー検出
6. **実機テスト** - Windows実機で.bat全体の動作確認

### 中優先（MEDIUM）
7. **ログ出力機能追加**
8. **設定ファイル対応** - インストールパスをconfig.jsonから読み込み
9. **Mac/Linux版検証**

### 低優先（LOW）
10. **pause制御の環境変数化**
11. **CI/CD追加** - GitHub Actionsでテスト自動化

---

## 🏆 良い点（Positive Points）

### 設計思想
✅ **段階的な確認プロセス** - 各サーバーの状態を順次確認  
✅ **オプション機能の柔軟性** - VRM Bridge Serverがなくても動作  
✅ **ユーザーフレンドリーな出力** - 進捗を[1/4]形式で表示

### 実装品質
✅ **既起動時のスキップ** - 無駄な再起動を回避  
✅ **待機ループ** - VOICEVOX完全起動を確実に待機  
✅ **クロスプラットフォーム意識** - Windows/Mac/Linux版を用意

### ドキュメント
✅ **詳細な使用ガイド** - STARTUP_SCRIPT_GUIDE.mdが充実  
✅ **トラブルシューティング** - よくある問題と解決策を記載  
✅ **カスタマイズ方法** - パス変更手順を明記

---

## 📝 結論

### 現状評価
**実用性: 60点**
- 基本機能は動作するが、致命的な問題あり
- 手動実行専用としては合格点
- Claude Code統合は未達成

### 改善後の期待評価
**実用性: 85点**
- PowerShell版追加でClaude Code統合可能
- パス問題解消で他のPCでも動作
- エラーハンドリング追加でユーザー体験向上

### 推奨アクション
1. **即座に実施**: ドキュメント修正（手動実行専用と明記）
2. **1週間以内**: PowerShell版スクリプト追加
3. **2週間以内**: パスのハードコード解消
4. **1ヶ月以内**: エラーハンドリング・ログ機能追加

---

## 🔗 関連ドキュメント
- [VOICEVOX_ROADMAP.md](./VOICEVOX_ROADMAP.md) - 全体ロードマップ
- [STARTUP_SCRIPT_GUIDE.md](./STARTUP_SCRIPT_GUIDE.md) - 使用ガイド（要修正）
- [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md) - 技術仕様

---

**レビュー実施者**: Claude Code (Anthropic)  
**レビュー日時**: 2025-11-05 14:40  
**レビュー対象**: VOICEVOX統合起動スクリプト v1.0
