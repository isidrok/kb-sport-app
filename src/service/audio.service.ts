export class AudioService {
  private audioContext: AudioContext | null = null;
  private speechSynthesis: SpeechSynthesis;
  private isInitialized = false;

  constructor() {
    this.speechSynthesis = window.speechSynthesis;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize Audio Context for beeps
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      this.isInitialized = true;
    } catch (error) {
      console.warn("Failed to initialize audio context:", error);
    }
  }

  private async ensureAudioContextResumed(): Promise<boolean> {
    if (!this.audioContext) return false;

    if (this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
        return true;
      } catch (error) {
        console.warn("Failed to resume audio context:", error);
        return false;
      }
    }

    return this.audioContext.state === "running";
  }

  /**
   * Play a beep sound
   * @param frequency - Frequency in Hz (default: 800)
   * @param duration - Duration in milliseconds (default: 200)
   * @param volume - Volume from 0 to 1 (default: 0.3)
   */
  async playBeep(frequency = 800, duration = 200, volume = 0.3): Promise<void> {
    if (!this.audioContext || !(await this.ensureAudioContextResumed())) {
      console.warn("Audio context not available for beep");
      return;
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(
        frequency,
        this.audioContext.currentTime
      );
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        volume,
        this.audioContext.currentTime + 0.01
      );
      gainNode.gain.linearRampToValueAtTime(
        0,
        this.audioContext.currentTime + duration / 1000
      );

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.warn("Failed to play beep:", error);
    }
  }

  /**
   * Play a countdown beep (higher pitch)
   */
  async playCountdownBeep(): Promise<void> {
    await this.playBeep(1000, 150, 0.4);
  }

  /**
   * Play a start beep (different tone)
   */
  async playStartBeep(): Promise<void> {
    await this.playBeep(600, 300, 0.5);
  }

  /**
   * Play a milestone beep (celebratory tone)
   */
  async playMilestoneBeep(): Promise<void> {
    // Play a quick sequence of ascending beeps
    await this.playBeep(600, 100, 0.3);
    setTimeout(() => this.playBeep(800, 100, 0.3), 120);
    setTimeout(() => this.playBeep(1000, 150, 0.3), 240);
  }

  /**
   * Speak text using text-to-speech
   * @param text - Text to speak
   * @param rate - Speech rate (0.1 to 10, default: 1)
   * @param pitch - Speech pitch (0 to 2, default: 1)
   * @param volume - Speech volume (0 to 1, default: 0.8)
   */
  async speak(text: string, rate = 1, pitch = 1, volume = 0.8): Promise<void> {
    if (!this.speechSynthesis) {
      console.warn("Speech synthesis not available");
      return;
    }

    try {
      // Cancel any ongoing speech
      this.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = Math.max(0.1, Math.min(10, rate));
      utterance.pitch = Math.max(0, Math.min(2, pitch));
      utterance.volume = Math.max(0, Math.min(1, volume));

      // Use a more natural voice if available
      const voices = this.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find(
          (voice) =>
            voice.lang.startsWith("en") &&
            (voice.name.includes("Google") || voice.name.includes("Microsoft"))
        ) || voices.find((voice) => voice.lang.startsWith("en"));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      return new Promise((resolve) => {
        utterance.onend = () => resolve();
        utterance.onerror = (error) => {
          console.warn("Speech synthesis error:", error);
          resolve(); // Resolve anyway to not block the flow
        };

        this.speechSynthesis.speak(utterance);

        // Fallback timeout in case onend doesn't fire
        setTimeout(() => resolve(), 5000);
      });
    } catch (error) {
      console.warn("Failed to speak text:", error);
    }
  }

  /**
   * Announce current repetition count
   */
  async announceReps(count: number): Promise<void> {
    let message: string;
    if (count === 1) {
      message = "1 rep";
    } else if (count < 100) {
      message = `${count} reps`;
    } else {
      // For large numbers, make it more natural
      message = `${count} repetitions`;
    }

    await this.speak(message, 1.1, 1, 0.7);
  }

  /**
   * Announce current pace (reps per minute)
   */
  async announcePace(repsPerMinute: number): Promise<void> {
    const rounded = Math.round(repsPerMinute);
    let message: string;

    if (rounded === 0) {
      message = "No pace data yet";
    } else if (rounded === 1) {
      message = "1 rep per minute";
    } else {
      message = `${rounded} reps per minute`;
    }

    await this.speak(message, 1.1, 1, 0.7);
  }

  /**
   * Announce session end with summary
   */
  async announceSessionEnd(
    totalReps: number,
    averagePace: number
  ): Promise<void> {
    const paceRounded = Math.round(averagePace);
    let message = `Session complete. ${totalReps} total reps`;

    if (paceRounded > 0) {
      message += ` at ${paceRounded} reps per minute average`;
    }

    await this.speak(message, 1, 1, 0.8);
  }

  /**
   * Stop any ongoing speech
   */
  stopSpeech(): void {
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }
  }

  /**
   * Check if audio features are available
   */
  isAudioAvailable(): boolean {
    return this.isInitialized && !!this.audioContext;
  }

  /**
   * Check if speech synthesis is available
   */
  isSpeechAvailable(): boolean {
    return !!this.speechSynthesis && "speechSynthesis" in window;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopSpeech();

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
    }

    this.audioContext = null;
    this.isInitialized = false;
  }
}
