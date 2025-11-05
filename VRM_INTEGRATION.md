# VRM Avatar Integration Guide - VRMアバター統合ガイド

## 📋 概要

VOICEVOX音声通知システムにVRMアバター（3Dキャラクターモデル）を統合し、視覚的な表現を追加するためのガイドです。ずんだもんの音声に加えて、VRMアバターの口パク・表情・モーションを同期させることができます。

## 🎯 VRMとは

**VRM (Virtual Reality Model)** は、VR/ARアプリケーション向けの3Dアバターファイル形式です。

### 主な特徴
- **統一フォーマット**: 様々なアプリケーションで共通利用可能
- **人型アバター特化**: ボーン構造・表情・視線制御に対応
- **ライセンス情報埋め込み**: 利用規約をファイル内に記載可能
- **ファイル形式**: `.vrm` (GLTFベース)

### VRMで実現できること
- 口パクアニメーション（音声に同期）
- 表情変化（喜び・驚き・悲しみ等）
- 視線追従（カメラ・ユーザーを見る）
- モーション再生（手を振る・お辞儀等）

## 🏗️ アーキテクチャ

### システム構成（VRM統合版）

```
┌─────────────────────────────────────────┐
│         Claude Code                     │
│  ┌───────────────────────────────────┐ │
│  │   CLAUDE.md (ルール定義)          │ │
│  │   - 音声通知プロトコル           │ │
│  └───────────────────────────────────┘ │
│                 │                       │
│                 ▼                       │
│  ┌───────────────────────────────────┐ │
│  │   Bash tool実行                   │ │
│  │   音声コマンド + VRM連携          │ │
│  └───────────────────────────────────┘ │
└─────────────────┼───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   zundamon_speak_vrm.js (拡張版)       │
│  ┌───────────────────────────────────┐ │
│  │  1. テキスト受信                  │ │
│  │  2. VOICEVOX API呼び出し          │ │
│  │  3. WAVファイル生成               │ │
│  │  4. リップシンクデータ生成        │ │
│  │  5. VRM Bridge通知                │ │
│  │  6. 音声再生 + VRMアニメーション   │ │
│  └───────────────────────────────────┘ │
└─────────┬───────────────────────┬───────┘
          │                       │
          ▼                       ▼
┌──────────────────┐  ┌──────────────────────┐
│ VOICEVOX Engine  │  │   VRM Bridge Server  │
│ localhost:50021  │  │   localhost:8765     │
│                  │  │                      │
│ - 音声合成       │  │ - VRMビューア連携     │
│ - 音素データ取得 │  │ - 口パク制御          │
└──────────────────┘  │ - 表情制御            │
                      │ - モーション制御      │
                      └───────────┬──────────┘
                                  │
                                  ▼
                      ┌──────────────────────┐
                      │   VRM Viewer         │
                      │   (ブラウザ/専用アプリ) │
                      │                      │
                      │ - VRMモデル表示       │
                      │ - リアルタイム制御    │
                      └──────────────────────┘
```

## 🔧 VRM Bridge Serverとは

**VRM Bridge Server** は、VOICEVOX音声通知とVRMアバター表示を連携させる中継サーバーです。

### 主な役割

1. **WebSocket通信**
   - VRM ViewerとリアルタイムでWebSocket接続
   - 音声再生タイミングをリアルタイム通知

2. **リップシンク制御**
   - VOICEVOX APIから音素タイミング情報を取得
   - VRMアバターの口の形（blendshape）を制御
   - 「あ・い・う・え・お」の5つの母音に対応

3. **表情制御**
   - タスク状態に応じた表情変化
   - `start`: 集中した表情
   - `progress`: 真剣な表情
   - `complete`: 笑顔
   - `error`: 困った表情

4. **モーション制御**
   - タスク完了時: 手を振るモーション
   - エラー発生時: 首を傾げるモーション

### 技術仕様

