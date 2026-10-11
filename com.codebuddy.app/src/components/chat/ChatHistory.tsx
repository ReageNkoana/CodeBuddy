import { Box, Typography } from "@mui/material";
import { useEffect, useRef } from "react";

import { useBuddy } from "../layout/AppLayout";

export default function ChatHistory() {
  const { messages, isThinking, streamingReply, isSpeaking } = useBuddy();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streamingReply, isThinking]);

  if (messages.length === 0 && !isThinking && !streamingReply) {
    return (
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          p: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box sx={{ textAlign: "center", maxWidth: 240 }}>
          <Typography
            sx={{
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "rgba(255,255,255,0.82)",
            }}
          >
            Start a conversation
          </Typography>
          <Typography
            sx={{
              mt: 1,
              fontSize: "0.72rem",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.32)",
            }}
          >
            Tap BUDDY to speak, or type a message below.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        px: 2.5,
        py: 2,
        scrollBehavior: "smooth",
      }}
    >
      {messages.map((m) => (
        <Box
          key={m.id}
          sx={{
            mb: 2,
            pl: 1.5,
            borderLeft: "2px solid",
            borderColor:
              m.speaker === "user"
                ? "rgba(85,199,255,0.35)"
                : "rgba(167,228,255,0.35)",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.6rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: m.speaker === "user" ? "#55C7FF" : "#A7E4FF",
              mb: 0.5,
            }}
          >
            {m.speaker === "user" ? "You" : "Buddy"}
          </Typography>
          <Typography
            sx={{
              fontSize: "0.85rem",
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.85)",
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
            }}
          >
            {m.text}
          </Typography>
        </Box>
      ))}

      {(isThinking || streamingReply || isSpeaking) && (
        <Box
          sx={{
            mb: 2,
            pl: 1.5,
            borderLeft: "2px solid rgba(167,228,255,0.35)",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.6rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#A7E4FF",
              mb: 0.5,
            }}
          >
            Buddy
          </Typography>
          <Typography
            sx={{
              fontSize: "0.85rem",
              lineHeight: 1.55,
              color: "rgba(167,228,255,0.85)",
              fontStyle: streamingReply ? "normal" : "italic",
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
            }}
          >
            {streamingReply || (isSpeaking ? "speaking..." : "thinking...")}
          </Typography>
        </Box>
      )}

      <div ref={bottomRef} />
    </Box>
  );
}