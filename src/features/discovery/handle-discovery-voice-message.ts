import type {
  DiscoveryVoiceMode,
  DiscoveryVoiceStatus,
} from '@/features/discovery/discovery-voice-types';
import type { StreamingTtsPlayer } from '@/features/live/streaming-tts-player';
import type { VoiceService } from '@/features/live/voice-service';
import type { VoiceServerMessage } from '@/features/live/voice-protocol';

type VoiceMessageHandlerDeps = {
  modeRef: { current: DiscoveryVoiceMode };
  statusRef: { current: DiscoveryVoiceStatus };
  streamingActiveRef: { current: boolean };
  interruptPendingRef: { current: boolean };
  serviceRef: { current: VoiceService | null };
  playerRef: { current: StreamingTtsPlayer | null };
  onFinalTranscript: (text: string) => void;
  onLiveUserUtterance?: (text: string) => void;
  onLiveAgentReply?: (text: string) => void;
  onSessionId?: (sessionId: string) => void;
  setPartialTranscript: (text: string) => void;
  setStatus: (status: DiscoveryVoiceStatus) => void;
  setVoiceError: (error: string | null) => void;
  interruptAgent: () => void;
  teardown: () => void;
};

export function handleDiscoveryVoiceMessage(
  message: VoiceServerMessage,
  deps: VoiceMessageHandlerDeps,
): void {
  const isFull = deps.modeRef.current === 'full';

  switch (message.type) {
    case 'ready':
    case 'stt_ready':
      deps.setVoiceError(null);
      deps.setStatus('listening');
      break;

    case 'transcript_partial': {
      const text = message.text;
      if (
        isFull &&
        text.trim().length > 0 &&
        (deps.statusRef.current === 'speaking' || deps.statusRef.current === 'thinking')
      ) {
        deps.interruptAgent();
      }
      deps.setPartialTranscript(text);
      if (isFull) {
        deps.setStatus('listening');
      }
      break;
    }

    case 'transcript_final': {
      const text = message.text.trim();
      deps.setPartialTranscript('');
      if (!text) {
        break;
      }
      if (isFull) {
        deps.onLiveUserUtterance?.(text);
        deps.setStatus('thinking');
      } else {
        deps.onFinalTranscript(text);
      }
      break;
    }

    case 'turn_started':
      if (isFull) {
        deps.setStatus('thinking');
      }
      break;

    case 'turn_canceled':
      if (isFull) {
        deps.streamingActiveRef.current = false;
        deps.interruptPendingRef.current = false;
        deps.playerRef.current?.cancel();
        deps.serviceRef.current?.resumeRecorder();
        deps.setStatus('listening');
      }
      break;

    case 'tts_audio_start':
      if (isFull) {
        deps.streamingActiveRef.current = true;
        deps.setStatus('speaking');
        deps.serviceRef.current?.enableBargeInListen();
        deps.playerRef.current?.beginStream();
      }
      break;

    case 'tts_audio_chunk':
      if (isFull) {
        void deps.playerRef.current?.addChunk(message.seq, message.audioBase64);
      }
      break;

    case 'tts_audio_end':
      if (isFull) {
        deps.streamingActiveRef.current = false;
        deps.playerRef.current?.endStream(message.reason);
      }
      break;

    case 'tts_audio':
      if (isFull) {
        deps.streamingActiveRef.current = true;
        deps.setStatus('speaking');
        deps.serviceRef.current?.enableBargeInListen();
        deps.playerRef.current?.beginStream();
        void deps.playerRef.current?.addChunk(0, message.audioBase64);
        deps.streamingActiveRef.current = false;
        deps.playerRef.current?.endStream('ok');
      }
      break;

    case 'agent_reply': {
      if (!isFull) {
        break;
      }
      const text = message.text.trim();
      if (message.sessionId) {
        deps.onSessionId?.(message.sessionId);
      }
      if (text) {
        deps.onLiveAgentReply?.(text);
      }
      break;
    }

    case 'interrupt_ack':
      if (isFull) {
        deps.interruptPendingRef.current = false;
        deps.streamingActiveRef.current = false;
        deps.setStatus('listening');
      }
      break;

    case 'warning':
      deps.setVoiceError(message.text ?? message.message ?? null);
      if (isFull) {
        deps.streamingActiveRef.current = false;
        deps.interruptPendingRef.current = false;
        deps.playerRef.current?.cancel();
        deps.serviceRef.current?.resumeRecorder();
        deps.setStatus('listening');
      }
      break;

    case 'error':
      deps.setVoiceError(message.text ?? message.message ?? 'Voice error');
      deps.teardown();
      deps.setStatus('error');
      break;

    case 'terminated':
      deps.teardown();
      break;

    default:
      break;
  }
}
