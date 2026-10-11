import { ENDPOINTS } from "../config";

async function fetchAudio(text: string, voice: string): Promise<Blob> {
  const res = await fetch(ENDPOINTS.speak, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });
  if (!res.ok) throw new Error(`Speak returned ${res.status}`);
  return res.blob();
}

interface PendingItem {
  gen: number;
  promise: Promise<Blob>;
}

class SpeechQueue {
  private generation = 0;
  private pending: PendingItem[] = [];
  private playing = false;
  private currentAudio: HTMLAudioElement | null = null;
  private onSpeakingChange: ((speaking: boolean) => void) | null = null;

  private paused = false;
  private resumeResolvers: Array<() => void> = [];

  setSpeakingListener(fn: (speaking: boolean) => void): void {
    this.onSpeakingChange = fn;
  }

  /** Full stop — kill queue, kill playback, kill pause state. */
  interrupt(): void {
    this.generation += 1;
    this.pending = [];
    this.paused = false;
    this.wakeResolvers();

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = "";
      } catch {}
      this.currentAudio = null;
    }
    this.playing = false;
    this.onSpeakingChange?.(false);
  }

  /** Pause playback and hold the queue indefinitely until resume() or interrupt(). */
  pause(): void {
    if (this.paused) return;
    this.paused = true;

    if (this.currentAudio && !this.currentAudio.paused) {
      try { this.currentAudio.pause(); } catch {}
    }
  }

  /** Resume from where pause left off. */
  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.wakeResolvers();

    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().catch(() => {});
    }
    if (!this.playing && this.pending.length > 0) {
      void this.playNext();
    }
  }

  /**
   * Called by the wave when the user starts speaking.
   * Holds playback paused until interrupt() or resume() is called.
   */
  notifyUserSpeaking(): void {
    if (this.playing || this.pending.length > 0) {
      this.pause();
    }
  }

  enqueue(text: string, voice: string): void {
    const clean = text.trim();
    if (!clean) return;

    const gen = this.generation;
    const promise = fetchAudio(clean, voice);
    this.pending.push({ gen, promise });
    void this.playNext();
  }

  private wakeResolvers(): void {
    const resolvers = this.resumeResolvers.splice(0);
    for (const r of resolvers) r();
  }

  private async waitWhilePaused(gen: number): Promise<void> {
    while (this.paused && gen === this.generation) {
      await new Promise<void>((resolve) => {
        this.resumeResolvers.push(resolve);
      });
    }
  }

  private async playNext(): Promise<void> {
    if (this.playing) return;

    while (this.pending.length > 0 && this.pending[0].gen !== this.generation) {
      this.pending.shift();
    }

    const item = this.pending.shift();
    if (!item) {
      this.onSpeakingChange?.(false);
      return;
    }

    this.playing = true;
    this.onSpeakingChange?.(true);

    try {
      const blob = await item.promise;
      if (item.gen !== this.generation) return;

      await this.waitWhilePaused(item.gen);
      if (item.gen !== this.generation) return;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.currentAudio = audio;

      await new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.play().catch(() => resolve());
      });
    } catch (err) {
      console.error("[Buddy] TTS error:", err);
    } finally {
      this.currentAudio = null;
      this.playing = false;
      if (item.gen === this.generation) void this.playNext();
    }
  }
}

export const speechQueue = new SpeechQueue();