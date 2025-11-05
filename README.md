# VOICEVOX MCP Notification

Claude Codeの通知をVOICEVOXで音声化するMCPサーバー

## 概要

Claude Codeでのタスク実行時に、進捗や完了を音声で通知してくれるツールです。ずんだもんの声でタスクの状態を報告します。

## 特徴

- タスクの開始・進行中・完了・エラーを音声で通知
- 100文字以内の簡潔なメッセージで報告
- VOICEVOX（ずんだもん）による可愛らしい音声通知
- Windows、Mac、Linuxに対応

## 前提条件

- Node.js 18.0.0以上
- VOICEVOXがローカルで起動していること（http://localhost:50021）

### VOICEVOXのインストール

1. [VOICEVOX公式サイト](https://voicevox.hiroshiba.jp/)からダウンロード
2. アプリケーションを起動
3. デフォルトでポート50021で起動します

## インストール

**⚠️ 注意:** 本プロジェクトはnpmパッケージとして公開されていません。ローカルインストールを使用してください。

```bash
# リポジトリをクローン
git clone https://github.com/Tenormusica2024/voicevox-mcp-notification
cd voicevox-mcp-notification

# 依存関係インストール
npm install
```

## MCP設定

Claude Codeの設定ファイルに以下を追加：

### Windows: `%APPDATA%\.claude\claude_desktop_config.json`
### Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

**注意:** パスは絶対パスを使用してください。`npx`コマンドは使用できません（npmパッケージ未公開のため）。

## 使い方

Claude Codeでタスク実行時に自動的に音声通知が行われます。

### 音声通知の例

```javascript
// タスク開始時
notify_voice({
  message: "ファイルの読み込みを開始します",
  status: "start"
});

// 進行中
notify_voice({
  message: "データを処理しています",
  status: "progress"
});

// 完了時
notify_voice({
  message: "すべてのファイルを正常に処理しました",
  status: "complete"
});

// エラー時
notify_voice({
  message: "ファイルが見つかりませんでした",
  status: "error"
});
```

## カスタマイズ

### 音声設定の変更

`index.js`の以下の定数を変更することで、音声の設定を調整できます：

```javascript
const DEFAULT_SPEAKER = 3;  // スピーカーID（ずんだもん ノーマル=3）
const DEFAULT_SPEED_SCALE = 1.3;  // 再生速度（1.0が標準）
```

**⚠️ 注意:** デフォルトのSpeaker IDは **3** です（ずんだもん ノーマル）。

### 対応スピーカー

VOICEVOXで利用可能なスピーカーIDを指定できます：
- 3: ずんだもん ノーマル（デフォルト）
- 1: 四国めたん
- 8: 春日部つむぎ
- 10: 雨晴はう
- 詳細: http://localhost:50021/speakers

**⚠️ 重要:** 本システムではSpeaker ID **3** (ずんだもん)を使用しています。ID 1と誤記されている箇所がありますが、正しくはID 3です。

## トラブルシューティング

### VOICEVOXに接続できない

VOICEVOXが起動していることを確認してください：
```bash
curl http://localhost:50021/version
```

### 音声が再生されない

- Windows: PowerShellが正しく動作していることを確認
- Mac: afplayコマンドが利用可能か確認
- Linux: aplayがインストールされているか確認

## ライセンス

MIT

## 参考

元記事: [Claude Codeの通知を音で受けとれるようにした - Zenn](https://zenn.dev/t09tanaka/articles/ff2983a52959f1)
