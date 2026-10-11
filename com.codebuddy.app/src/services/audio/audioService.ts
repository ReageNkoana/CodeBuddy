import { ENDPOINTS } from "../config";

const API_URL = ENDPOINTS.transcribe;

const POLL_MS = 50;

// ---- Speech capture tuning ----

// Minimum speech duration for a clip to be considered real speech.
const MIN_SPEECH_MS = 300;

// How long of a pause ends the utterance.
const SILENCE_MS = 500;

// Minimum audio blob size.
const MIN_BLOB_BYTES = 2000;

// RMS to START recording. Lower = more sensitive.
const MIN_START_RMS = 0.04;

// RMS to KEEP recording once started. Lower = won't cut on quiet syllables.
const MIN_END_RMS = 0.08;

// Adaptive noise-floor multipliers.
const START_MULTIPLIER = 2.2;
const END_MULTIPLIER = 2.2;
const NOISE_ADAPTATION = 0.04;

// Peak RMS during utterance. Filters mouse clicks (spike <0.03) but
// accepts normal speech (0.08+).
const MIN_PEAK_RMS = 0.03;

export interface TranscriptHandlers {
  onFinal: (text: string) => void;
  onError: (err: Error) => void;
}

export class AudioService {
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;

  private activeRecorder: MediaRecorder | null = null;
  private activeChunks: Blob[] = [];

  private stopped = true;
  private speaking = false;
  private lastSpeechTime = 0;
  private speechDurationMs = 0;
  private peakRms = 0;
  private lastTickTime = 0;
  private noiseFloor = 0.005;
  private pollHandle: number | null = null;

  private transcriptionQueue: Promise<void> = Promise.resolve();

  async start(handlers: TranscriptHandlers): Promise<void> {
    if (!this.stopped) return;

    this.stopped = false;
    this.speaking = false;
    this.noiseFloor = 0.005;
    this.speechDurationMs = 0;
    this.peakRms = 0;
    this.lastTickTime = performance.now();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (this.stopped) {
        this.stream.getTracks().forEach((t) => t.stop());
        this.stream = null;
        return;
      }

      this.audioCtx = new AudioContext();
      await this.audioCtx.resume();

      this.source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.source.connect(this.analyser);

      this.lastTickTime = performance.now();
      this.pollHandle = window.setInterval(
        () => this.tick(handlers),
        POLL_MS,
      );
    } catch (err) {
      await this.stop();
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  private tick(handlers: TranscriptHandlers): void {
    if (this.stopped || !this.analyser) return;

    const samples = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(samples);

    let sum = 0;
    for (const s of samples) sum += s * s;
    const rms = Math.sqrt(sum / samples.length);

    const now = performance.now();
    const elapsed = Math.min(now - this.lastTickTime, POLL_MS * 2);
    this.lastTickTime = now;

    const startThreshold = Math.max(
      MIN_START_RMS,
      this.noiseFloor * START_MULTIPLIER,
    );
    const endThreshold = Math.max(
      MIN_END_RMS,
      this.noiseFloor * END_MULTIPLIER,
    );

    if (!this.speaking) {
      this.noiseFloor +=
        (Math.min(rms, 0.1) - this.noiseFloor) * NOISE_ADAPTATION;

      if (rms >= startThreshold) {
        this.speaking = true;
        this.lastSpeechTime = now;
        this.speechDurationMs = 0;
        this.peakRms = rms;
        this.startRecording();
      }
      return;
    }

    this.speechDurationMs += elapsed;
    this.peakRms = Math.max(this.peakRms, rms);

    if (rms >= endThreshold) {
      this.lastSpeechTime = now;
      return;
    }

    if (now - this.lastSpeechTime >= SILENCE_MS) {
      this.speaking = false;
      void this.stopAndSend(handlers);
    }
  }

  private startRecording(): void {
    if (!this.stream || this.stopped) return;

    const mimeType = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
    ].find((t) => MediaRecorder.isTypeSupported(t));

    const myChunks: Blob[] = [];

    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(this.stream, { mimeType })
        : new MediaRecorder(this.stream);
    } catch (err) {
      console.error("[Buddy] Could not start recording:", err);
      return;
    }

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) myChunks.push(event.data);
    };

    this.activeRecorder = recorder;
    this.activeChunks = myChunks;

    try {
      recorder.start();
    } catch (err) {
      console.error("[Buddy] recorder.start failed:", err);
      this.activeRecorder = null;
      this.activeChunks = [];
    }
  }

  private async stopAndSend(handlers: TranscriptHandlers): Promise<void> {
    const recorder = this.activeRecorder;
    const myChunks = this.activeChunks;
    const speechMs = this.speechDurationMs;
    const peak = this.peakRms;

    this.activeRecorder = null;
    this.activeChunks = [];
    this.speechDurationMs = 0;
    this.peakRms = 0;

    if (!recorder || recorder.state === "inactive") return;

    const blob = await new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        setTimeout(() => {
          try {
            resolve(new Blob(myChunks, {
              type: recorder.mimeType || "audio/webm",
            }));
          } catch (err) {
            console.error("[Buddy] Blob build failed:", err);
            resolve(null);
          }
        }, 0);
      };

      recorder.onerror = () => {
        console.error("[Buddy] recorder error");
        resolve(null);
      };

      try {
        recorder.stop();
      } catch (err) {
        console.error("[Buddy] recorder.stop failed:", err);
        resolve(null);
      }
    });

    if (!blob || this.stopped) return;

    if (speechMs < MIN_SPEECH_MS) return;
    if (blob.size < MIN_BLOB_BYTES) return;
    if (peak < MIN_PEAK_RMS) return;

    this.transcriptionQueue = this.transcriptionQueue
      .then(async () => {
        if (this.stopped) return;

        const form = new FormData();
        const ext = blob.type.includes("mp4") ? "mp4" : "webm";
        form.append("audio", blob, `utterance.${ext}`);

        try {
          const response = await fetch(API_URL, {
            method: "POST",
            body: form,
          });

          if (!response.ok) {
            throw new Error(`Transcribe returned ${response.status}`);
          }

          const data: { text?: string } = await response.json();
          const text = data.text?.trim();

          if (text && text.length > 1 && !this.stopped) {
            handlers.onFinal(text);
          }
        } catch (err) {
          if (!this.stopped) {
            handlers.onError(
              err instanceof Error ? err : new Error(String(err)),
            );
          }
        }
      })
      .catch((err: unknown) => {
        if (!this.stopped) {
          handlers.onError(
            err instanceof Error ? err : new Error(String(err)),
          );
        }
      });
  }

  async stop(): Promise<void> {
    this.stopped = true;

    if (this.pollHandle !== null) {
      window.clearInterval(this.pollHandle);
      this.pollHandle = null;
    }

    const recorder = this.activeRecorder;
    this.activeRecorder = null;
    this.activeChunks = [];

    if (recorder && recorder.state !== "inactive") {
      try { recorder.stop(); } catch {}
    }

    try { this.source?.disconnect(); } catch {}
    try { await this.audioCtx?.close(); } catch {}

    this.stream?.getTracks().forEach((t) => t.stop());

    this.stream = null;
    this.audioCtx = null;
    this.source = null;
    this.analyser = null;
    this.speaking = false;
    this.speechDurationMs = 0;
    this.peakRms = 0;
  }
}