**プロトコル:** WebSocket (ws://)  
**ポート:** 8765（デフォルト）  
**メッセージフォーマット:** JSON

```json
{
  "type": "speak",
  "text": "タスクが完了しました",
  "status": "complete",
  "audio_url": "http://localhost:8765/audio/temp_12345.wav",
  "lip_sync": [
    {"time": 0.0, "vowel": "a"},
    {"time": 0.1, "vowel": "i"},
    {"time": 0.2, "vowel": "u"}
  ]
}
```

## 📥 セットアップ

### 前提条件

1. **VOICEVOX Engine** - 既にインストール済み（必須）
2. **Node.js 18以上** - 既にインストール済み（必須）
3. **VRMアバターファイル** - `.vrm` ファイルを用意

### ステップ1: VRM Bridge Serverのインストール

```bash
# リポジトリをクローン
cd C:\Users\Tenormusica
git clone https://github.com/example/vrm-bridge-server
cd vrm-bridge-server

# 依存関係インストール
npm install

# 設定ファイル作成
cp config.example.json config.json
```

### ステップ2: VRMアバターファイルの配置

```bash
# VRMファイルを配置
mkdir C:\Users\Tenormusica\vrm-models
# ずんだもんVRMファイルをダウンロードして配置
# 例: zundamon.vrm
```

**推奨VRMモデル:**
- ずんだもん公式VRM（ライセンス確認必須）
- VRoid Studioで自作したVRM
- Boothで配布されているVRM（利用規約確認必須）

### ステップ3: config.jsonの設定

```json
{
  "vrm_model_path": "C:/Users/Tenormusica/vrm-models/zundamon.vrm",
  "voicevox_api": "http://localhost:50021",
  "websocket_port": 8765,
  "speaker_id": 3,
  "enable_lip_sync": true,
  "enable_emotion": true,
  "enable_motion": true,
  "viewer_url": "http://localhost:3000"
}
```

### ステップ4: VRM Bridge Serverの起動

```bash
# Bridge Server起動
cd C:\Users\Tenormusica\vrm-bridge-server
npm start

# 正常起動確認
# Console: "VRM Bridge Server listening on ws://localhost:8765"
```

### ステップ5: VRM Viewerの起動

**オプション1: ブラウザベースViewer（推奨）**
```bash
# Viewer起動
cd C:\Users\Tenormusica\vrm-bridge-server\viewer
npm run dev

# ブラウザで開く
# http://localhost:3000
```

**オプション2: 専用VRMアプリ**
- VSeeFace
- Luppet
- VDRAW（VRM対応が必要）

### ステップ6: 統合テスト

```bash
# テストスクリプト実行
cd C:\Users\Tenormusica
node zundamon_speak_vrm.js "VRM統合テストです"
```

**期待される動作:**
1. VRM Viewerにずんだもんが表示される
2. 音声「VRM統合テストです」が再生される
3. VRMアバターの口が音声に合わせて動く
4. タスク完了時の笑顔表情になる

## 🔌 VRM連携の実装

### zundamon_speak_vrm.js（拡張版スクリプト）

```javascript
const http = require('http');
const fs = require('fs');
const { exec } = require('child_process');
const WebSocket = require('ws');

const VOICEVOX_API = 'http://localhost:50021';
const VRM_BRIDGE_WS = 'ws://localhost:8765';
const SPEAKER_ID = 3;

async function speakWithVRM(text, status = 'complete') {
  try {
    // 1. VOICEVOX APIで音声合成
    const audioQuery = await getAudioQuery(text);
    const wavData = await synthesize(audioQuery);
    
    // 2. WAVファイル保存
    const wavPath = saveTempWav(wavData);
    
    // 3. リップシンクデータ生成
    const lipSync = generateLipSync(audioQuery);
    
    // 4. VRM Bridge通知
    await notifyVRMBridge({
      type: 'speak',
      text: text,
      status: status,
      audio_url: `file://${wavPath}`,
      lip_sync: lipSync
    });
    
    // 5. 音声再生
    await playAudio(wavPath);
    
    // 6. 一時ファイル削除
    fs.unlinkSync(wavPath);
    
    return true;
  } catch (error) {
    console.error('VRM連携エラー:', error);
    return false;
  }
}

async function notifyVRMBridge(message) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(VRM_BRIDGE_WS);
    
    ws.on('open', () => {
      ws.send(JSON.stringify(message));
      ws.close();
      resolve();
    });
    
    ws.on('error', (error) => {
      console.error('VRM Bridge接続エラー:', error);
      reject(error);
    });
  });
}

// コマンドライン実行
const text = process.argv[2] || 'テストです';
const status = process.argv[3] || 'complete';
speakWithVRM(text, status);
```

### CLAUDE.md統合

```markdown
## Zundamon VRM Notification Protocol

**実行コマンド（VRM対応版）:**
```bash
node "C:\Users\Tenormusica\zundamon_speak_vrm.js" "[テキスト]" "[status]"
```

