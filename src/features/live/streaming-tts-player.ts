/**
 * Web equivalent of `app-live-kit`'s `streaming_tts_player.dart`.
 *
 * Plays a FIFO queue of self-contained MP3 chunks (one MP3 per sentence) on
 * a single reused `HTMLAudioElement`. Emits `idle | playing | drained` so
 * the live session can re-enable the microphone exactly when audio output
 * is finished.
 */

export type TtsPlaybackState = 'idle' | 'playing' | 'drained';

export type TtsPlayerOptions = {
  onStateChange?: (state: TtsPlaybackState) => void;
};

export class StreamingTtsPlayer {
  private readonly audio: HTMLAudioElement;
  private readonly queue: string[] = [];
  private readonly onStateChange?: (state: TtsPlaybackState) => void;

  private isPlaying = false;
  private streamEnded = false;
  private lastSeqAccepted: number | null = null;
  private currentUrl: string | null = null;
  private disposed = false;

  constructor(options: TtsPlayerOptions = {}) {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.addEventListener('ended', () => {
      this.releaseCurrentUrl();
      void this.playNext();
    });
    this.audio.addEventListener('error', () => {
      this.releaseCurrentUrl();
      void this.playNext();
    });
    this.onStateChange = options.onStateChange;
  }

  beginStream(): void {
    if (this.disposed) return;
    this.stopAndClear();
    this.streamEnded = false;
    this.lastSeqAccepted = null;
    this.emit('idle');
  }

  async addChunk(seq: number, base64: string): Promise<void> {
    if (this.disposed) return;
    if (this.lastSeqAccepted !== null && seq <= this.lastSeqAccepted) return;
    this.lastSeqAccepted = seq;
    const url = base64ToObjectUrl(base64);
    this.queue.push(url);
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  endStream(reason: 'ok' | 'canceled' | 'error'): void {
    if (this.disposed) return;
    this.streamEnded = true;
    if (reason !== 'ok') {
      this.stopAndClear();
      this.emit('drained');
      return;
    }
    if (!this.isPlaying && this.queue.length === 0) {
      this.emit('drained');
    }
  }

  cancel(): void {
    if (this.disposed) return;
    this.streamEnded = true;
    this.stopAndClear();
    this.emit('drained');
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopAndClear();
    this.audio.removeAttribute('src');
    this.audio.load();
  }

  private async playNext(): Promise<void> {
    if (this.disposed) return;
    const next = this.queue.shift();
    if (!next) {
      this.isPlaying = false;
      if (this.streamEnded) this.emit('drained');
      return;
    }
    this.isPlaying = true;
    this.currentUrl = next;
    this.audio.src = next;
    this.emit('playing');
    try {
      await this.audio.play();
    } catch {
      this.releaseCurrentUrl();
      this.isPlaying = false;
      await this.playNext();
    }
  }

  private stopAndClear(): void {
    try {
      this.audio.pause();
    } catch {
      // Audio may not be playing — ignore.
    }
    this.audio.currentTime = 0;
    for (const url of this.queue) URL.revokeObjectURL(url);
    this.queue.length = 0;
    this.releaseCurrentUrl();
    this.isPlaying = false;
  }

  private releaseCurrentUrl(): void {
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = null;
    }
  }

  private emit(state: TtsPlaybackState): void {
    this.onStateChange?.(state);
  }
}

function base64ToObjectUrl(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
}
