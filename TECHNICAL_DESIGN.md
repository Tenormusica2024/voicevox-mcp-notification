# Zundamon Voice Notification System - Technical Design Document

## プロジェクト概要

Claude Code使用時にずんだもんの音声で結果報告・重要な回答を読み上げるシステム。VOICEVOX APIを使用した音声合成とClaude Codeの統合。

## システムアーキテクチャ

### 構成要素

```
┌─────────────────────────────────────────┐
│         Claude Code                     │
│  ┌───────────────────────────────────┐ │
│  │   CLAUDE.md (ルール定義)          │ │
│  │   - 音声通知プロトコル           │ │
│  │   - 常時有効設定                 │ │
│  └───────────────────────────────────┘ │
│                 │                       │
│                 ▼                       │
│  ┌───────────────────────────────────┐ │
│  │   Assistant Response              │ │
│  │   重要な回答後に音声コマンド実行  │ │
│  └───────────────────────────────────┘ │
│                 │                       │
└─────────────────┼───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      zundamon_speak.js                  │
│  ┌───────────────────────────────────┐  │
│  │  1. テキスト受信（200文字制限）  │  │
│  │  2. VOICEVOX API呼び出し          │  │
│  │  3. 音声合成（Zundamon: ID 3）   │  │
│  │  4. WAVファイル生成               │  │
│  │  5. PowerShell SoundPlayer再生    │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      VOICEVOX Engine                    │
│      http://localhost:50021             │
│  ┌───────────────────────────────────┐  │
│  │  - /audio_query (音声クエリ生成) │  │
│  │  - /synthesis (音声合成)          │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## コアコンポーネント

### 1. zundamon_speak.js

**場所:** `C:\Users\Tenormusica\zundamon_speak.js`

**機能:**
- コマンドライン引数からテキストを受信
- VOICEVOX APIで音声合成
- 一時WAVファイル作成
- PowerShellで音声再生
- 実行ログ記録

**主要パラメータ:**
- `VOICEVOX_API`: `http://localhost:50021`
- `ZUNDAMON_SPEAKER_ID`: `3` (ずんだもん ノーマル)
- `MAX_TEXT_LENGTH`: `200` (文字数制限)

**実行コマンド:**
```bash
node "C:\Users\Tenormusica\zundamon_speak.js" "読み上げテキスト"
```

**処理フロー:**
1. テキスト受信 → 200文字で切り詰め
2. HTTPリクエスト: `/audio_query?text={text}&speaker=3` (POST)
3. HTTPリクエスト: `/synthesis?speaker=3` (POST) with audio query JSON
4. バイナリWAVデータ受信
5. 一時ファイル保存: `%TEMP%\zundamon_{timestamp}.wav`
6. PowerShell実行: `(New-Object System.Media.SoundPlayer '{file}').PlaySync()`
7. 再生完了後、一時ファイル削除

**エラーハンドリング:**
- VOICEVOX API接続失敗: エラーメッセージ出力
- ファイル書き込み失敗: 例外キャッチ
- 音声再生失敗: プロセス終了コード確認

### 2. CLAUDE.md 統合

**場所:** `C:\Users\Tenormusica\CLAUDE.md`

**セクション:** `### 0) Zundamon Voice Notification Protocol`

**ルール定義:**
- 常時有効（セッション開始時から自動適用）
- 重要な回答・タスク完了時に音声再生必須
- 適用範囲: 回答後、タスク完了、サブエージェント完了、エラー報告

**音声テキスト作成ルール:**
- 50-200文字に要約
- 結果の要点のみ
- 「〜を完了しました」「〜です」形式

**実行タイミング:**
```markdown
- 回答後：重要な説明・分析結果を提示した直後
- 完了時：ファイル作成・デプロイ・修正などのタスク完了後
- サブエージェント：Task promptに音声コマンドを埋め込み
```

### 3. サブエージェント統合

**場所:** `C:\Users\Tenormusica\.clinerules-zundamon-agent`

**機能:**
- タスク開始時と完了時に音声報告
- Task promptに音声コマンド埋め込み

**実装例:**
```bash
# タスク実行
echo "test" > test.txt

# 音声報告（必須）
node "C:\Users\Tenormusica\zundamon_speak.js" "test.txt ファイルを作成しました。"
```

