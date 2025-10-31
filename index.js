#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

const VOICEVOX_API_URL = 'http://localhost:50021';
const DEFAULT_SPEAKER = 1;
const DEFAULT_SPEED_SCALE = 1.3;

const server = new Server(
  {
    name: 'voicevox-notification',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

async function synthesizeVoice(text, speaker = DEFAULT_SPEAKER, speedScale = DEFAULT_SPEED_SCALE) {
  try {
    const audioQueryResponse = await fetch(
      `${VOICEVOX_API_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`,
      { method: 'POST' }
    );

    if (!audioQueryResponse.ok) {
      throw new Error(`Audio query failed: ${audioQueryResponse.statusText}`);
    }

    const audioQuery = await audioQueryResponse.json();
    audioQuery.speedScale = speedScale;

    const synthesisResponse = await fetch(
      `${VOICEVOX_API_URL}/synthesis?speaker=${speaker}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(audioQuery),
      }
    );

    if (!synthesisResponse.ok) {
      throw new Error(`Synthesis failed: ${synthesisResponse.statusText}`);
    }

    const audioBuffer = await synthesisResponse.arrayBuffer();
    return Buffer.from(audioBuffer);
  } catch (error) {
    console.error('Voice synthesis error:', error);
    throw error;
  }
}

async function playAudio(audioBuffer) {
  const { spawn } = await import('child_process');
  const os = await import('os');
  const fs = await import('fs');
  const path = await import('path');
  
  const platform = os.platform();
  
  if (platform === 'win32') {
    const tempFile = path.join(os.tmpdir(), `voicevox_${Date.now()}.wav`);
    
    return new Promise((resolve, reject) => {
      fs.writeFile(tempFile, audioBuffer, async (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        const command = 'powershell';
        const args = [
          '-Command',
          `$player = New-Object System.Media.SoundPlayer; $player.SoundLocation = '${tempFile}'; $player.PlaySync(); Remove-Item '${tempFile}'`
        ];
        
        const player = spawn(command, args);
        
        player.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            try {
              fs.unlinkSync(tempFile);
            } catch {}
            reject(new Error(`Player exited with code ${code}`));
          }
        });
        
        player.on('error', (error) => {
          try {
            fs.unlinkSync(tempFile);
          } catch {}
          reject(error);
        });
      });
    });
  } else {
    let command, args;
    
    if (platform === 'darwin') {
      command = 'afplay';
      args = ['-'];
    } else {
      command = 'aplay';
      args = ['-'];
    }

    return new Promise((resolve, reject) => {
      const player = spawn(command, args);
      
      player.stdin.write(audioBuffer);
      player.stdin.end();

      player.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Player exited with code ${code}`));
        }
      });

      player.on('error', reject);
    });
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'notify_voice',
        description: 'タスクの状態を音声で通知します。100文字以内で簡潔に報告してください。',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: '通知メッセージ（100文字以内）',
            },
            status: {
              type: 'string',
              enum: ['start', 'progress', 'complete', 'error'],
              description: 'タスクの状態',
            },
          },
          required: ['message', 'status'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'notify_voice') {
    const { message, status } = request.params.arguments;

    if (!message || message.length > 100) {
      throw new Error('メッセージは100文字以内で指定してください');
    }

    const statusPrefix = {
      start: '開始します。',
      progress: '実行中です。',
      complete: '完了しました。',
      error: 'エラーが発生しました。',
    };

    const fullMessage = `${statusPrefix[status]}${message}`;

    try {
      const audioBuffer = await synthesizeVoice(fullMessage);
      await playAudio(audioBuffer);

      return {
        content: [
          {
            type: 'text',
            text: `音声通知を送信しました: ${fullMessage}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `音声通知に失敗しました: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('VOICEVOX MCP Server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
