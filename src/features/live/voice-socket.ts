/**
 * WebSocket transport for `/voice/realtime`: connect, silence watchdog, reconnect.
 */

import { parseVoiceServerMessage, type VoiceServerMessage } from '@/features/live/voice-protocol';

const SERVER_SILENCE_TIMEOUT_MS = 25_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export type VoiceSocketEvents = {
  onMessage: (message: VoiceServerMessage) => void;
  onClose: (clean: boolean) => void;
  onError: (error: string) => void;
};

export class VoiceSocket {
  private readonly events: VoiceSocketEvents;
  private readonly buildUrl: () => string;
  private readonly shouldReconnect: () => boolean;

  private socket: WebSocket | null = null;
  private connected = false;
  private reconnectAttempt = 0;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: {
    buildUrl: () => string;
    shouldReconnect: () => boolean;
    events: VoiceSocketEvents;
  }) {
    this.buildUrl = opts.buildUrl;
    this.shouldReconnect = opts.shouldReconnect;
    this.events = opts.events;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  get raw(): WebSocket | null {
    return this.socket;
  }

  async connect(): Promise<void> {
    if (!this.shouldReconnect()) return;
    try {
      const socket = new WebSocket(this.buildUrl());
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

  send(data: string): void {
    if (!this.connected || !this.socket) return;
    this.socket.send(data);
  }

  close(code = 1000, reason = 'client-stop'): void {
    this.connected = false;
    this.clearSilenceTimer();
    try {
      this.socket?.close(code, reason);
    } catch {
      // Closing a CLOSED socket is fine.
    }
    this.socket = null;
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
    if (!this.shouldReconnect() || clean) return;
    void this.scheduleReconnect();
  }

  private resetSilenceTimer(): void {
    this.clearSilenceTimer();
    if (!this.shouldReconnect()) return;
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
    if (!this.shouldReconnect() || !this.connected) return;
    this.connected = false;
    try {
      this.socket?.close(4000, 'silence-timeout');
    } catch {
      // Closing a CLOSED socket is fine.
    }
  }

  private async scheduleReconnect(): Promise<void> {
    if (!this.shouldReconnect()) return;
    const delay =
      this.reconnectAttempt === 0
        ? 1000
        : Math.min(MAX_RECONNECT_DELAY_MS, 2 ** this.reconnectAttempt * 1000);
    this.reconnectAttempt += 1;
    await new Promise<void>((resolve) => setTimeout(resolve, delay));
    if (!this.shouldReconnect()) return;
    await this.connect();
  }
}