## フックシステム（現在非稼働）

### 設定ファイル

**場所:** `C:\Users\Tenormusica\.claude\settings.json`

### 実装済みフック

#### 1. UserPromptSubmit Hook
```json
{
  "UserPromptSubmit": [{
    "matcher": "*",
    "hooks": [{
      "type": "command",
      "command": "node \"C:\\Users\\Tenormusica\\.claude\\hooks\\zundamon-prompt-received.js\"",
      "description": "ずんだもん音声応答（メッセージ受信時）"
    }]
  }]
}
```

#### 2. PostToolUse Hook
```json
{
  "PostToolUse": [{
    "matcher": "Bash",
    "hooks": [{
      "type": "command",
      "command": "node \"C:\\Users\\Tenormusica\\.claude\\hooks\\zundamon-voice-notification.js\"",
      "description": "ずんだもん音声通知（Bash実行後）"
    }]
  }]
}
```

#### 3. SubagentStop Hook
```json
{
  "SubagentStop": [{
    "hooks": [{
      "type": "command",
      "command": "node \"C:\\Users\\Tenormusica\\zundamon_speak.js\" \"タスクが完了しました。結果を確認してください。\"",
      "description": "ずんだもん完了報告（タスク完了時）"
    }]
  }]
}
```

### フックスクリプト

**場所:** `C:\Users\Tenormusica\.claude\hooks\zundamon-voice-notification.js`

**機能:**
- stdin からツール実行情報（JSON）を受信
- ツール名に応じた通知メッセージを生成
- VOICEVOX API呼び出し
- 音声合成・再生

**対象ツール:**
- `Bash`: "コマンド実行完了です"
- `Edit`, `Write`, `MultiEdit`: "ファイル編集完了です"
- `mcp__playwright__playwright_screenshot`: "スクリーンショット撮影完了です"
- `Task`: "サブタスク完了です"

### 既知の問題

**すべてのフックタイプが発火しない:**
- PostToolUse: GitHub Issue #3148, #6305, #6403
- Stop with matcher "*": GitHub Issue #2825 (Task tool破損)
- UserPromptSubmit: GitHub Issue #8810 (サブディレクトリ問題)

**検証結果:**
- 手動テスト: スクリプトは正常動作
- Claude Code v1.0.72使用
- 設定JSONは文法的に正しい
- ログファイルは作成されない（フック未実行の証拠）

**対応:**
手動コマンド方式に切り替え（現行システム）

## MCP Server統合（補助的）

### VOICEVOX MCP Server

**場所:** `C:\Users\Tenormusica\voicevox-mcp-notification\index.js`

**機能:**
- `notify_voice` ツール提供
- VOICEVOX APIラッパー
- Claude CodeからMCP経由で音声合成

**接続方法:**
```bash
claude mcp add --scope user voicevox node "C:\Users\Tenormusica\voicevox-mcp-notification\index.js"
/mcp reconnect voicevox
```

**使用例:**
```bash
claude mcp call voicevox notify_voice '{"message": "テストメッセージ", "status": "start"}'
```

**現状:**
- MCPサーバーは正常動作
- 実際の運用では`zundamon_speak.js`直接実行を優先
- MCPは補助的な位置づけ

## データフロー

### 標準的な音声通知フロー

```
1. ユーザーがClaude Codeにメッセージ送信
   ↓
2. Claude Code (Assistant) が処理・回答生成
   ↓
3. 重要な回答の場合、回答テキストを50-200文字に要約
   ↓
4. Bash tool実行:
   node "C:\Users\Tenormusica\zundamon_speak.js" "要約テキスト"
   ↓
5. zundamon_speak.js がVOICEVOX APIに接続
   ↓
6. VOICEVOX Engine が音声合成 (Speaker ID: 3)
   ↓
7. WAVファイル生成 (%TEMP%\zundamon_{timestamp}.wav)
   ↓
8. PowerShell SoundPlayer で再生
   ↓
9. 再生完了後、一時ファイル削除
   ↓
10. Bash tool終了 (exit code: 0)
```

### タイムアウト処理

**問題:**
200文字を超える長いテキストは再生時間が35秒を超え、Bash toolがタイムアウト

**実際の動作:**
- タイムアウトエラー表示: "Command timed out after 35s"
- 音声再生は正常に完了 (exit code: 0)
- 一時ファイルは正常に削除される

