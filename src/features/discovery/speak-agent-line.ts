import { API_BASE_URL, DYNAMIS_JWT } from '@/lib/config';

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (DYNAMIS_JWT.trim()) {
    headers.Authorization = `Bearer ${DYNAMIS_JWT}`;
  }
  return headers;
}

function base64ToObjectUrl(base64: string, mimeType: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

/** Tiny silent WAV — unlocks autoplay when played inside a user gesture. */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

let sharedAudio: HTMLAudioElement | null = null;

function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = 'auto';
  }
  return sharedAudio;
}

/**
 * Call synchronously inside a click/tap handler so later TTS play() is allowed.
 */
export function unlockAgentAudio(): void {
  const audio = getSharedAudio();
  audio.src = SILENT_WAV;
  void audio
    .play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
    })
    .catch(() => {
      // Ignore — browser may still allow the later play after fetch.
    });
}

/**
 * One-shot Cartesia TTS via POST /tts — used for short agent lines outside
 * the live voice WebSocket (e.g. identity gate prompt).
 */
export async function speakAgentLine(text: string, signal?: AbortSignal): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) {
    return;
  }

  const response = await fetch(`${API_BASE_URL}/tts`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({ text: trimmed }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`TTS failed (${String(response.status)})`);
  }

  const data: unknown = await response.json();
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid TTS payload.');
  }

  const record = data as { audio_base64?: unknown; mime_type?: unknown };
  const audioBase64 = typeof record.audio_base64 === 'string' ? record.audio_base64.trim() : '';
  const mimeType =
    typeof record.mime_type === 'string' && record.mime_type.trim()
      ? record.mime_type.trim()
      : 'audio/mpeg';

  if (!audioBase64) {
    throw new Error('TTS returned empty audio.');
  }

  if (signal?.aborted) {
    return;
  }

  const url = base64ToObjectUrl(audioBase64, mimeType);
  const audio = getSharedAudio();
  try {
    audio.pause();
    audio.src = url;
    await new Promise<void>((resolve, reject) => {
      const onEnded = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('Audio playback failed.'));
      };
      const onAbort = () => {
        audio.pause();
        cleanup();
        resolve();
      };
      const cleanup = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        signal?.removeEventListener('abort', onAbort);
      };
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);
      signal?.addEventListener('abort', onAbort, { once: true });
      if (signal?.aborted) {
        cleanup();
        resolve();
        return;
      }
      void audio.play().catch(onError);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
