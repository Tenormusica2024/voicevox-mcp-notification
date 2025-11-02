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

oscPort.on('ready', () => {
  console.log('✅ OSC Port準備完了');
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
      
      if (message.type === 'blend') {
        // BlendShape値をOSCメッセージに変換
        sendBlendShapesToOSC(message.shapes);
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

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('❌ 予期しないエラー:', error);
});

process.on('SIGINT', () => {
  console.log('\n🛑 サーバー停止中...');
  oscPort.close();
  wss.close(() => {
    console.log('✅ サーバー停止完了');
    process.exit(0);
  });
});
