/**
 * Web equivalent of `app-live-kit`'s `voice_service.dart`.
 *
 * Owns the microphone (`getUserMedia` + AudioWorklet) and the WebSocket to
 * the backend `/voice/realtime`. Parses server frames into
 * `VoiceServerMessage` and exposes them through `onMessage`. Implements the
 * same half-duplex contract as the Flutter client: when the agent starts
 * speaking, the controller calls `pauseRecorder()`; when the TTS player
 * drains, it calls `resumeRecorder()`.
 */

import { ENDPOINTING_MS, VOICE_PATH, VOICE_SAMPLE_RATE, WS_BASE_URL } from '@/lib/config';
import {
  parseVoiceServerMessage,
  type VoiceClientMessage,
  type VoiceServerMessage,
} from '@/features/live/voice-protocol';

const SERVER_SILENCE_TIMEOUT_MS = 25_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const WORKLET_URL = '/audio/pcm-worklet.js';

export type VoiceServiceEvents = {
  onMessage: (message: VoiceServerMessage) => void;
  onClose: (clean: boolean) => void;
  onError: (error: string) => void;
};

export type VoiceServiceStartOptions = {
  sessionId: string;
  token: string;
  userId: string;
};

export class VoiceService {
  private readonly events: VoiceServiceEvents;

  private socket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;

  private connected = false;
  private stopped = false;
  private paused = false;
  private reconnectAttempt = 0;
  private chunksSent = 0;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;

  private sessionId = '';
  private token = '';
  private userId = '';

  constructor(events: VoiceServiceEvents) {
    this.events = events;
  }

  async start({ sessionId, token, userId }: VoiceServiceStartOptions): Promise<void> {
    // Token may be empty when the backend is running with DEV_AUTH_BYPASS=true.
    // The WebSocket URL only adds `?token=` when one is provided.
    this.sessionId = sessionId;
    this.token = token;
    this.userId = userId;
    this.stopped = false;
    this.chunksSent = 0;

    await this.startRecorder();
    await this.connect();
  }

  sendMessage(payload: VoiceClientMessage): void {
    if (!this.connected || !this.socket || this.stopped) return;
    try {
      this.socket.send(JSON.stringify(payload));
    } catch (err) {
      this.events.onError(`send failed: ${String(err)}`);
    }
  }

  pauseRecorder(): void {
    if (!this.micStream || this.paused) return;
    this.paused = true;
    for (const track of this.micStream.getAudioTracks()) {
      track.enabled = false;
    }
  }

  resumeRecorder(): void {
    if (!this.micStream || this.stopped) return;
    this.paused = false;
    for (const track of this.micStream.getAudioTracks()) {
      track.enabled = true;
    }
  }

  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    this.connected = false;
    this.clearSilenceTimer();

    try {
      this.socket?.send(JSON.stringify({ type: 'terminate' } satisfies VoiceClientMessage));
    } catch {
      // Socket may already be closing — ignore.
    }

    try {
      this.socket?.close(1000, 'client-stop');
    } catch {
      // Closing a CLOSED socket is fine.
    }
    this.socket = null;

    this.workletNode?.port.close();
    this.workletNode?.disconnect();
    this.workletNode = null;

    this.micSource?.disconnect();
    this.micSource = null;

    for (const track of this.micStream?.getAudioTracks() ?? []) {
      track.stop();
    }
    this.micStream = null;

    try {
      await this.audioContext?.close();
    } catch {
      // AudioContext may already be closed.
    }
    this.audioContext = null;
  }

  private async startRecorder(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: VOICE_SAMPLE_RATE,
        channelCount: 1,
      },
    });
    this.micStream = stream;

    const ctx = new AudioContext({ sampleRate: VOICE_SAMPLE_RATE });
    await ctx.audioWorklet.addModule(WORKLET_URL);
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    const node = new AudioWorkletNode(ctx, 'pcm-worklet');
    node.port.onmessage = (event) => {
      if (!(event.data instanceof ArrayBuffer)) return;
      this.onAudioChunk(new Uint8Array(event.data));
    };
    const source = ctx.createMediaStreamSource(stream);
    source.connect(node);

    this.audioContext = ctx;
    this.workletNode = node;
    this.micSource = source;
  }

  private onAudioChunk(bytes: Uint8Array): void {
    if (!this.connected || this.paused || this.stopped || !this.socket) return;
    this.chunksSent += 1;
    try {
      const audioBase64 = bytesToBase64(bytes);
      this.socket.send(
        JSON.stringify({
          type: 'audio_chunk',
          audio_base64: audioBase64,
        } satisfies VoiceClientMessage),
      );
    } catch {
      // Socket likely closing mid-reconnect.
    }
  }

  private buildWsUrl(): string {
    const base = WS_BASE_URL.replace(/\/+$/, '');
    const params = new URLSearchParams({
      user_id: this.userId,
      session_id: this.sessionId,
      sample_rate: String(VOICE_SAMPLE_RATE),
      endpointing_ms: String(ENDPOINTING_MS),
    });
    if (this.token.trim()) {
      params.set('token', this.token);
    }
    return `${base}${VOICE_PATH}?${params.toString()}`;
  }

  private async connect(): Promise<void> {
    if (this.stopped) return;
    try {
      const socket = new WebSocket(this.buildWsUrl());
      this.socket = socket;

      socket.addEventListener('open', () => {
        this.connected = true;
        this.reconnectAttempt = 0;
        this.resetSilenceTimer();
      });
      socket.addEventListener('message', (event) => {
        this.onWsData(event.data);
      });
      socket.addEventListener('error', () => {
        this.connected = false;
      });
      socket.addEventListener('close', (event) => {
        this.onWsClose(event);
      });
    } catch (err) {
      this.connected = false;
      this.events.onError(`connect failed: ${String(err)}`);
      await this.scheduleReconnect();
    }
  }

  private onWsData(data: unknown): void {
    if (typeof data !== 'string') return;
    this.resetSilenceTimer();
    const message = parseVoiceServerMessage(data);
    if (!message) return;
    this.events.onMessage(message);
  }

  private onWsClose(event: CloseEvent): void {
    this.connected = false;
    this.clearSilenceTimer();
    const clean = event.code === 1000;
    this.events.onClose(clean);
    if (this.stopped || clean) return;
    void this.scheduleReconnect();
  }

  private resetSilenceTimer(): void {
    this.clearSilenceTimer();
    if (this.stopped) return;
    this.silenceTimer = setTimeout(() => {
      this.onServerSilent();
    }, SERVER_SILENCE_TIMEOUT_MS);
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private onServerSilent(): void {
    if (this.stopped || !this.connected) return;
    this.connected = false;
    try {
      this.socket?.close(4000, 'silence-timeout');
    } catch {
      // Closing a CLOSED socket is fine.
    }
  }

  private async scheduleReconnect(): Promise<void> {
    if (this.stopped) return;
    const delay =
      this.reconnectAttempt === 0
        ? 1000
        : Math.min(MAX_RECONNECT_DELAY_MS, 2 ** this.reconnectAttempt * 1000);
    this.reconnectAttempt += 1;
    await new Promise<void>((resolve) => setTimeout(resolve, delay));
    // `this.stopped` may have flipped to true while we were sleeping above,
    // even though ESLint cannot infer that across the `await` boundary.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this.stopped) return;
    await this.connect();
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}