**解決策:**
- テキストを100-150文字程度に短縮
- 非同期バックグラウンド実行（将来の改善）

## セキュリティ考慮事項

### 認証情報の扱い

**GitHub Personal Access Token:**
- `settings.json`のGitリモートURLに含まれる
- リポジトリには含めない（`.gitignore`で除外）

**VOICEVOX API:**
- ローカルホスト接続（`localhost:50021`）
- 認証不要
- 外部ネットワーク露出なし

### ファイルシステム

**一時ファイル:**
- `%TEMP%\zundamon_{timestamp}.wav`
- 再生後即座に削除
- 機密情報を含まない

**ログファイル:**
- `%TEMP%\zundamon_speak.log`
- 実行履歴・デバッグ情報
- 個人情報は含まない

## パフォーマンス

### レイテンシ

**音声合成時間:**
- 50文字: 約3-5秒
- 100文字: 約10-15秒
- 200文字: 約30-35秒

**ボトルネック:**
- VOICEVOX API処理時間（音声合成）
- ファイルI/O（WAV書き込み）
- PowerShell起動オーバーヘッド（約1秒）

### 最適化提案

1. **非同期実行:** バックグラウンドプロセスで音声再生
2. **キャッシング:** 頻出フレーズをプリ生成
3. **テキスト短縮:** 100文字以下を推奨

## 環境要件

### 必須ソフトウェア

- **VOICEVOX Engine**: http://localhost:50021 で起動中
- **Node.js**: v14以上
- **PowerShell**: Windows標準（SoundPlayer使用）
- **Claude Code**: v1.0.72以上

### 動作確認済み環境

- OS: Windows 10/11
- Node.js: v16.x / v18.x
- VOICEVOX: 最新版
- Claude Code: v1.0.72

## トラブルシューティング

### 音声が再生されない

**原因1: VOICEVOX Engine未起動**
```bash
# 確認
curl http://localhost:50021/version

# 解決
VOICEVOXアプリを起動
```

**原因2: Node.js未インストール**
```bash
# 確認
node --version

# 解決
https://nodejs.org/ からインストール
```

**原因3: スクリプトパスが間違っている**
```bash
# 確認
ls "C:\Users\Tenormusica\zundamon_speak.js"

# 解決
パスを修正
```

### タイムアウトエラー

**症状:** "Command timed out after 35s"

**原因:** テキストが長すぎる（200文字超）

**解決:**
- テキストを100文字以下に短縮
- タイムアウトは表示されるが、音声再生は正常完了

### フックが発火しない

**症状:** 設定したフックが実行されない

**原因:** Claude Codeの既知のバグ

**解決:**
- 手動コマンド方式を使用（現行システム）
- `CLAUDE.md`にルール明記で運用回避

## 今後の改善予定

### Phase 1: パフォーマンス改善
- [ ] 非同期バックグラウンド実行
- [ ] テキスト短縮アルゴリズム改善
- [ ] 頻出フレーズキャッシング

### Phase 2: 機能拡張
- [ ] 感情パラメータ対応（喜び・悲しみ等）
- [ ] 複数キャラクター対応
- [ ] 音量・速度調整機能

### Phase 3: 統合強化
- [ ] フックシステム修正待ち（Claude Code側）
- [ ] 自動要約機能（長文対応）
- [ ] エラー通知の音声化

## 参考資料

### 公式ドキュメント
- VOICEVOX API: https://voicevox.hiroshiba.jp/
- Claude Code Hooks: https://docs.anthropic.com/claude-code/hooks

### GitHub Issues
- PostToolUse Hook問題: #3148, #6305, #6403
- Stop Hook問題: #2825
- UserPromptSubmit Hook問題: #8810

### リポジトリ
- VOICEVOX MCP Server: https://github.com/Tenormusica2024/voicevox-mcp-notification

## 変更履歴

- 2025-10-27: 初版作成
  - システムアーキテクチャ定義
  - 手動コマンド方式実装
  - CLAUDE.md統合完了
  - フック問題調査・代替案実装

## ライセンス

MIT License

## 著者

- 実装: Claude Code (Anthropic) + ユーザー
- VOICEVOX: Hiroshiba
- Zundamonキャラクター: 坂本アヒル / SSS合同会社
