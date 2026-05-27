/**
 * pcm-worklet.js
 *
 * AudioWorkletProcessor that converts Float32 microphone samples to little-
 * endian Int16 PCM and posts them back to the main thread in ~50 ms chunks.
 *
 * Loaded by the VoiceService via `audioContext.audioWorklet.addModule(
 * '/audio/pcm-worklet.js')`. The AudioContext is constructed at 16 kHz, so
 * no resampling is needed here.
 *
 * Mirrors the chunk cadence used by `app-live-kit`'s `record` plugin.
 */

const TARGET_CHUNK_SAMPLES = 800; // 50 ms @ 16 kHz

class PcmWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Int16Array(TARGET_CHUNK_SAMPLES);
    this._offset = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      let sample = channel[i];
      if (sample > 1) sample = 1;
      else if (sample < -1) sample = -1;
      this._buffer[this._offset++] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;

      if (this._offset === TARGET_CHUNK_SAMPLES) {
        const chunk = new Int16Array(TARGET_CHUNK_SAMPLES);
        chunk.set(this._buffer);
        this.port.postMessage(chunk.buffer, [chunk.buffer]);
        this._offset = 0;
      }
    }
    return true;
  }
}

registerProcessor('pcm-worklet', PcmWorkletProcessor);
