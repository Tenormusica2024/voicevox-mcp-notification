# VOICEVOX System Startup Script - 使用ガイド

## 概要

VOICEVOX MCP Notification Systemの起動を自動化するスクリプトです。従来5分かかっていた起動手順が30秒に短縮されます。

## 機能

### 自動実行内容

1. **VOICEVOX Engine起動確認**
   - 既に起動していればスキップ
   - 未起動の場合は自動起動 + 完全起動待機

2. **VRM Bridge Server起動確認（オプション）**
   - VRM統合を使用している場合のみ起動
   - 未使用の場合は自動スキップ

3. **Node.js依存関係確認**
   - npm packagesが未インストールの場合は自動インストール

4. **システムヘルスチェック**
   - Node.jsバージョン確認
   - VOICEVOX API動作確認

## 使い方

### Windows（PowerShell版 - 推奨）

**Claude Codeから実行可能:**
```powershell
# Claude CodeのBash toolから実行可能
powershell -ExecutionPolicy Bypass -File "C:\Users\Tenormusica\voicevox-mcp-notification\start_voicevox_system.ps1"
```

**手動実行:**
```powershell
# PowerShellから実行
.\start_voicevox_system.ps1

# またはエクスプローラーから右クリック → 「PowerShellで実行」
```

**特徴:**
- ✅ Claude CodeのBash toolから実行可能
- ✅ 環境変数を使用（他のPCでも動作）
- ✅ VOICEVOX.exeの自動検出（複数候補から検索）
- ✅ エラーハンドリング完備
- ✅ ログファイル自動生成
- ✅ npm install進捗表示

### Windows（バッチファイル版）

**⚠️ 注意: この版はClaude Codeから自動実行できません。手動実行専用です。**

```batch
# ダブルクリックで起動
start_voicevox_system.bat

# またはコマンドプロンプトから
cd C:\Users\Tenormusica\voicevox-mcp-notification
start_voicevox_system.bat
```

**ショートカット作成:**
1. `start_voicevox_system.bat` を右クリック
2. 「ショートカットの作成」
3. ショートカットをデスクトップまたはスタートメニューに配置
4. 今後はショートカットをダブルクリックで起動

### Mac/Linux

```bash
# 実行権限を付与（初回のみ）
chmod +x start_voicevox_system.sh

# スクリプト実行
./start_voicevox_system.sh

# またはフルパス指定
bash ~/voicevox-mcp-notification/start_voicevox_system.sh
```

**エイリアス設定（推奨）:**

`.bashrc` または `.zshrc` に以下を追加：
```bash
alias voicevox-start="bash ~/voicevox-mcp-notification/start_voicevox_system.sh"
```

設定後は以下で起動可能：
```bash
voicevox-start
```

## カスタマイズ

### VOICEVOXインストールパスの変更

**Windows (PowerShell版):**
```powershell
# start_voicevox_system.ps1 は自動検出のため編集不要
# 以下の4つのパスを自動で検索します:
# - C:\Program Files\VOICEVOX\VOICEVOX.exe
# - C:\Program Files (x86)\VOICEVOX\VOICEVOX.exe
# - %LOCALAPPDATA%\Programs\VOICEVOX\VOICEVOX.exe
# - %APPDATA%\VOICEVOX\VOICEVOX.exe

# カスタムパスを追加する場合は $voicevoxPaths 配列に追加
```

**Windows (バッチファイル版):**
```batch
REM start_voicevox_system.bat の以下の行を編集
start "" "C:\Program Files\VOICEVOX\VOICEVOX.exe"
```

**Mac:**
```bash
# start_voicevox_system.sh の以下の行を編集
open -a VOICEVOX
# カスタムパスの場合
open "/Applications/VOICEVOX.app"
```

### VRM Bridge Serverパスの変更

**Windows (PowerShell版):**
```powershell
# start_voicevox_system.ps1 は %USERPROFILE% を使用（編集不要）
# カスタムパスの場合のみ以下を編集:
$vrmBridgePath = "$env:USERPROFILE\vrm-bridge-server\index.js"
```

**Windows (バッチファイル版):**
```batch
REM %USERPROFILE% を使用（編集不要）
REM カスタムパスの場合のみ編集
if exist "%USERPROFILE%\vrm-bridge-server\index.js" (
```

**Mac/Linux:**
```bash
# $HOME を使用（編集不要）
# カスタムパスの場合のみ編集
if [ -f "$HOME/vrm-bridge-server/index.js" ]; then
```

### タイムアウト時間の調整

**PowerShell版:**
```powershell
# start_voicevox_system.ps1 の最大待機回数を変更
$maxAttempts = 30  # デフォルト30回 × 2秒 = 60秒
# 各待機間隔は Start-Sleep -Seconds 2 で変更可能
```

