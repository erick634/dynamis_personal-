export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL ??
  API_BASE_URL.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');

export const DYNAMIS_JWT = import.meta.env.VITE_DYNAMIS_JWT ?? '';

/**
 * When `true`, the Live screen connects to the WebSocket even without a JWT.
 * Paired with the backend `DEV_AUTH_BYPASS=true` (local dev only) so the web
 * app can talk to `/voice/realtime` without going through WorkOS sign-in.
 */
export const ALLOW_EMPTY_TOKEN =
  (import.meta.env.VITE_ALLOW_EMPTY_TOKEN ?? '').toLowerCase() === 'true';

export const VOICE_PATH = '/voice/realtime';
export const VOICE_SAMPLE_RATE = 16000;
/** Silence before AssemblyAI ends the user turn. Higher = more thinking room. */
export const ENDPOINTING_MS = 2800;

/**
 * Local barge-in VAD while the agent is speaking.
 * RMS is measured on Float32 mic samples (~50 ms chunks in the worklet).
 */
export const BARGE_IN_RMS_THRESHOLD = 0.035;
/** Consecutive hot chunks (~50 ms each) required before interrupting TTS. */
export const BARGE_IN_MIN_CHUNKS = 3;
/** Ignore mic energy briefly after TTS starts (avoids speaker bleed). */
export const BARGE_IN_GRACE_MS = 400;
