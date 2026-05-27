/**
 * Voice WebSocket protocol for the backend `/voice/realtime` endpoint.
 *
 * Mirrors the message taxonomy implemented by `app-live-kit`'s
 * `voice_message.dart`. Keep both sides in sync — if the backend adds a new
 * message type, extend the discriminated union here AND update the parser.
 */

export type VoiceSessionState =
  | 'listening'
  | 'user_speaking'
  | 'thinking'
  | 'assistant_speaking'
  | 'barge_in_pending';

export type VoiceServerMessage =
  | { type: 'ready' }
  | { type: 'stt_ready' }
  | { type: 'transcript_partial'; text: string }
  | { type: 'transcript_final'; text: string }
  | { type: 'session_state'; state: VoiceSessionState }
  | { type: 'turn_started' }
  | { type: 'turn_canceled' }
  | { type: 'interrupt_ack' }
  | { type: 'terminated' }
  | { type: 'agent_reply'; text: string; sessionId?: string }
  | { type: 'tts_audio_start' }
  | { type: 'tts_audio_chunk'; seq: number; audioBase64: string }
  | { type: 'tts_audio_end'; reason: 'ok' | 'canceled' | 'error'; totalChunks?: number }
  | { type: 'tts_audio'; audioBase64: string }
  | { type: 'warning'; code?: string; message?: string; text?: string }
  | { type: 'error'; code?: string; message?: string; text?: string };

export type VoiceClientMessage =
  | { type: 'audio_chunk'; audio_base64: string }
  | { type: 'interrupt' }
  | { type: 'terminate' };

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asState(value: unknown): VoiceSessionState | undefined {
  if (typeof value !== 'string') return undefined;
  switch (value) {
    case 'listening':
    case 'user_speaking':
    case 'thinking':
    case 'assistant_speaking':
    case 'barge_in_pending':
      return value;
    default:
      return undefined;
  }
}

function asReason(value: unknown): 'ok' | 'canceled' | 'error' {
  if (value === 'canceled' || value === 'error') return value;
  return 'ok';
}

/** Defensive parser — returns `null` for unknown or malformed payloads. */
export function parseVoiceServerMessage(raw: string): VoiceServerMessage | null {
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof payload !== 'object' || payload === null) return null;
  const obj = payload as Record<string, unknown>;
  const type = asString(obj.type);
  if (!type) return null;

  switch (type) {
    case 'ready':
      return { type: 'ready' };
    case 'stt_ready':
      return { type: 'stt_ready' };
    case 'transcript_partial':
      return { type: 'transcript_partial', text: asString(obj.text) ?? '' };
    case 'transcript_final':
      return { type: 'transcript_final', text: asString(obj.text) ?? '' };
    case 'session_state': {
      const state = asState(obj.state);
      return state ? { type: 'session_state', state } : null;
    }
    case 'turn_started':
      return { type: 'turn_started' };
    case 'turn_canceled':
      return { type: 'turn_canceled' };
    case 'interrupt_ack':
      return { type: 'interrupt_ack' };
    case 'terminated':
      return { type: 'terminated' };
    case 'agent_reply':
      return {
        type: 'agent_reply',
        text: asString(obj.text) ?? '',
        sessionId: asString(obj.session_id),
      };
    case 'tts_audio_start':
      return { type: 'tts_audio_start' };
    case 'tts_audio_chunk': {
      const seq = asNumber(obj.seq);
      const audioBase64 = asString(obj.audio_base64);
      if (seq === undefined || !audioBase64) return null;
      return { type: 'tts_audio_chunk', seq, audioBase64 };
    }
    case 'tts_audio_end':
      return {
        type: 'tts_audio_end',
        reason: asReason(obj.reason),
        totalChunks: asNumber(obj.total_chunks),
      };
    case 'tts_audio': {
      const audioBase64 = asString(obj.audio_base64);
      return audioBase64 ? { type: 'tts_audio', audioBase64 } : null;
    }
    case 'warning':
      return {
        type: 'warning',
        code: asString(obj.code),
        message: asString(obj.message),
        text: asString(obj.text),
      };
    case 'error':
      return {
        type: 'error',
        code: asString(obj.code),
        message: asString(obj.message),
        text: asString(obj.text),
      };
    default:
      return null;
  }
}
