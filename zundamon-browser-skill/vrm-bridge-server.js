/**
 * VRM WebSocket Bridge Server
 * ブラウザ(WebSocket) ⇔ VSeeFace/3tene(OSC over UDP)
 * 
 * 必要なパッケージ:
 * npm install ws osc
 */

const WebSocket = require('ws');
const osc = require('osc');

// 設定
const WEBSOCKET_PORT = 8765;
const OSC_TARGET_HOST = '127.0.0.1';
const OSC_TARGET_PORT = 39540; // VMC Protocol default port
const OSC_LISTEN_PORT = 39541; // 受信用ポート

// OSC UDP Portの作成
const oscPort = new osc.UDPPort({
  localAddress: '127.0.0.1',
  localPort: OSC_LISTEN_PORT,
  remoteAddress: OSC_TARGET_HOST,
  remotePort: OSC_TARGET_PORT,
  metadata: true
});

// WebSocketサーバーの作成
const wss = new WebSocket.Server({ port: WEBSOCKET_PORT });

console.log(`🚀 VRM WebSocket Bridge Server起動 (WebSocket: ${WEBSOCKET_PORT}, OSC: ${OSC_TARGET_PORT})`);

// OSC Portを開く
oscPort.open();

// 自動瞬きタイマー
let blinkInterval = null;

/**
 * 自動瞬きを開始
 */
function startAutoBlink() {
  if (blinkInterval) {
    clearInterval(blinkInterval);
  }
  
  blinkInterval = setInterval(() => {
    // ランダムな瞬き間隔（3-5秒）
    const nextBlinkDelay = 3000 + Math.random() * 2000;
    
    // 瞬きアニメーション
    performBlink();
    
  }, 4000); // 基本4秒間隔
  
  console.log('👁️ 自動瞬き開始');
}

/**
 * 瞬きアニメーション実行
 */
function performBlink() {
  // 瞬きを閉じる（150ms）
  sendBlendShapesToOSC({
    Blink: 1.0,
    Blink_L: 1.0,
    Blink_R: 1.0
  });
  
  // 150ms後に目を開ける
  setTimeout(() => {
    sendBlendShapesToOSC({
      Blink: 0.0,
      Blink_L: 0.0,
      Blink_R: 0.0
    });
  }, 150);
}

// サーバー起動時に自動瞬き開始
startAutoBlink();

oscPort.on('ready', () => {
  console.log('✅ OSC Port準備完了');
  
  // OSC接続完了後、腕を下げた状態に初期化
  setTimeout(() => {
    setArmPose(true);
    console.log('🎯 初期化完了: 腕を下げた状態に設定');
  }, 1000);
});

oscPort.on('error', (error) => {
  console.error('❌ OSC Portエラー:', error);
});

// WebSocket接続ハンドリング
wss.on('connection', (ws) => {
  console.log('✅ WebSocketクライアント接続');
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 受信メッセージ:', message); // デバッグログ追加
      
      if (message.type === 'blend') {
        // BlendShape値をOSCメッセージに変換
        sendBlendShapesToOSC(message.shapes);
      } else if (message.type === 'bone') {
        // ボーン位置・回転をOSCメッセージに変換
        sendBonePoseToOSC(message.boneName, message.position, message.rotation);
      } else if (message.type === 'setArmPose') {
        // 腕のポーズ設定（音声再生時の制御）
        console.log('🎯 setArmPose呼び出し: isPlaying =', message.isPlaying); // デバッグログ追加
        setArmPose(message.isPlaying);
      }
      
    } catch (error) {
      console.error('❌ メッセージ解析エラー:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('❌ WebSocketクライアント切断');
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocketエラー:', error);
  });
  
  // 接続成功を通知
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'VRM Bridge Server ready'
  }));
});

/**
 * BlendShape値をVMC Protocol OSCメッセージとして送信
 */
function sendBlendShapesToOSC(shapes) {
  try {
    // 各BlendShapeに対してOSCメッセージ送信
    for (const [name, value] of Object.entries(shapes)) {
      oscPort.send({
        address: '/VMC/Ext/Blend/Val',
        args: [
          { type: 's', value: name },    // BlendShape名
          { type: 'f', value: value }    // 値（0-1）
        ]
      });
    }
    
    // 適用コマンド送信
    oscPort.send({
      address: '/VMC/Ext/Blend/Apply',
      args: []
    });
    
    console.log(`📤 OSCメッセージ送信: ${JSON.stringify(shapes)}`);
    
  } catch (error) {
    console.error('❌ OSC送信エラー:', error);
  }
}

