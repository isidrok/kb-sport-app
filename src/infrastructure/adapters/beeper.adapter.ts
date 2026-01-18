/**
 * Beeper adapter using Web Audio API.
 *
 * Provides audio feedback using browser's AudioContext and OscillatorNode.
 * Implements a queue system to prevent overlapping sounds.
 */
export class BeeperAdapter {
  private audioContext: AudioContext | null = null;
  private beepQueue: Array<() => Promise<void>> = [];
  private isPlaying = false;

  /**
   * Initialize AudioContext (lazy initialization)
   */
  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  /**
   * Play a beep with specified duration and frequency
   */
  async beep(duration: number, frequency: number): Promise<void> {
    return new Promise((resolve) => {
      try {
        const ctx = this.getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = "sine";

        // Envelope to prevent clicking
        const now = ctx.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
        gainNode.gain.linearRampToValueAtTime(0.3, now + duration / 1000 - 0.01);
        gainNode.gain.linearRampToValueAtTime(0, now + duration / 1000);

        oscillator.start(now);
        oscillator.stop(now + duration / 1000);

        oscillator.onended = () => {
          resolve();
        };
      } catch (error) {
        console.error("Failed to play beep:", error);
        resolve();
      }
    });
  }

  /**
   * Quick beep for workout start - 100ms at 800Hz
   */
  async quickBeep(): Promise<void> {
    return this.enqueueBeep(() => this.beep(100, 800));
  }

  /**
   * Double quick beep for workout stop - two 100ms beeps with 100ms gap
   */
  async doubleBeep(): Promise<void> {
    return this.enqueueBeep(async () => {
      await this.beep(100, 800);
      await this.delay(100);
      await this.beep(100, 800);
    });
  }

  /**
   * Countdown beep - 150ms at 600Hz for countdown seconds
   */
  async countdownBeep(): Promise<void> {
    return this.enqueueBeep(() => this.beep(150, 600));
  }

  /**
   * Time interval beep - 200ms at 1000Hz for time-based intervals
   * Higher pitch and longer duration than rep beep
   */
  async timeIntervalBeep(): Promise<void> {
    return this.enqueueBeep(() => this.beep(200, 1000));
  }

  /**
   * Enqueue a beep to prevent overlapping sounds
   */
  private async enqueueBeep(beepFn: () => Promise<void>): Promise<void> {
    this.beepQueue.push(beepFn);
    
    if (!this.isPlaying) {
      await this.processQueue();
    }
  }

  /**
   * Process the beep queue
   */
  private async processQueue(): Promise<void> {
    if (this.beepQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const beepFn = this.beepQueue.shift();
    
    if (beepFn) {
      await beepFn();
    }

    // Continue processing queue
    await this.processQueue();
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.beepQueue = [];
    this.isPlaying = false;
  }
}

// Export singleton instance
export const beeperAdapter = new BeeperAdapter();
