# VRM連携セットアップガイド

## 🎯 現在の状態

### ✅ 完了済み
- [x] VRM連携機能実装完了
- [x] Bridge Server依存関係インストール完了（npm install）
- [x] Bridge Server起動完了（ポート8765でWebSocket待機中）

### 📋 次に必要な手順（ユーザー操作）

## 1. VSeeFaceのセットアップ

### VSeeFaceのダウンロード・インストール
1. https://www.vseeface.icu/ にアクセス
2. 「Download」ボタンをクリック
3. ダウンロードしたZIPファイルを解凍
4. `VSeeFace.exe` を実行

### VRMモデルのロード
1. VSeeFaceが起動したら、画面右上の「Model」ボタンをクリック
2. 「Load VRM Model」を選択
3. ダウンロード済みのずんだもんVRMモデル（.vrmファイル）を選択
4. モデルが画面に表示されることを確認

### VMC Protocol設定
1. VSeeFace画面右上の「Settings」（⚙️）をクリック
2. 「OSC/VMC」タブを開く
3. 「Enable OSC/VMC receiving」をON
4. 「Port」が `39540` になっていることを確認
5. 「Apply」をクリック

## 2. Chrome拡張機能の設定

### 拡張機能の再読み込み
1. Chromeで `chrome://extensions/` を開く
2. 「Zundamon Voice for Claude」を探す
3. 右下の🔄（再読み込み）ボタンをクリック

### VRM連携の有効化
1. Chrome拡張機能のアイコン（ブラウザ右上）をクリック
2. 「🎨 VRM連携 (VSeeFace等)」トグルをON
   - **注意**: VTubeStudio連携がONの場合、自動的にOFFになります
3. ポップアップに「🎨 VRM連携: 有効（ページ再読み込み＋Bridge Server起動必要）」と表示される

### Claude AIページの再読み込み
1. https://claude.ai を開いているタブを再読み込み（F5またはCtrl+R）
2. ブラウザのコンソール（F12）を開いて以下のメッセージを確認:
   ```
   🔊 Zundamon Voice for Claude: 起動完了（5秒後に監視開始）
   🎨 VRM連携接続を試行中...
   ✅ VRM連携が有効になりました
   ```

## 3. 動作テスト

### 基本的なテスト手順
1. **VOICEVOX Engineが起動していることを確認**
2. **Bridge Serverが起動していることを確認**（既に起動済み）
3. **VSeeFaceでVRMモデルがロードされていることを確認**
4. **Claude AIと会話を開始**
   - 例: 「こんにちは」と入力
5. **期待される動作**:
   - ✅ Claude AIの応答が音声で読み上げられる
   - ✅ VSeeFaceのVRMモデルの口が音声に合わせて動く
   - ✅ 音量が大きいほど口が大きく開く

### トラブルシューティング

#### 口パクが動かない場合
1. **Bridge Serverのログを確認**:
   - コマンドプロンプトに以下が表示されているか確認:
     ```
     🚀 VRM WebSocket Bridge Server起動 (WebSocket: 8765, OSC: 39540)
     ✅ OSC Port準備完了
     ```
   - WebSocket接続成功時:
     ```
     ✅ WebSocketクライアント接続
     ```

2. **VSeeFaceのVMC Protocol設定を再確認**:
   - ポート番号: 39540
   - Receiving: ON

3. **ブラウザコンソールのエラーを確認**:
   - F12でデベロッパーツールを開く
   - Consoleタブでエラーメッセージを確認

4. **ファイアウォール設定**:
   - Windowsファイアウォールが`Node.js`の通信をブロックしていないか確認
   - 初回起動時にポップアップが表示された場合は「アクセスを許可する」を選択

#### Bridge Serverを再起動する場合
```bash
# 現在のBridge Serverを停止
# Ctrl+C で停止（バックグラウンドプロセスの場合はタスクマネージャーでnode.exeを終了）

# 再起動
cd C:\Users\Tenormusica\voicevox-mcp-notification\zundamon-browser-skill
npm start
```

## 4. 口パクの仕組み

### 音量に応じた段階的な口の動き
- **小音量（< 0.3）**: 母音「I」優勢 → 狭い口
- **中音量（0.3-0.6）**: 母音「E」優勢 → 中程度の口
- **大音量（> 0.6）**: 母音「A」優勢 → 大きく開いた口

### VMC Protocolメッセージ
Bridge Serverは以下のOSCメッセージをVSeeFaceに送信します:
```
/VMC/Ext/Blend/Val "A" 0.5
/VMC/Ext/Blend/Val "I" 0.0
/VMC/Ext/Blend/Val "U" 0.0
/VMC/Ext/Blend/Val "E" 0.0
/VMC/Ext/Blend/Val "O" 0.0
/VMC/Ext/Blend/Apply
```

## 📁 関連ファイル

### 実装ファイル
- `vrm-connector.js` - Chrome拡張側のVRM制御
- `vrm-bridge-server.js` - WebSocket→OSC変換サーバー
- `content.js` - 音声再生＋口パク統合ロジック

### 設定ファイル
- `package.json` - Bridge Server依存関係
- `manifest.json` - Chrome拡張設定

### ドキュメント
- `README.md` - プロジェクト全体のドキュメント
- `VRM_SETUP_GUIDE.md` - このファイル

## 🆘 サポート

問題が発生した場合は、以下の情報を含めて報告してください:
1. Bridge Serverのコンソール出力
2. ブラウザのコンソールログ（F12）
3. VSeeFaceのVMC Protocol設定のスクリーンショット
4. エラーメッセージの詳細