/**
 * ボーン位置・回転をVMC Protocol OSCメッセージとして送信
 * @param {string} boneName - ボーン名（例: "LeftUpperArm", "RightUpperArm"）
 * @param {Object} position - 位置 {x, y, z}
 * @param {Object} rotation - 回転（Quaternion）{x, y, z, w}
 */
function sendBonePoseToOSC(boneName, position, rotation) {
  try {
    oscPort.send({
      address: '/VMC/Ext/Bone/Pos',
      args: [
        { type: 's', value: boneName },
        { type: 'f', value: position.x },
        { type: 'f', value: position.y },
        { type: 'f', value: position.z },
        { type: 'f', value: rotation.x },
        { type: 'f', value: rotation.y },
        { type: 'f', value: rotation.z },
        { type: 'f', value: rotation.w }
      ]
    });
    
    console.log(`📤 ボーンOSC送信: ${boneName}`);
    
  } catch (error) {
    console.error('❌ ボーンOSC送信エラー:', error);
  }
}

/**
 * ルート位置を送信（VMC Protocolの必須要件）
 */
function sendRootTransform() {
  try {
    oscPort.send({
      address: '/VMC/Ext/Root/Pos',
      args: [
        { type: 's', value: 'root' },
        { type: 'f', value: 0.0 },  // position x
        { type: 'f', value: 0.0 },  // position y
        { type: 'f', value: 0.0 },  // position z
        { type: 'f', value: 0.0 },  // rotation x
        { type: 'f', value: 0.0 },  // rotation y
        { type: 'f', value: 0.0 },  // rotation z
        { type: 'f', value: 1.0 }   // rotation w
      ]
    });
    console.log('📤 ルートTransform送信');
  } catch (error) {
    console.error('❌ ルートTransform送信エラー:', error);
  }
}

/**
 * 腕のポーズを設定（音声再生時の制御）
 * @param {boolean} isPlaying - true: 腕を下げる, false: T-Poseに戻す
 */
function setArmPose(isPlaying) {
  try {
    // VMC Protocol要件: ボーン送信前にルート位置を送信
    sendRootTransform();
    
    if (isPlaying) {
      // 音声再生中: 腕を完全に下げる（A-PoseからさらにX軸で下げる）
      // A-Poseはすでに45度下がっているので、X軸周りの回転で前方に下げる
      
      // LeftUpperArm（左上腕）- X軸周りに45度前方回転
      sendBonePoseToOSC('LeftUpperArm', 
        { x: 0.0, y: 0.0, z: 0.0 },
        { x: 0.383, y: 0.0, z: 0.0, w: 0.924 }  // X軸周りに45度回転
      );
      
      // RightUpperArm（右上腕）- X軸周りに45度前方回転
      sendBonePoseToOSC('RightUpperArm',
        { x: 0.0, y: 0.0, z: 0.0 },
        { x: 0.383, y: 0.0, z: 0.0, w: 0.924 }  // X軸周りに45度回転
      );
      
      console.log('🎵 腕を下げました（A-Pose対応・X軸45度）');
    } else {
      // 音声停止: A-Poseに戻す（回転をリセット）
      sendBonePoseToOSC('LeftUpperArm',
        { x: 0.0, y: 0.0, z: 0.0 },
        { x: 0.0, y: 0.0, z: 0.0, w: 1.0 }  // 回転なし = A-Pose
      );
      
      sendBonePoseToOSC('RightUpperArm',
        { x: 0.0, y: 0.0, z: 0.0 },
        { x: 0.0, y: 0.0, z: 0.0, w: 1.0 }  // 回転なし = A-Pose
      );
      
      console.log('🎵 A-Poseに戻しました（音声停止）');
    }
  } catch (error) {
    console.error('❌ 腕ポーズ設定エラー:', error);
  }
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('❌ 予期しないエラー:', error);
});

process.on('SIGINT', () => {
  console.log('\n🛑 サーバー停止中...');
  
  // 自動瞬き停止
  if (blinkInterval) {
    clearInterval(blinkInterval);
    console.log('👁️ 自動瞬き停止');
  }
  
  oscPort.close();
  wss.close(() => {
    console.log('✅ サーバー停止完了');
    process.exit(0);
  });
});
