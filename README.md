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

```bash
npm install -g @tenormusica/mcp-voicevox-notification
```

## MCP設定

Claude Codeの設定ファイルに以下を追加：

### Windows: `%APPDATA%\.claude\claude_desktop_config.json`
### Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "voicevox": {
      "command": "npx",
      "args": ["@tenormusica/mcp-voicevox-notification"]
    }
  }
}
```

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
const DEFAULT_SPEAKER = 1;  // スピーカーID（ずんだもん=1）
const DEFAULT_SPEED_SCALE = 1.3;  // 再生速度（1.0が標準）
```

### 対応スピーカー

VOICEVOXで利用可能なスピーカーIDを指定できます：
- 0: 四国めたん
- 1: ずんだもん
- 2: 春日部つむぎ
- など

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
