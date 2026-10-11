import { useEffect, useRef } from "react";

/**
 * Opens the mic when `isListening` goes true and exposes a live
 * AnalyserNode via a ref. The consumer owns the RAF loop, so audio
 * frame data never touches React state (no 60fps re-renders).
 */
export function useAudioAnalyser(isListening: boolean) {
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!isListening) {
      analyserRef.current = null;
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (err) {
        console.error("[Buddy] Microphone access failed:", err);
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      ctx = new AudioContext();
      await ctx.resume().catch(() => {});

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      // Low built-in smoothing — we do our own attack/release for punch.
      analyser.smoothingTimeConstant = 0.5;

      source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      analyserRef.current = analyser;
    })();

    return () => {
      cancelled = true;

      try { source?.disconnect(); } catch {}
      try { analyserRef.current?.disconnect(); } catch {}
      ctx?.close().catch(() => {});

      // Release the OS-level mic indicator
      stream?.getTracks().forEach((t) => t.stop());

      analyserRef.current = null;
    };
  }, [isListening]);

  return analyserRef;
}