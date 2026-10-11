import {
  Box,
  Drawer,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { streamChat, type ChatMessage } from "../../services/chat/chatService";
import { speechQueue } from "../../services/tts/ttsService";
import {
  DEFAULT_VOICE,
  findVoiceById,
  matchVoiceCommand,
} from "../../services/tts/voices";

/* ---------------- Types ---------------- */

export interface BuddyMessage {
  id: string;
  speaker: "user" | "buddy";
  text: string;
}

interface BuddyContextValue {
  isListening: boolean;
  toggleListening: () => void;
  isArmed: boolean;
  chatOpen: boolean;
  toggleChat: () => void;
  closeChat: () => void;
  messages: BuddyMessage[];
  isThinking: boolean;
  streamingReply: string;
  isSpeaking: boolean;
  pendingUserText: string;
  sendUserMessage: (text: string) => void;
  stageVoiceTranscript: (text: string) => void;
  voice: string;
  setVoice: (id: string) => void;
}

const BuddyContext = createContext<BuddyContextValue | null>(null);

export function useBuddy(): BuddyContextValue {
  const ctx = useContext(BuddyContext);
  if (!ctx) throw new Error("useBuddy must be used inside <AppLayout>");
  return ctx;
}

/* ---------------- Wake-word configuration ---------------- */

// How long Buddy stays armed after the wake word or last message.
// During this window, follow-up sentences are accepted without
// repeating "Buddy".
const ARM_WINDOW_MS = 30_000;

// How long Buddy is armed just after you tap the mic button.
// Gives you time to say your first thing without saying "Buddy".
const MIC_START_ARM_MS = 10_000;

// How long we wait after the last voice fragment before sending
// the combined text to the LLM.
const PENDING_FRAGMENT_DELAY_MS = 1800;

/* ---------------- Wake/stop words ---------------- */

const WAKE_WORDS = [
  "hey buddy",
  "okay buddy",
  "ok buddy",
  "hi buddy",
  "hello buddy",
  "yo buddy",
  "buddy listen",
  "listen buddy",
  "buddy stop",
  "buddy wait",
  "buddy pause",
  "hey listen",
  "listen up",
  "buddy",
];

const STOP_WORDS = [
  "stop",
  "wait",
  "hold on",
  "hold up",
  "hang on",
  "pause",
  "quiet",
  "shut up",
  "be quiet",
  "hush",
  "silence",
  "enough",
  "cancel",
  "never mind",
  "nevermind",
  "one moment",
  "one sec",
  "excuse me",
  "cut it out",
  "stop it",
  "shut it",
];

interface Classification {
  action: "ignore" | "arm" | "stop" | "process";
  text: string;
}

function classifyUtterance(raw: string, isArmed: boolean): Classification {
  const clean = raw.trim();
  if (!clean) return { action: "ignore", text: "" };

  const lower = clean.toLowerCase();

  // ---- Stop words (always allowed, always disarm) ----
  const isShort = clean.length <= 40;
  if (isShort) {
    for (const kw of STOP_WORDS) {
      if (lower === kw || lower === kw + "." || lower === kw + "!") {
        return { action: "stop", text: "" };
      }
      if (lower.startsWith(kw + " ") && clean.length <= kw.length + 8) {
        return { action: "stop", text: "" };
      }
    }
  }

  // ---- Wake words ----
  // Longest first so "hey buddy" wins over "buddy"
  const sortedWake = [...WAKE_WORDS].sort((a, b) => b.length - a.length);
  for (const w of sortedWake) {
    if (lower === w) {
      return { action: "arm", text: "" };
    }
    if (
      lower.startsWith(w + " ") ||
      lower.startsWith(w + ",") ||
      lower.startsWith(w + ".") ||
      lower.startsWith(w + "!") ||
      lower.startsWith(w + "?")
    ) {
      const rest = clean
        .slice(w.length)
        .replace(/^[\s,.:;!?]+/, "")
        .trim();
      if (!rest) return { action: "arm", text: "" };
      // Wake word + content in the same utterance
      return { action: "process", text: rest };
    }
  }

  // ---- No wake word in this utterance ----
  if (isArmed) {
    return { action: "process", text: clean };
  }

  return { action: "ignore", text: "" };
}

/* ---------------- Sentence splitting ---------------- */

function splitCompleteSentences(buffer: string): {
  sentences: string[];
  remainder: string;
} {
  let lastBoundary = -1;
  for (let i = 0; i < buffer.length; i++) {
    const ch = buffer[i];
    if (ch === "." || ch === "!" || ch === "?") {
      const next = buffer[i + 1];
      if (next === undefined || next === " " || next === "\n" || next === "\t") {
        lastBoundary = i;
      }
    }
  }

  if (lastBoundary === -1) {
    return { sentences: [], remainder: buffer };
  }

  const complete = buffer.slice(0, lastBoundary + 1);
  const remainder = buffer.slice(lastBoundary + 1).trimStart();

  const sentences = complete
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return { sentences, remainder };
}

/* ---------------- Layout ---------------- */

interface AppLayoutProps {
  voice: ReactNode;
  chat: ReactNode;
}

export default function AppLayout({ voice: voiceSlot, chat }: AppLayoutProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const [isListening, setIsListening] = useState(false);
  const [isArmed, setIsArmed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<BuddyMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [streamingReply, setStreamingReply] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pendingUserText, setPendingUserText] = useState("");

  const [voice, setVoiceState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("buddyVoice");
      if (saved && findVoiceById(saved)) return saved;
    } catch {}
    return DEFAULT_VOICE;
  });
  const voiceRef = useRef(voice);

  const idCounter = useRef(0);
  const conversationRef = useRef<BuddyMessage[]>([]);

  const chatAbortRef = useRef<AbortController | null>(null);
  const chatGenerationRef = useRef(0);

  // Wake-word armed state mirrored in a ref so callbacks see the latest value
  const isArmedRef = useRef(false);
  const armTimerRef = useRef<number | null>(null);

  // Fragment staging
  const pendingBufferRef = useRef<string[]>([]);
  const pendingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setChatOpen(isDesktop);
  }, [isDesktop]);

  useEffect(() => {
    voiceRef.current = voice;
    try {
      localStorage.setItem("buddyVoice", voice);
    } catch {}
  }, [voice]);

  useEffect(() => {
    speechQueue.setSpeakingListener(setIsSpeaking);
  }, []);

  // Mic toggle → interrupt speech, reset arm state
  useEffect(() => {
    if (isListening) {
      speechQueue.interrupt();
      // Auto-arm for a short window so you can speak immediately
      setIsArmed(true);
      isArmedRef.current = true;
      if (armTimerRef.current !== null) clearTimeout(armTimerRef.current);
      armTimerRef.current = window.setTimeout(() => {
        setIsArmed(false);
        isArmedRef.current = false;
        armTimerRef.current = null;
      }, MIC_START_ARM_MS);
    } else {
      // Mic off — disarm and clear buffer
      setIsArmed(false);
      isArmedRef.current = false;
      if (armTimerRef.current !== null) {
        clearTimeout(armTimerRef.current);
        armTimerRef.current = null;
      }
      pendingBufferRef.current = [];
      setPendingUserText("");
      if (pendingTimerRef.current !== null) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    }
  }, [isListening]);

  useEffect(() => {
    return () => {
      chatAbortRef.current?.abort();
      if (pendingTimerRef.current !== null) {
        clearTimeout(pendingTimerRef.current);
      }
      if (armTimerRef.current !== null) {
        clearTimeout(armTimerRef.current);
      }
    };
  }, []);

  const armBuddy = useCallback((windowMs = ARM_WINDOW_MS) => {
    setIsArmed(true);
    isArmedRef.current = true;
    if (armTimerRef.current !== null) clearTimeout(armTimerRef.current);
    armTimerRef.current = window.setTimeout(() => {
      setIsArmed(false);
      isArmedRef.current = false;
      armTimerRef.current = null;
    }, windowMs);
  }, []);

  const disarmBuddy = useCallback(() => {
    setIsArmed(false);
    isArmedRef.current = false;
    if (armTimerRef.current !== null) {
      clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
    }
  }, []);

  const appendMessage = useCallback(
    (speaker: BuddyMessage["speaker"], text: string): BuddyMessage => {
      idCounter.current += 1;
      const msg: BuddyMessage = {
        id: `m${idCounter.current}`,
        speaker,
        text: text.trim(),
      };
      conversationRef.current = [...conversationRef.current, msg];
      setMessages(conversationRef.current);
      return msg;
    },
    [],
  );

  const setVoice = useCallback((id: string) => {
    if (!findVoiceById(id)) return;
    setVoiceState(id);
  }, []);

  const sendUserMessage = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      chatGenerationRef.current += 1;
      const generation = chatGenerationRef.current;
      chatAbortRef.current?.abort();

      const voiceCmd = matchVoiceCommand(clean);
      if (voiceCmd) {
        speechQueue.interrupt();
        setIsThinking(false);
        setStreamingReply("");

        appendMessage("user", clean);
        appendMessage("buddy", `Switched to ${voiceCmd.name}.`);

        setVoiceState(voiceCmd.id);
        voiceRef.current = voiceCmd.id;

        speechQueue.enqueue(`Switched to ${voiceCmd.name}.`, voiceCmd.id);
        // Keep armed so follow-up continues
        armBuddy();
        return;
      }

      speechQueue.interrupt();

      const controller = new AbortController();
      chatAbortRef.current = controller;

      const history: ChatMessage[] = conversationRef.current.map((m) => ({
        role: m.speaker === "user" ? "user" : "assistant",
        content: m.text,
      }));
      history.push({ role: "user", content: clean });

      appendMessage("user", clean);

      setIsThinking(true);
      setStreamingReply("");

      let accumulated = "";
      let speechBuffer = "";

      const processTokenForSpeech = (token: string) => {
        speechBuffer += token;
        const { sentences, remainder } = splitCompleteSentences(speechBuffer);
        if (sentences.length > 0) {
          speechBuffer = remainder;
          for (const s of sentences) {
            speechQueue.enqueue(s, voiceRef.current);
          }
        }
      };

      const flushSpeech = () => {
        const remaining = speechBuffer.trim();
        if (remaining) {
          speechQueue.enqueue(remaining, voiceRef.current);
        }
        speechBuffer = "";
      };

      void streamChat(
        history,
        {
          onToken: (token) => {
            if (generation !== chatGenerationRef.current) return;
            accumulated += token;
            setStreamingReply(accumulated);
            setIsThinking(false);
            processTokenForSpeech(token);
          },
          onDone: () => {
            if (generation !== chatGenerationRef.current) return;
            const final = accumulated.trim();
            setIsThinking(false);
            setStreamingReply("");
            flushSpeech();
            if (final) {
              appendMessage("buddy", final);
            }
            // Reset the arm window so follow-ups are accepted
            armBuddy();
          },
          onError: (err) => {
            if (generation !== chatGenerationRef.current) return;
            console.error("[Buddy] Chat error:", err);
            setIsThinking(false);
            setStreamingReply("");
            appendMessage("buddy", "Sorry, I couldn't reach the brain just now.");
            armBuddy();
          },
        },
        controller.signal,
      );
    },
    [appendMessage, armBuddy],
  );

  const flushPendingFragments = useCallback(() => {
    if (pendingTimerRef.current !== null) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    const buffered = pendingBufferRef.current.join(" ").trim();
    pendingBufferRef.current = [];
    setPendingUserText("");
    if (buffered) sendUserMessage(buffered);
  }, [sendUserMessage]);

  const stageVoiceTranscript = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      const classified = classifyUtterance(clean, isArmedRef.current);

      switch (classified.action) {
        case "ignore":
          // Ambient speech — don't touch anything
          return;

        case "stop":
          // Clear buffer, kill speech, disarm
          if (pendingTimerRef.current !== null) {
            clearTimeout(pendingTimerRef.current);
            pendingTimerRef.current = null;
          }
          pendingBufferRef.current = [];
          setPendingUserText("");
          speechQueue.interrupt();
          disarmBuddy();
          return;

        case "arm":
          // Wake word alone — arm and wait for the command
          armBuddy();
          return;

        case "process": {
          // Fragment — buffer it, arm on the way
          if (!isArmedRef.current) {
            // First fragment came with the wake word inline
            armBuddy();
          } else {
            // Extend the arm window on each new fragment
            armBuddy();
          }

          pendingBufferRef.current.push(classified.text);
          setPendingUserText(pendingBufferRef.current.join(" "));

          if (pendingTimerRef.current !== null) {
            clearTimeout(pendingTimerRef.current);
          }
          pendingTimerRef.current = window.setTimeout(() => {
            pendingTimerRef.current = null;
            const full = pendingBufferRef.current.join(" ").trim();
            pendingBufferRef.current = [];
            setPendingUserText("");
            if (full) sendUserMessage(full);
          }, PENDING_FRAGMENT_DELAY_MS);

          return;
        }
      }
    },
    [sendUserMessage, flushPendingFragments, armBuddy, disarmBuddy],
  );

  const value: BuddyContextValue = {
    isListening,
    toggleListening: () => setIsListening((c) => !c),
    isArmed,
    chatOpen,
    toggleChat: () => setChatOpen((c) => !c),
    closeChat: () => setChatOpen(false),
    messages,
    isThinking,
    streamingReply,
    isSpeaking,
    pendingUserText,
    sendUserMessage,
    stageVoiceTranscript,
    voice,
    setVoice,
  };

  return (
    <BuddyContext.Provider value={value}>
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "stretch",
          overflow: "hidden",
          bgcolor: "#050B18",
          background: `
            radial-gradient(
              circle at 35% 45%,
              rgba(25,91,170,0.12),
              transparent 38%
            ),
            radial-gradient(
              circle at 75% 50%,
              rgba(52,142,255,0.08),
              transparent 35%
            ),
            #050B18
          `,
        }}
      >
        {voiceSlot}

        {isDesktop && chatOpen && (
          <>
            <LayoutDivider />
            {chat}
          </>
        )}

        {!isDesktop && (
          <Drawer
            anchor="right"
            open={chatOpen}
            onClose={value.closeChat}
            slotProps={{
              paper: {
                sx: {
                  width: "100%",
                  maxWidth: 460,
                  bgcolor: "#050B18",
                  backgroundImage: "none",
                  border: "none",
                },
              },
            }}
          >
            {chat}
          </Drawer>
        )}
      </Box>
    </BuddyContext.Provider>
  );
}

export function LayoutDivider() {
  return (
    <Box
      sx={{
        flex: "0 0 1px",
        width: "1px",
        alignSelf: "stretch",
        position: "relative",
        background: `
          linear-gradient(
            180deg,
            transparent,
            rgba(71,158,255,0.2) 20%,
            rgba(86,201,255,0.65) 50%,
            rgba(71,158,255,0.2) 80%,
            transparent
          )
        `,
        "&::after": {
          content: '""',
          position: "absolute",
          width: 70,
          height: "55%",
          left: -35,
          top: "23%",
          background:
            "linear-gradient(180deg, transparent, rgba(33,128,255,0.13), transparent)",
          filter: "blur(20px)",
          pointerEvents: "none",
        },
      }}
    />
  );
}