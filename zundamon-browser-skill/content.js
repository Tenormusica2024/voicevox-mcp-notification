/**
 * Zundamon Voice for Claude - Content Script (CORS修正版)
 * Background Service Worker経由でVOICEVOX APIを呼び出し
 */

class ZundamonVoiceController {
  constructor() {
    this.voicevoxAPI = 'http://localhost:50021';
    this.speakerID = 3;
    this.isEnabled = true;
    this.lastProcessedText = '';
    this.audioContext = null;
    this.observer = null;
    this.userMessageDetected = false;
    this.processedElements = new WeakSet();
    this.isPlaying = false; // 再生中フラグ（同時再生防止）
    this.processingQueue = []; // 処理待ちキュー
    this.prefetchedAudio = null; // プリフェッチ済み音声データ
    this.prefetchInProgress = false; // プリフェッチ実行中フラグ
    
    this.init();
  }
  
  async init() {
    const settings = await chrome.storage.sync.get(['enabled']);
    this.isEnabled = settings.enabled !== false;
    
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // ページロード後5秒待機してから監視開始（既存メッセージを無視）
    console.log('🔊 Zundamon Voice for Claude: 起動完了（5秒後に監視開始）');
    setTimeout(() => {
      this.userMessageDetected = true;
      this.startObserving();
      console.log('✅ Claude応答の監視を開始しました');
    }, 5000);
  }
  
