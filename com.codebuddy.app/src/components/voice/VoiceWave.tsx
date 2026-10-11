import MicRoundedIcon from "@mui/icons-material/MicRounded";
import { Box, Tooltip } from "@mui/material";
import { keyframes } from "@emotion/react";
import { useEffect, useRef } from "react";

import { useAudioAnalyser } from "../../hooks/useAudioAnalyser";
import { AudioService } from "../../services/audio/audioService";

interface VoiceWaveProps {
  isListening: boolean;
  isArmed: boolean;
  onToggle: () => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
}

/* ---------------- Geometry ---------------- */

const SIZE = 460;
const CENTER = SIZE / 2;

const RING_PRIMARY = 128;
const RING_SECONDARY = 158;
const WAVE_SAMPLES = 240;

const SPIKE_COUNT = 72;
const SPIKE_MAX = 26;

const BASS_END = 13;
const MID_END = 116;
const TREBLE_END = 350;

/* ---------------- Keyframes ---------------- */

const pulse = keyframes`
  0%, 100% { opacity: 0.4; transform: scale(0.85); }
  50%      { opacity: 1;   transform: scale(1.15); }
`;

/* ---------------- Component ---------------- */

export default function VoiceWave({
  isListening,
  isArmed,
  onToggle,
  onTranscript,
}: VoiceWaveProps) {
  const analyserRef = useAudioAnalyser(isListening);

  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const primaryGlowRef = useRef<SVGPathElement>(null);
  const primaryRef = useRef<SVGPathElement>(null);
  const secondaryRef = useRef<SVGPathElement>(null);
  const spikesRef = useRef<SVGGElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const audioServiceRef = useRef<AudioService | null>(null);

  useEffect(() => {
    if (!isListening) return;

    let active = true;
    const service = new AudioService();
    audioServiceRef.current = service;

    service
      .start({
        onFinal: (text) => {
          if (active) onTranscriptRef.current?.(text, true);
        },
        onError: (err) => {
          if (active) console.error("[Buddy] STT error:", err);
        },
      })
      .catch((err) => {
        if (active) console.error("[Buddy] Audio start failed:", err);
      });

    return () => {
      active = false;
      if (audioServiceRef.current === service) {
        audioServiceRef.current = null;
      }
      void service.stop();
    };
  }, [isListening]);

  useEffect(() => {
    let data = new Uint8Array(1024);

    let bass = 0;
    let mid = 0;
    let treble = 0;
    let volume = 0;
    const bands = new Array<number>(SPIKE_COUNT).fill(0);

    let rafId = 0;
    let last = performance.now();
    let t = 0;

    const smooth = (prev: number, target: number) =>
      prev + (target - prev) * (target > prev ? 0.55 : 0.1);

    const rangeAvg = (buf: Uint8Array, a: number, b: number) => {
      let s = 0;
      for (let i = a; i < b; i++) s += buf[i];
      return s / Math.max(1, b - a) / 255;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      const analyser = analyserRef.current;

      if (analyser) {
        if (data.length !== analyser.frequencyBinCount) {
          data = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(data);

        const tBass = Math.min(1, Math.pow(rangeAvg(data, 1, BASS_END), 0.7) * 2.2);
        const tMid = Math.min(1, Math.pow(rangeAvg(data, BASS_END, MID_END), 0.7) * 2.0);
        const tTreble = Math.min(1, Math.pow(rangeAvg(data, MID_END, TREBLE_END), 0.7) * 2.6);
        const tVol = Math.min(1, Math.pow(rangeAvg(data, 1, TREBLE_END), 0.65) * 2.2);

        bass = smooth(bass, tBass);
        mid = smooth(mid, tMid);
        treble = smooth(treble, tTreble);
        volume = smooth(volume, tVol);

        const binsPerSpike = Math.max(1, Math.floor(TREBLE_END / SPIKE_COUNT));
        for (let i = 0; i < SPIKE_COUNT; i++) {
          const a = i * binsPerSpike + 1;
          const b = a + binsPerSpike;
          const avg = rangeAvg(data, a, b);
          const target = Math.min(1, Math.pow(avg, 0.65) * 2.8);
          bands[i] = smooth(bands[i], target);
        }
      } else {
        const d = (v: number) => v + (0 - v) * 0.08;
        bass = d(bass);
        mid = d(mid);
        treble = d(treble);
        volume = d(volume);
        for (let i = 0; i < SPIKE_COUNT; i++) bands[i] = d(bands[i]);
      }

      const radiusAt = (theta: number, baseR: number, phase: number) =>
        baseR
        + Math.sin(4 * theta + t * 0.55 + phase) * 3.0
        + Math.sin(7 * theta - t * 0.35 + phase) * 1.8
        + volume * 10
        + bass * 17 * (0.5 + 0.5 * Math.sin(t * 2.4 + phase))
        + mid * 13 * Math.sin(6 * theta + t * 1.1 + phase)
        + treble * 10 * Math.sin(16 * theta - t * 1.7 + phase);

      let dPrimary = "";
      let dSecondary = "";
      for (let i = 0; i <= WAVE_SAMPLES; i++) {
        const theta = (i / WAVE_SAMPLES) * Math.PI * 2;

        const rP = radiusAt(theta, RING_PRIMARY, 0);
        dPrimary +=
          (i === 0 ? "M" : "L") +
          (CENTER + rP * Math.cos(theta)).toFixed(2) +
          " " +
          (CENTER + rP * Math.sin(theta)).toFixed(2);

        const rS = radiusAt(theta, RING_SECONDARY, 1.4);
        dSecondary +=
          (i === 0 ? "M" : "L") +
          (CENTER + rS * Math.cos(theta)).toFixed(2) +
          " " +
          (CENTER + rS * Math.sin(theta)).toFixed(2);
      }
      dPrimary += " Z";
      dSecondary += " Z";

      primaryGlowRef.current?.setAttribute("d", dPrimary);
      primaryRef.current?.setAttribute("d", dPrimary);
      secondaryRef.current?.setAttribute("d", dSecondary);

      const spikeGroup = spikesRef.current;
      if (spikeGroup) {
        const lines = spikeGroup.children;
        for (let i = 0; i < SPIKE_COUNT; i++) {
          const line = lines[i] as SVGLineElement | undefined;
          if (!line) continue;

          const level = bands[i];
          if (level < 0.03) {
            line.setAttribute("opacity", "0");
            continue;
          }

          const theta = (i / SPIKE_COUNT) * Math.PI * 2;
          const r0 = radiusAt(theta, RING_PRIMARY, 0);
          const r1 = r0 + level * SPIKE_MAX;

          const cos = Math.cos(theta);
          const sin = Math.sin(theta);

          line.setAttribute("x1", (CENTER + r0 * cos).toFixed(2));
          line.setAttribute("y1", (CENTER + r0 * sin).toFixed(2));
          line.setAttribute("x2", (CENTER + r1 * cos).toFixed(2));
          line.setAttribute("y2", (CENTER + r1 * sin).toFixed(2));
          line.setAttribute("opacity", (0.15 + level * 0.85).toFixed(3));
        }
      }

      if (labelRef.current) {
        const g = 0.35 + volume * 0.65;
        labelRef.current.style.textShadow = [
          `0 0 ${14 + volume * 20}px rgba(85,199,255,${g})`,
          `0 0 ${40 + volume * 40}px rgba(33,102,209,${g * 0.7})`,
        ].join(", ");
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [analyserRef]);

  // ---- Status label & dot colour ----
  let statusLabel = "TAP TO SPEAK";
  let statusColor = "rgba(255,255,255,0.4)";
  let showPulse = false;

  if (isListening && isArmed) {
    statusLabel = "LISTENING";
    statusColor = "#55C7FF";
    showPulse = true;
  } else if (isListening) {
    statusLabel = 'SAY "BUDDY"';
    statusColor = "rgba(255,255,255,0.5)";
  }

  return (
    <Box
      sx={{
        position: "relative",
        width: { xs: 300, sm: 380, md: SIZE },
        maxWidth: "100%",
        aspectRatio: "1 / 1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: "-8%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(85,199,255,0.10) 0%, rgba(33,102,209,0.06) 42%, transparent 72%)",
          filter: "blur(30px)",
          pointerEvents: "none",
        }}
      />

      <Box
        component="svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        sx={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
        <defs>
          <linearGradient id="bw-wave" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="35%"  stopColor="#9CEBFF" stopOpacity="1" />
            <stop offset="70%"  stopColor="#55C7FF" stopOpacity="1" />
            <stop offset="100%" stopColor="#2166D1" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="bw-spike" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="100%" stopColor="#55C7FF" stopOpacity="0.5" />
          </linearGradient>

          <filter id="bw-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          ref={secondaryRef}
          fill="none"
          stroke="#55C7FF"
          strokeWidth={0.9}
          strokeLinejoin="round"
          opacity={isArmed ? 0.4 : 0.18}
        />

        <path
          ref={primaryGlowRef}
          fill="none"
          stroke="#55C7FF"
          strokeWidth={7}
          strokeLinejoin="round"
          opacity={isArmed ? 0.5 : 0.25}
          filter="url(#bw-glow)"
        />

        <path
          ref={primaryRef}
          fill="none"
          stroke="url(#bw-wave)"
          strokeWidth={1.8}
          strokeLinejoin="round"
        />

        <g ref={spikesRef} filter="url(#bw-glow)">
          {Array.from({ length: SPIKE_COUNT }).map((_, i) => (
            <line
              key={i}
              stroke="url(#bw-spike)"
              strokeWidth={1.4}
              strokeLinecap="round"
              opacity={0}
            />
          ))}
        </g>
      </Box>

      <Tooltip
        title={
          isListening
            ? isArmed
              ? "Listening for your command"
              : 'Say "Buddy" to wake'
            : "Tap to start listening"
        }
        arrow
        placement="bottom"
      >
        <Box
          onClick={onToggle}
          role="button"
          aria-label={isListening ? "Stop listening" : "Start listening"}
          sx={{
            position: "relative",
            width: { xs: 120, sm: 140, md: 160 },
            height: { xs: 120, sm: 140, md: 160 },
            borderRadius: "50%",

            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.75,

            cursor: "pointer",
            userSelect: "none",
            transition: "all 250ms ease",

            "&:hover": {
              background:
                "radial-gradient(circle, rgba(85,199,255,0.10) 0%, transparent 70%)",
            },
            "&:active": {
              transform: "scale(0.96)",
            },
          }}
        >
          <Box
            ref={labelRef}
            component="span"
            sx={{
              fontSize: { xs: "1.15rem", md: "1.5rem" },
              fontWeight: 700,
              letterSpacing: "0.3em",
              pl: "0.3em",
              color: "#FFFFFF",
              lineHeight: 1,
            }}
          >
            BUDDY
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.6,
              mt: 0.5,
            }}
          >
            {isListening ? (
              <>
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: statusColor,
                    boxShadow: isArmed
                      ? "0 0 10px rgba(85,199,255,0.9)"
                      : "none",
                    animation: showPulse
                      ? `${pulse} 1.2s ease-in-out infinite`
                      : "none",
                  }}
                />
                <Box
                  component="span"
                  sx={{
                    fontSize: "0.55rem",
                    letterSpacing: "0.18em",
                    fontWeight: 600,
                    color: statusColor,
                  }}
                >
                  {statusLabel}
                </Box>
              </>
            ) : (
              <>
                <MicRoundedIcon
                  sx={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.4)",
                  }}
                />
                <Box
                  component="span"
                  sx={{
                    fontSize: "0.55rem",
                    letterSpacing: "0.18em",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  TAP TO SPEAK
                </Box>
              </>
            )}
          </Box>
        </Box>
      </Tooltip>
    </Box>
  );
}