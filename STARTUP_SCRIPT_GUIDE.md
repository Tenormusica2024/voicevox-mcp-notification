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

### Windows

```batch
# ダブルクリックで起動
start_voicevox_system.bat

# またはコマンドプロンプトから
cd C:\Users\Tenormusica\voicevox-mcp-notification
start_voicevox_system.bat
```

**ショートカット作成（推奨）:**
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

**Windows:**
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

**Windows:**
```batch
REM 以下の行を編集
if exist "C:\Users\Tenormusica\vrm-bridge-server\index.js" (
```

**Mac/Linux:**
```bash
# 以下の行を編集
if [ -f "$HOME/vrm-bridge-server/index.js" ]; then
```

### タイムアウト時間の調整

**VOICEVOX起動待機時間:**
```batch
REM Windows
timeout /t 10 /nobreak >nul

# Mac/Linux
sleep 10
```

デフォルトは10秒です。PCスペックに応じて調整してください。

## トラブルシューティング

### スクリプトが動作しない

**Windows:**
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

**原因1: インストールパスが間違っている**

スクリプト内のパスを確認・修正してください。

**原因2: VOICEVOXがインストールされていない**

[VOICEVOX公式サイト](https://voicevox.hiroshiba.jp/)からダウンロード・インストールしてください。

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

**従来の手動手順:**
1. VOICEVOX.exeを探して起動: 1分
2. 完全起動を待機: 2分
3. VRM Bridge Serverを起動: 1分
4. 依存関係を確認・インストール: 1分
5. 動作確認: 30秒
**合計: 約5分30秒**

**統合起動スクリプト:**
1. スクリプト実行
2. 自動起動・自動待機・自動確認
**合計: 約30秒**

**効果: 起動時間91%削減**

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

- 2025-11-05: 初版作成
  - Windows/Mac/Linux対応スクリプト
  - 自動起動・自動待機・自動確認機能
  - カスタマイズガイド・トラブルシューティング