**バッチファイル版:**
```batch
REM Windows
timeout /t 10 /nobreak >nul
```

**Mac/Linux:**
```bash
sleep 10
```

デフォルトは10秒です。PCスペックに応じて調整してください。

## トラブルシューティング

### スクリプトが動作しない

**Windows (PowerShell版):**
```powershell
# 実行ポリシーエラーの場合
powershell -ExecutionPolicy Bypass -File "start_voicevox_system.ps1"

# または管理者権限で実行ポリシーを変更
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Windows (バッチファイル版):**
```batch
# 管理者権限で実行してみる
# start_voicevox_system.bat を右クリック → 管理者として実行
```

**Mac/Linux:**
```bash
# 実行権限を確認
ls -l start_voicevox_system.sh
# -rwxr-xr-x のように x (実行権限) があるか確認

# 権限がない場合
chmod +x start_voicevox_system.sh
```

### VOICEVOX Engineが起動しない

**PowerShell版を使用する場合:**
- 自動検出機能により、以下の4箇所から自動的に検索します
- 検出できない場合は、エラーメッセージで検索対象パスが表示されます

**原因1: VOICEVOXがインストールされていない**

[VOICEVOX公式サイト](https://voicevox.hiroshiba.jp/)からダウンロード・インストールしてください。

**原因2: カスタムインストール先**

PowerShell版の `$voicevoxPaths` 配列にカスタムパスを追加してください。

### 依存関係のインストールに失敗

**原因: Node.jsが古い**

```bash
# Node.jsバージョン確認
node --version
# v18.0.0以上が必要

# アップデートが必要な場合
# https://nodejs.org/ から最新版をインストール
```

### VRM Bridge Serverが起動しない

**VRM統合を使用しない場合:**
- エラーは無視してください（オプション機能のため）

**VRM統合を使用する場合:**
- `vrm-bridge-server` が正しくインストールされているか確認
- パスが正しいか確認

## パフォーマンス

### 起動時間の比較

**従来の手動手順（初回セットアップ時）:**
1. VOICEVOX.exeを探して起動: 約1分
2. 完全起動を待機: 約2分
3. VRM Bridge Serverを起動: 約1分
4. 依存関係を確認・インストール: 約1分
5. 動作確認: 約30秒
**合計: 約5分30秒**

**統合起動スクリプト（PowerShell版）:**
1. スクリプト実行: コマンド1つ
2. 自動起動・自動待機・自動確認: 約30秒〜2分
**合計: 約30秒〜2分（環境依存）**

**効果: 起動時間の短縮例**
- 手動操作が不要（5ステップ → 1コマンド）
- 待機時間の最適化（固定2分 → 実際の起動時間に応じて調整）
- エラー検出の自動化（手動確認 → 自動ヘルスチェック）

※ 実際の短縮効果はPC性能・ネットワーク速度・初回/2回目実行により異なります

## 次のステップ

### スタートアップ登録（完全自動化）

**Windows:**
1. `Win + R` で「ファイル名を指定して実行」を開く
2. `shell:startup` と入力してEnter
3. 起動時に自動実行したいスクリプトのショートカットを配置

**Mac:**
1. システム環境設定 > ユーザとグループ
2. ログイン項目タブ
3. `+` ボタンでスクリプトを追加

**Linux (systemd):**
```bash
# systemdサービスファイル作成
sudo nano /etc/systemd/system/voicevox-system.service

# 以下の内容を記載
[Unit]
Description=VOICEVOX MCP Notification System
After=network.target

[Service]
Type=simple
ExecStart=/bin/bash /home/username/voicevox-mcp-notification/start_voicevox_system.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target

# サービス有効化
sudo systemctl enable voicevox-system.service
sudo systemctl start voicevox-system.service
```

## 関連ドキュメント

- [README.md](./README.md) - プロジェクト概要
- [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md) - 技術仕様
- [VRM_INTEGRATION.md](./VRM_INTEGRATION.md) - VRM統合ガイド
- [VOICEVOX_ROADMAP.md](./VOICEVOX_ROADMAP.md) - 機能拡張ロードマップ

## ライセンス

MIT License

## 変更履歴

- 2025-11-05 (v1.1): PowerShell版追加・ドキュメント修正
  - PowerShell版スクリプト追加（Claude Code Bash tool対応）
  - VOICEVOX.exe自動検出機能追加（4箇所から検索）
  - 環境変数使用によるパス問題解消
  - エラーハンドリング強化
  - ログファイル自動生成
  - ドキュメント明確化（手動実行 vs CLI実行）
  
- 2025-11-05 (v1.0): 初版作成
  - Windows/Mac/Linux対応スクリプト
  - 自動起動・自動待機・自動確認機能
  - カスタマイズガイド・トラブルシューティング
