import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RecordVoiceOverRoundedIcon from "@mui/icons-material/RecordVoiceOverRounded";
import {
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";

import { useBuddy } from "../layout/AppLayout";
import { VOICES } from "../../services/tts/voices";
import VoiceWave from "./VoiceWave";

const BUBBLE_MESSAGE_COUNT = 30;
const BUBBLE_MAX_HEIGHT = 200;

export default function VoicePanel() {
  const {
    isListening,
    isArmed,
    toggleListening,
    chatOpen,
    toggleChat,
    messages,
    isThinking,
    streamingReply,
    isSpeaking,
    pendingUserText,
    voice,
    setVoice,
    stageVoiceTranscript,
  } = useBuddy();

  const [voiceMenuAnchor, setVoiceMenuAnchor] =
    useState<null | HTMLElement>(null);

  const bubbleBottomRef = useRef<HTMLDivElement>(null);

  const handleTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      if (!isFinal) return;
      stageVoiceTranscript(text);
    },
    [stageVoiceTranscript],
  );

  const handleOpenVoiceMenu = (e: React.MouseEvent<HTMLElement>) => {
    setVoiceMenuAnchor(e.currentTarget);
  };

  const handleCloseVoiceMenu = () => {
    setVoiceMenuAnchor(null);
  };

  const handlePickVoice = (id: string) => {
    setVoice(id);
    handleCloseVoiceMenu();
  };

  const recent = messages.slice(-BUBBLE_MESSAGE_COUNT);

  useEffect(() => {
    bubbleBottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [recent.length, streamingReply, isThinking, pendingUserText]);

  const currentVoiceName =
    VOICES.find((v) => v.id === voice)?.name ?? "Voice";

  // ---- Status chip text ----
  let statusText = "";
  let statusColor = "#55C7FF";
  if (isSpeaking) {
    statusText = "speaking";
    statusColor = "#A7E4FF";
  } else if (isListening && isArmed) {
    statusText = "listening";
    statusColor = "#55C7FF";
  } else if (isListening) {
    statusText = 'say "buddy" to wake';
    statusColor = "rgba(255,255,255,0.4)";
  }

  return (
    <Box
      sx={{
        flex: "1 1 0",
        minWidth: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        background: `
          radial-gradient(
            circle at 50% 48%,
            rgba(31, 105, 190, 0.12),
            transparent 38%
          )
        `,
      }}
    >
      <Box
        sx={{
          height: 76,
          px: { xs: 2.5, sm: 4 },
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: "1rem",
              fontWeight: 700,
              letterSpacing: "0.25em",
              color: "#FFFFFF",
            }}
          >
            BUDDY
            <Box component="span" sx={{ color: "#55C7FF" }}>
              .
            </Box>
          </Typography>

          {statusText && (
            <Typography
              sx={{
                fontSize: "0.6rem",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: statusColor,
                animation: isSpeaking
                  ? "pulse 1.4s ease-in-out infinite"
                  : isArmed
                    ? "pulse 2.2s ease-in-out infinite"
                    : "none",
                "@keyframes pulse": {
                  "0%, 100%": { opacity: 0.5 },
                  "50%": { opacity: 1 },
                },
              }}
            >
              {statusText}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title={`Voice: ${currentVoiceName}`} arrow placement="bottom">
            <IconButton
              onClick={handleOpenVoiceMenu}
              aria-label="Choose voice"
              sx={{
                color: "rgba(255,255,255,0.7)",
                bgcolor: "rgba(255,255,255,0.05)",
                transition: "all 200ms ease",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.1)",
                  color: "#FFFFFF",
                },
              }}
            >
              <RecordVoiceOverRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={voiceMenuAnchor}
            open={Boolean(voiceMenuAnchor)}
            onClose={handleCloseVoiceMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{
              paper: {
                sx: {
                  mt: 1,
                  minWidth: 260,
                  maxHeight: 380,
                  bgcolor: "#0A1428",
                  backgroundImage: "none",
                  border: "1px solid rgba(255,255,255,0.08)",
                  "& .MuiMenuItem-root": {
                    color: "rgba(255,255,255,0.85)",
                    fontSize: "0.8rem",
                  },
                  "& .MuiMenuItem-root:hover": {
                    bgcolor: "rgba(85,199,255,0.1)",
                  },
                  "& .MuiMenuItem-root.Mui-selected": {
                    bgcolor: "rgba(85,199,255,0.18)",
                  },
                },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography
                sx={{
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                Voice
              </Typography>
            </Box>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
            {VOICES.map((v) => (
              <MenuItem
                key={v.id}
                selected={v.id === voice}
                onClick={() => handlePickVoice(v.id)}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    width: "100%",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: v.id === voice ? "#8DDEFF" : "inherit",
                    }}
                  >
                    {v.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.68rem",
                      color: "rgba(255,255,255,0.45)",
                    }}
                  >
                    {v.description}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Menu>

          <Tooltip
            title={chatOpen ? "Hide chat" : "Show chat"}
            arrow
            placement="bottom"
          >
            <IconButton
              onClick={toggleChat}
              aria-label={chatOpen ? "Hide chat" : "Show chat"}
              sx={{
                color: chatOpen ? "#55C7FF" : "rgba(255,255,255,0.7)",
                bgcolor: chatOpen
                  ? "rgba(85,199,255,0.12)"
                  : "rgba(255,255,255,0.05)",
                transition: "all 200ms ease",
                "&:hover": {
                  bgcolor: chatOpen
                    ? "rgba(85,199,255,0.2)"
                    : "rgba(255,255,255,0.1)",
                  color: chatOpen ? "#8DDEFF" : "#FFFFFF",
                },
              }}
            >
              {chatOpen ? (
                <CloseRoundedIcon fontSize="small" />
              ) : (
                <ChatBubbleOutlineRoundedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 2, sm: 4 },
          pb: 4,
          gap: 3,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <VoiceWave
          isListening={isListening}
          isArmed={isArmed}
          onToggle={toggleListening}
          onTranscript={handleTranscript}
        />

        {(recent.length > 0 || isThinking || streamingReply || pendingUserText) && (
          <Box
            sx={{
              maxWidth: 560,
              width: "100%",
              maxHeight: BUBBLE_MAX_HEIGHT,
              overflowY: "auto",
              px: 3,
              py: 2,
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              textAlign: "left",
              "&::-webkit-scrollbar": { width: 6 },
              "&::-webkit-scrollbar-track": { background: "transparent" },
              "&::-webkit-scrollbar-thumb": {
                background: "rgba(85,199,255,0.2)",
                borderRadius: 3,
              },
              "&::-webkit-scrollbar-thumb:hover": {
                background: "rgba(85,199,255,0.35)",
              },
            }}
          >
            {recent.map((m) => (
              <Box key={m.id} sx={{ "& + &": { mt: 0.75 } }}>
                <Typography
                  component="span"
                  sx={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: m.speaker === "user" ? "#55C7FF" : "#A7E4FF",
                    mr: 1,
                  }}
                >
                  {m.speaker === "user" ? "You:" : "Buddy:"}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontSize: "0.9rem",
                    lineHeight: 1.5,
                    color: "rgba(255,255,255,0.82)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.text}
                </Typography>
              </Box>
            ))}

            {pendingUserText && (
              <Box sx={{ mt: recent.length > 0 ? 0.75 : 0 }}>
                <Typography
                  component="span"
                  sx={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "#55C7FF",
                    mr: 1,
                  }}
                >
                  You:
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontSize: "0.9rem",
                    lineHeight: 1.5,
                    color: "rgba(85,199,255,0.7)",
                    fontStyle: "italic",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {pendingUserText}
                </Typography>
              </Box>
            )}

            {(isThinking || streamingReply) && (
              <Box sx={{ mt: 0.75 }}>
                <Typography
                  component="span"
                  sx={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "#A7E4FF",
                    mr: 1,
                  }}
                >
                  Buddy:
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontSize: "0.9rem",
                    lineHeight: 1.5,
                    color: "rgba(167,228,255,0.85)",
                    fontStyle: streamingReply ? "normal" : "italic",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {streamingReply || "thinking..."}
                </Typography>
              </Box>
            )}

            <div ref={bubbleBottomRef} />
          </Box>
        )}
      </Box>
    </Box>
  );
}