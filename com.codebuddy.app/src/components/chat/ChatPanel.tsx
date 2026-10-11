import { Box, Typography } from "@mui/material";
import { useState } from "react";

import { useBuddy } from "../layout/AppLayout";
import ChatHeader from "./ChatHeader";
import ChatHistory from "./ChatHistory";
import ChatInput from "./ChatInput";

export default function ChatPanel() {
  const { closeChat, sendUserMessage } = useBuddy();
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;
    sendUserMessage(message);
    setMessage("");
  };

  return (
    <Box
      sx={{
        flex: "0 0 clamp(320px, 32%, 460px)",
        minWidth: 0,
        width: { xs: "100%", md: "auto" },
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: "rgba(8,18,36,0.78)",
        backdropFilter: "blur(20px)",
        "@media (max-width:899px)": { flex: "1 1 auto" },
      }}
    >
      <ChatHeader onClose={closeChat} />
      <ChatHistory />
      <ChatInput value={message} onChange={setMessage} onSend={handleSend} />

      <Box
        sx={{
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.8,
          flexShrink: 0,
        }}
      >
        <Typography sx={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.2)" }}>
          Buddy AI
        </Typography>
        <Typography sx={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.15)" }}>
          •
        </Typography>
        <Typography sx={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.2)" }}>
          Voice enabled
        </Typography>
      </Box>
    </Box>
  );
}