  startObserving() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.checkForClaudeResponse(node);
          }
        });
      });
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  checkForClaudeResponse(element) {
    if (!this.isEnabled) return;
    
    // Claudeの応答のみを検出（ユーザーメッセージを除外）
    const claudeSelectors = [
      '[data-is-streaming]',
      '[data-test-render-count]',
      '.font-claude-message'
    ];
    
    for (const selector of claudeSelectors) {
      if (element.matches && element.matches(selector)) {
        const isUserMessage = element.closest('[data-testid*="user"]') || 
                             element.querySelector('[data-testid*="user"]');
        
        if (!isUserMessage) {
          console.log('🔍 Claude応答を検出:', element.className);
          
          // ストリーミング中か確認
          const isStreaming = element.getAttribute('data-is-streaming') === 'true';
          
          if (isStreaming) {
            console.log('⏳ ストリーミング中、完了待ち...');
            // ストリーミング完了を待つ
            this.waitForStreamingComplete(element);
          } else {
            console.log('✅ ストリーミング完了、処理開始');
            this.processClaudeMessage(element);
          }
        }
        return;
      }
      
      const messages = element.querySelectorAll(selector);
      messages.forEach(msg => {
        const isUserMessage = msg.closest('[data-testid*="user"]') || 
                             msg.querySelector('[data-testid*="user"]');
        if (!isUserMessage) {
          console.log('🔍 Claude応答を検出:', msg.className);
          
          const isStreaming = msg.getAttribute('data-is-streaming') === 'true';
          
          if (isStreaming) {
            console.log('⏳ ストリーミング中、完了待ち...');
            this.waitForStreamingComplete(msg);
          } else {
            console.log('✅ ストリーミング完了、処理開始');
            this.processClaudeMessage(msg);
          }
        }
      });
    }
  }
  
  waitForStreamingComplete(element) {
    // 属性の変化を監視
    const observer = new MutationObserver((mutations) => {
      const isStreaming = element.getAttribute('data-is-streaming') === 'true';
      
      if (!isStreaming) {
        console.log('✅ ストリーミング完了を検出');
        observer.disconnect();
        // 少し待ってから処理（DOMが完全に更新されるのを待つ）
        setTimeout(() => {
          this.processClaudeMessage(element);
        }, 500);
      }
    });
    
    observer.observe(element, {
      attributes: true,
      attributeFilter: ['data-is-streaming']
    });
    
    // タイムアウト設定（10秒後に強制処理）
    setTimeout(() => {
      observer.disconnect();
      console.log('⚠️ タイムアウト、強制処理');
      this.processClaudeMessage(element);
    }, 10000);
  }
  
  processClaudeMessage(element) {
    // 処理済み要素をスキップ
    if (this.processedElements.has(element)) return;
    this.processedElements.add(element);
    
    const text = this.extractText(element);
    if (!text || text === this.lastProcessedText) return;
    
    const textToSpeak = this.summarizeIfNeeded(text);
    if (textToSpeak.length === 0) return;
    
    this.lastProcessedText = text;
    
    // 長文の場合は分割して段階的に読み上げ
    const chunks = this.splitTextForReading(textToSpeak);
    chunks.forEach(chunk => this.speakText(chunk));
  }
  
  splitTextForReading(text) {
    // 50文字以下なら分割不要
    if (text.length <= 50) {
      return [text];
    }
    
    const chunks = [];
    const maxChunkSize = 50;
    
    // 句点・改行・読点で分割候補を作成
    const segments = text.split(/([。！？\n、])/);
    
    let currentChunk = '';
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // 区切り文字自体は前のセグメントに結合
      if (segment.match(/[。！？\n、]/)) {
        currentChunk += segment;
        
        // 50文字超えたら、または句点・改行の場合はチャンク確定
        if (currentChunk.length >= maxChunkSize || segment.match(/[。！？\n]/)) {
          if (currentChunk.trim().length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = '';
          }
        }
      } else {
        // 追加すると50文字超える場合
        if (currentChunk.length > 0 && (currentChunk + segment).length > maxChunkSize) {
          // 現在のチャンクを確定
          if (currentChunk.trim().length > 0) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = segment;
        } else {
          currentChunk += segment;
        }
      }
    }
    
    // 残りのチャンクを追加
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }
  
  extractText(element) {
    const clone = element.cloneNode(true);
    
    // 除外する要素（コードブロック、ツール、思考プロセス、UI要素）
    const excludeSelectors = [
      'pre', 
      'code', 
      'button',  // ボタン要素（「再試行」など）
      '[class*="tool"]', 
      '[class*="thinking"]',
      '[class*="Thinking"]',
      '[data-thinking]',
      '[aria-label*="thinking"]',
      '[aria-label*="Thinking"]',
      '[data-testid*="thinking"]',
      '.thinking-block',
      '.thought-process'
    ];
    
    excludeSelectors.forEach(selector => {
      try {
        clone.querySelectorAll(selector).forEach(el => el.remove());
      } catch (e) {
        // セレクターエラーを無視
      }
    });
    
    let text = clone.textContent.trim();
    
    // 思考プロセス部分を正規表現で削除（文字列全体から）
    text = text.replace(/考え中[\s\S]*?(?=[ぁ-んァ-ヶー][ぁ-んァ-ヶーー一-龠]{2,})/g, '');
    text = text.replace(/ユーザー[がはに].+?(?=そうですね|はい|いいえ|ありがとう|わかりました|こんにちは|こんばんは|おはよう|では|それでは)/gs, '');
    
    // 英語・日本語混合の思考プロセス文を個別に削除
    const thinkingPatterns = [
      /The user is .+?\./g,
      /The user has .+?\./g,
      /The user wrote .+?\./g,
      /I should .+?\./g,
      /Since .+?\./g,
      /This is .+?\./g,
      /ユーザーは.+?[。\.]/g,
      /ユーザーが.+?[。\.]/g,
      /ユーザーに.+?[。\.]/g,
      /これは.+?[。\.]/g,
      /それは.+?[。\.]/g,
      /自然な.+?[。\.]/g,
      /ユーザーの場所は.+?[。\.]/g,
      /.+?と返答しました[。\.]?/g,
      /.+?のようです[。\.]?/g,
      /.+?が良さそうです[。\.]?/g,
      /.+?待っています[。\.]?/g,
      /何か具体的な.+?[。\.]/g,
      /何か.+?のようなので、.+?[。\.]/g,
      /無理に.+?[。\.]/g,
      /考えていること.+?[。\.]/g,
      /思考プロセス.+?[。\.]/g
    ];
    
    thinkingPatterns.forEach(pattern => {
      text = text.replace(pattern, '');
    });
    
    // UI要素のテキストを削除
    const uiTexts = ['再試行', 'Retry', 'コピー', 'Copy'];
    uiTexts.forEach(uiText => {
      text = text.replace(new RegExp(uiText, 'g'), '');
    });
    
    // 複数の改行・空白を整理
    text = text.replace(/\n{2,}/g, '\n').replace(/\s{2,}/g, ' ').trim();
    
    // 空白のみのテキストを除外
    if (text.length === 0) return '';
    
    // 日本語が含まれているか確認
    const hasJapanese = /[ぁ-んァ-ヶー一-龠]/.test(text);
    if (!hasJapanese) return '';
    
    // 短すぎるテキストを除外（3文字未満）
    if (text.length < 3) return '';
    
    return text;
  }
  
  summarizeIfNeeded(text) {
    // 全文を読み上げる（要約なし）
    return text;
  }
  
  async speakText(text) {
    // 既に再生中の場合はキューに追加
    if (this.isPlaying) {
      this.processingQueue.push(text);
      return;
    }
    
    this.isPlaying = true;
    
    try {
      // Background Service Worker経由でAPI呼び出し
      const result = await this.synthesizeViaBackground(text);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // ArrayBufferに変換
      const audioData = new Uint8Array(result.audioData).buffer;
      
      // 音声合成完了時点で次のチャンクの合成を先行開始（プリフェッチ）
      if (this.processingQueue.length > 0 && !this.prefetchInProgress) {
        this.prefetchInProgress = true;
        const nextText = this.processingQueue[0];
        this.synthesizeViaBackground(nextText).then(nextResult => {
          if (nextResult.success) {
            this.prefetchedAudio = {
              text: nextText,
              audioData: new Uint8Array(nextResult.audioData).buffer
            };
          }
          this.prefetchInProgress = false;
        }).catch(() => {
          this.prefetchInProgress = false;
        });
      }
      
      // 再生
      await this.playAudio(audioData);
      
    } catch (error) {
      console.error('❌ 音声合成エラー:', error);
    } finally {
      this.isPlaying = false;
      
      // キューに残っているテキストがあれば次を再生
      if (this.processingQueue.length > 0) {
        const nextText = this.processingQueue.shift();
        
        // プリフェッチ済みの場合は即座に再生
        if (this.prefetchedAudio && this.prefetchedAudio.text === nextText) {
          this.isPlaying = true;
          const cachedAudio = this.prefetchedAudio.audioData;
          this.prefetchedAudio = null;
          
          // 次のチャンクをプリフェッチ
          if (this.processingQueue.length > 0 && !this.prefetchInProgress) {
            this.prefetchInProgress = true;
            const followingText = this.processingQueue[0];
            this.synthesizeViaBackground(followingText).then(result => {
              if (result.success) {
                this.prefetchedAudio = {
                  text: followingText,
                  audioData: new Uint8Array(result.audioData).buffer
                };
              }
              this.prefetchInProgress = false;
            }).catch(() => {
              this.prefetchInProgress = false;
            });
          }
          
          this.playAudio(cachedAudio)
            .then(() => {
              this.isPlaying = false;
              if (this.processingQueue.length > 0) {
                this.speakText(this.processingQueue.shift());
              }
            })
            .catch(err => {
              console.error('❌ 音声再生エラー:', err);
              this.isPlaying = false;
            });
        } else {
          this.prefetchedAudio = null;
          this.speakText(nextText);
        }
      }
    }
  }
  
  async synthesizeViaBackground(text, retryCount = 0) {
    const MAX_RETRIES = 1;
    const TIMEOUT_MS = 25000; // 25秒でタイムアウト（Chrome拡張の30秒制限より短く設定）
    
    // Extension context無効化チェック
    if (!chrome.runtime?.id) {
      console.warn('⚠️ 拡張機能のコンテキストが無効化されています。音声読み上げを停止します。');
      this.isEnabled = false;
      return { success: false, error: 'Extension context invalidated', fatal: true };
    }
    
    return new Promise((resolve) => {
      let timeoutId;
      let messageCompleted = false;
      
      // タイムアウトハンドリング
      timeoutId = setTimeout(() => {
        if (!messageCompleted) {
          messageCompleted = true;
          
          // リトライ可能な場合は再試行（警告レベル）
          if (retryCount < MAX_RETRIES) {
            console.warn(`⚠️ メッセージポートタイムアウト（25秒）、再試行します (${retryCount + 1}/${MAX_RETRIES})`);
            this.synthesizeViaBackground(text, retryCount + 1)
              .then(resolve)
              .catch(() => resolve({ success: false, error: 'Timeout after retry' }));
          } else {
            // リトライ後も失敗した場合のみエラー表示
            console.error('❌ メッセージポートタイムアウト（リトライ後も失敗）');
            resolve({ success: false, error: 'Message port timeout' });
          }
        }
      }, TIMEOUT_MS);
      
      try {
        chrome.runtime.sendMessage({
          action: 'synthesize',
          text: text,
          speakerID: this.speakerID
        }, (response) => {
          if (!messageCompleted) {
            messageCompleted = true;
            clearTimeout(timeoutId);
            
            if (chrome.runtime.lastError) {
              const errorMsg = chrome.runtime.lastError.message;
              
              // Extension context invalidated エラーの場合は致命的エラーとして処理
              if (errorMsg.includes('Extension context invalidated')) {
                console.warn('⚠️ 拡張機能が再読み込みされました。音声読み上げを停止します。');
                this.isEnabled = false;
                resolve({ success: false, error: errorMsg, fatal: true });
                return;
              }
              
              // "message port closed" エラーの場合はリトライ（警告レベル）
              if (errorMsg.includes('message port closed') && retryCount < MAX_RETRIES) {
                console.warn(`⚠️ Chrome拡張エラー（${errorMsg}）、再試行します (${retryCount + 1}/${MAX_RETRIES})`);
                this.synthesizeViaBackground(text, retryCount + 1)
                  .then(resolve)
                  .catch(() => resolve({ success: false, error: errorMsg }));
              } else {
                // リトライ後も失敗した場合のみエラー表示
                console.error('❌ Chrome拡張エラー（リトライ後も失敗）:', errorMsg);
                resolve({ success: false, error: errorMsg });
              }
            } else {
              resolve(response || { success: false, error: 'No response' });
            }
          }
        });
      } catch (error) {
        messageCompleted = true;
        clearTimeout(timeoutId);
        console.warn('⚠️ メッセージ送信時にエラーが発生しました:', error.message);
        this.isEnabled = false;
        resolve({ success: false, error: error.message, fatal: true });
      }
    });
  }
  
  async playAudio(arrayBuffer) {
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    
    return new Promise((resolve) => {
      source.onended = resolve;
      source.start(0);
    });
  }
  
  showNotification(title, message) {
    console.warn(`[${title}] ${message}`);
  }
  
  async setEnabled(enabled) {
    this.isEnabled = enabled;
    await chrome.storage.sync.set({ enabled });
    console.log(`🔊 音声通知: ${enabled ? '有効' : '無効'}`);
  }
}

const zundamon = new ZundamonVoiceController();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle') {
    zundamon.setEnabled(request.enabled);
    sendResponse({ success: true });
  }
  return true;
});