**statusパラメータ:**
- `start`: タスク開始（集中した表情）
- `progress`: 進行中（真剣な表情）
- `complete`: 完了（笑顔）
- `error`: エラー（困った表情）
```

## 🎨 VRMカスタマイズ

### 表情設定（Blendshape）

VRM Bridge Serverの`emotion_config.json`で表情をカスタマイズ可能：

```json
{
  "start": {
    "blendshapes": {
      "Blink": 0.0,
      "Joy": 0.3,
      "Angry": 0.0,
      "Sorrow": 0.0,
      "Fun": 0.5
    }
  },
  "complete": {
    "blendshapes": {
      "Blink": 0.0,
      "Joy": 1.0,
      "Angry": 0.0,
      "Sorrow": 0.0,
      "Fun": 1.0
    }
  },
  "error": {
    "blendshapes": {
      "Blink": 0.0,
      "Joy": 0.0,
      "Angry": 0.0,
      "Sorrow": 0.7,
      "Fun": 0.0
    }
  }
}
```

### モーション設定

`motion_config.json`でモーションをカスタマイズ：

```json
{
  "complete": {
    "motion": "wave_hand",
    "duration": 2.0
  },
  "error": {
    "motion": "tilt_head",
    "duration": 1.5
  }
}
```

## 🐛 トラブルシューティング

### VRMアバターが表示されない

**原因1: VRMファイルパスが間違っている**
```bash
# config.jsonのパス確認
cat C:\Users\Tenormusica\vrm-bridge-server\config.json
# vrm_model_pathが正しいか確認
```

**原因2: VRM Viewerが起動していない**
```bash
# Viewer起動確認
curl http://localhost:3000
```

**解決策:**
- VRM Viewerを起動する
- ブラウザで`http://localhost:3000`を開く

### 口パクが音声と合わない

**原因: リップシンクデータの遅延**
```javascript
// zundamon_speak_vrm.js
// タイミング調整パラメータ
const LIP_SYNC_OFFSET = 0.1; // 秒単位で調整
```

**解決策:**
- `LIP_SYNC_OFFSET`を調整（0.05 ~ 0.2秒程度）
- VOICEVOX APIの`speedScale`を調整

### VRM Bridge Serverに接続できない

**原因: ポートが使用中**
```bash
# ポート8765の使用確認
netstat -ano | findstr :8765
```

**解決策:**
- `config.json`の`websocket_port`を変更
- 使用中のプロセスを終了

## 📊 パフォーマンス考慮事項

### レイテンシ

**VRM統合版の処理時間:**
- 音声合成: 3-5秒
- リップシンクデータ生成: 0.5秒
- VRM Bridge通信: 0.1秒
- **合計: 約3.6-5.6秒**

**最適化案:**
- WebSocket接続の永続化（毎回接続せず保持）
- リップシンクデータのキャッシング
- VRMモデルのポリゴン数削減

### リソース使用量

**VRM Viewer:**
- CPU: 5-15%
- メモリ: 200-500MB
- GPU: VRMモデルの複雑さに依存

**VRM Bridge Server:**
- CPU: 1-3%
- メモリ: 50-100MB

## 🔒 セキュリティ・ライセンス

### VRMファイルのライセンス

**重要:** VRMファイルには利用規約が埋め込まれています。

**確認方法:**
```bash
# VRMファイル内のライセンス情報を確認
# VRM ViewerまたはVRoid Hubで確認可能
```

**遵守すべき項目:**
- 商用利用の可否
- 改変の可否
- 再配布の可否
- クレジット表記の要否

### ずんだもんVRMの利用規約

**公式ガイドライン:**
- 非商用利用: 原則OK
- 商用利用: ライセンス購入が必要な場合あり
- クレジット表記: 推奨

**参照:** [ずんだもん利用規約](https://zunko.jp/guideline.html)

## 📚 参考資料

### 公式ドキュメント
- VRM仕様: https://vrm.dev/
- UniVRM: https://github.com/vrm-c/UniVRM
- VOICEVOX API: https://voicevox.hiroshiba.jp/

### VRM関連ツール
- VRoid Studio: https://vroid.com/studio
- VSeeFace: https://www.vseeface.icu/
- Luppet: https://luppet.appspot.com/

### ライブラリ
- three-vrm: https://github.com/pixiv/three-vrm (Three.js用VRMローダー)
- @pixiv/three-vrm: npm package

## 🎯 今後の拡張案

### Phase 1: リアルタイム感情認識
- Claude Codeの応答内容から感情を自動判定
- 適切な表情・モーションを自動選択

### Phase 2: カメラ追従
- ユーザーのカメラ位置を取得
- VRMアバターの視線をカメラに追従

### Phase 3: VRChat連携
- VRChatのOSC機能でVRMアバター制御
- VRChat内でずんだもんを動かす

## 📝 変更履歴

- 2025-11-05: 初版作成
  - VRM統合ガイド作成
  - VRM Bridge Serverアーキテクチャ定義
  - セットアップ手順・トラブルシューティング記載

## 👥 貢献者

- VRM仕様: VRMコンソーシアム
- VOICEVOX: Hiroshiba
- Zundamonキャラクター: 坂本アヒル / SSS合同会社
- 実装: Claude Code + ユーザー

## 📄 ライセンス

本ドキュメント: MIT License  
VRMファイル: 各モデルのライセンスに準拠  
VOICEVOX: LGPL v3 + 別途利用規約
