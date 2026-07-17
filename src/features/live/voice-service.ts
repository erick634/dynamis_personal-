/**
 * Web equivalent of `app-live-kit`'s `voice_service.dart`.
 *
 * Owns the microphone (`getUserMedia` + AudioWorklet) and the WebSocket to
 * the backend `/voice/realtime`. Half-duplex with barge-in: while the agent
 * speaks, PCM is not forwarded to STT, but local RMS VAD can fire `onBargeIn`.
 */

import { ENDPOINTING_MS, VOICE_PATH, VOICE_SAMPLE_RATE, WS_BASE_URL } from '@/lib/config';
import { BargeInVad } from '@/features/live/barge-in-vad';
import type { VoiceClientMessage, VoiceServerMessage } from '@/features/live/voice-protocol';
import { VoiceSocket } from '@/features/live/voice-socket';

const WORKLET_URL = '/audio/pcm-worklet.js';

export type VoiceServiceEvents = {
  onMessage: (message: VoiceServerMessage) => void;
  onClose: (clean: boolean) => void;
  onError: (error: string) => void;
  onBargeIn?: () => void;
};

export type VoiceServiceMode = 'full' | 'stt_only';

export type VoiceServiceStartOptions = {
  sessionId: string;
  token: string;
  userId: string;
  mode?: VoiceServiceMode;
};

type RecorderGate = 'streaming' | 'barge_in_listen' | 'paused';

export class VoiceService {
  private readonly events: VoiceServiceEvents;
  private readonly bargeInVad = new BargeInVad();
  private socket: VoiceSocket | null = null;

  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;

  private stopped = false;
  private gate: RecorderGate = 'streaming';
  private chunksSent = 0;

  private sessionId = '';
  private token = '';
  private userId = '';
  private mode: VoiceServiceMode = 'full';

  constructor(events: VoiceServiceEvents) {
    this.events = events;
  }

  async start({
    sessionId,
    token,
    userId,
    mode = 'full',
  }: VoiceServiceStartOptions): Promise<void> {
    this.sessionId = sessionId;
    this.token = token;
    this.userId = userId;
    this.mode = mode;
    this.stopped = false;
    this.chunksSent = 0;
    this.gate = 'streaming';
    this.bargeInVad.reset();

    await this.startRecorder();
    this.socket = new VoiceSocket({
      buildUrl: () => this.buildWsUrl(),
      shouldReconnect: () => !this.stopped,
      events: {
        onMessage: this.events.onMessage,
        onClose: this.events.onClose,
        onError: this.events.onError,
      },
    });
    await this.socket.connect();
  }

  sendMessage(payload: VoiceClientMessage): void {
    if (this.stopped || !this.socket?.isConnected) return;
    try {
      this.socket.send(JSON.stringify(payload));
    } catch (err) {
      this.events.onError(`send failed: ${String(err)}`);
    }
  }

  pauseRecorder(): void {
    if (!this.micStream) return;
    this.gate = 'paused';
    this.bargeInVad.reset();
    for (const track of this.micStream.getAudioTracks()) {
      track.enabled = false;
    }
  }

  resumeRecorder(): void {
    if (!this.micStream || this.stopped) return;
    this.gate = 'streaming';
    this.bargeInVad.reset();
    for (const track of this.micStream.getAudioTracks()) {
      track.enabled = true;
    }
  }

  /** Mic open for local VAD only — no PCM to AssemblyAI while agent TTS plays. */
  enableBargeInListen(): void {
    if (!this.micStream || this.stopped) return;
    this.gate = 'barge_in_listen';
    this.bargeInVad.arm();
    for (const track of this.micStream.getAudioTracks()) {
      track.enabled = true;
    }
  }

  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    this.gate = 'paused';
    this.bargeInVad.reset();

    try {
      this.socket?.send(JSON.stringify({ type: 'terminate' } satisfies VoiceClientMessage));
    } catch {
      // Socket may already be closing — ignore.
    }
    this.socket?.close(1000, 'client-stop');
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
      this.onWorkletMessage(event.data);
    };
    const source = ctx.createMediaStreamSource(stream);
    source.connect(node);

    this.audioContext = ctx;
    this.workletNode = node;
    this.micSource = source;
  }

  private onWorkletMessage(data: unknown): void {
    if (data instanceof ArrayBuffer) {
      this.onAudioChunk(new Uint8Array(data), 0);
      return;
    }
    if (!data || typeof data !== 'object') return;
    const msg = data as { type?: string; pcm?: ArrayBuffer; rms?: number };
    if (msg.type !== 'chunk' || !(msg.pcm instanceof ArrayBuffer)) return;
    this.onAudioChunk(new Uint8Array(msg.pcm), typeof msg.rms === 'number' ? msg.rms : 0);
  }

  private onAudioChunk(bytes: Uint8Array, rms: number): void {
    if (this.stopped) return;

    if (this.gate === 'barge_in_listen') {
      if (this.bargeInVad.evaluate(rms)) {
        this.events.onBargeIn?.();
      }
      return;
    }

    if (this.gate !== 'streaming' || !this.socket?.isConnected) return;

    this.chunksSent += 1;
    try {
      this.socket.send(
        JSON.stringify({
          type: 'audio_chunk',
          audio_base64: bytesToBase64(bytes),
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
      mode: this.mode,
    });
    if (this.token.trim()) {
      params.set('token', this.token);
    }
    return `${base}${VOICE_PATH}?${params.toString()}`;
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
