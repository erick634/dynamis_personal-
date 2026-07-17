/**
 * Local energy VAD used while agent TTS is playing.
 * Counts consecutive ~50 ms mic chunks above an RMS threshold.
 */

import { BARGE_IN_GRACE_MS, BARGE_IN_MIN_CHUNKS, BARGE_IN_RMS_THRESHOLD } from '@/lib/config';

export class BargeInVad {
  private hotChunks = 0;
  private armedAt = 0;
  private fired = false;

  arm(): void {
    this.hotChunks = 0;
    this.fired = false;
    this.armedAt = Date.now() + BARGE_IN_GRACE_MS;
  }

  reset(): void {
    this.hotChunks = 0;
    this.fired = false;
    this.armedAt = 0;
  }

  /** Returns true once when sustained speech is detected. */
  evaluate(rms: number): boolean {
    if (this.fired) return false;
    if (Date.now() < this.armedAt) return false;

    if (rms >= BARGE_IN_RMS_THRESHOLD) {
      this.hotChunks += 1;
    } else {
      this.hotChunks = 0;
      return false;
    }

    if (this.hotChunks < BARGE_IN_MIN_CHUNKS) return false;

    this.fired = true;
    this.hotChunks = 0;
    return true;
  }
}
