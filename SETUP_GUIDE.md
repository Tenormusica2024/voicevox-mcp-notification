# VOICEVOX MCP Notification セットアップガイド

## 📋 前提条件確認

✅ **Node.js 22.18.0** - インストール済み（必須：18以上）  
✅ **npm 10.9.3** - インストール済み  
✅ **依存関係** - インストール済み（@modelcontextprotocol/sdk, node-fetch）

## 📥 VOICEVOXアプリケーションのインストール

### ステップ1: VOICEVOXのダウンロード

**推奨：CPU版（互換性が高い）**
```
https://github.com/VOICEVOX/voicevox/releases/download/0.24.2/VOICEVOX-CPU.Web.Setup.0.24.2.exe
```

**GPU対応版（より高速）**
- DirectML（Windows 10/11の標準GPU対応）:
  ```
  https://github.com/VOICEVOX/voicevox/releases/download/0.24.2/VOICEVOX.Web.Setup.0.24.2.exe
  ```
- CUDA（NVIDIA GPU専用）:
  ```
  https://github.com/VOICEVOX/voicevox/releases/download/0.24.2/VOICEVOX-CUDA.Web.Setup.0.24.2.exe
  ```

### ステップ2: VOICEVOXのインストール

1. ダウンロードした `.exe` ファイルを実行
2. インストールウィザードに従ってインストール
3. デフォルトのインストール先で問題なし

### ステップ3: VOICEVOXの起動

1. スタートメニューから「VOICEVOX」を起動
2. 初回起動時は音声データのダウンロードが行われます（数分かかる場合があります）
3. 起動完了後、自動的に `http://localhost:50021` でAPIサーバーが起動します

### ステップ4: 動作確認

```bash
# コマンドプロンプトまたはPowerShellで実行
curl http://localhost:50021/version
```

**期待される出力例:**
```
"0.24.2"
```

## 🔧 MCPサーバーのセットアップ

### ステップ5: Claude Code設定ファイルの編集

**設定ファイルの場所:**
```
%APPDATA%\.claude\claude_desktop_config.json
```

**追加する設定:**
```json
{
  "mcpServers": {
    "voicevox": {
      "command": "node",
      "args": ["C:\\Users\\Tenormusica\\voicevox-mcp-notification\\index.js"]
    }
  }
}
```

**注意:**
- 既存の `mcpServers` 設定がある場合は、`"voicevox"` セクションを追加
- パスは絶対パスを使用

### ステップ6: Claude Codeの再起動

1. Claude Codeを完全に終了
2. Claude Codeを再起動
3. MCPサーバーが自動的に起動します

## ✅ 動作確認

### テスト1: VOICEVOX API接続確認

```bash
cd C:\Users\Tenormusica\voicevox-mcp-notification
node -e "fetch('http://localhost:50021/version').then(r => r.text()).then(console.log)"
```

### テスト2: MCPサーバー起動確認

Claude Codeを再起動後、以下のように依頼してください:

```
「テストです」という音声通知を送信してください
```

正常に動作している場合、ずんだもんの声で「開始します。テストです」と音声が再生されます。

## 🐛 トラブルシューティング

### VOICEVOXが起動しない

- Windows Defenderがブロックしている可能性があります
- 実行ファイルを右クリック → プロパティ → セキュリティ → 「許可する」にチェック

### 音声が再生されない

**PowerShellの実行ポリシー確認:**
```powershell
Get-ExecutionPolicy
```

制限されている場合は以下で変更:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### ポート50021が使用中

他のアプリケーションがポート50021を使用している可能性があります:
```bash
netstat -ano | findstr :50021
```

使用中の場合、そのプロセスを終了してからVOICEVOXを起動してください。

### MCPサーバーが起動しない

**Claude Codeのログ確認:**
1. Claude Codeを開く
2. 開発者ツール（F12）を開く
3. Consoleタブでエラーメッセージを確認

## 📚 参考情報

- VOICEVOX公式サイト: https://voicevox.hiroshiba.jp/
- VOICEVOX GitHub: https://github.com/VOICEVOX/voicevox
- 元記事（Zenn）: https://zenn.dev/t09tanaka/articles/ff2983a52959f1

---

**作成日**: 2025-10-27  
**バージョン**: 1.0.0
