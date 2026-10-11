import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";

interface ChatHeaderProps {
  onClose?: () => void;
}

export default function ChatHeader({ onClose }: ChatHeaderProps) {
  return (
    <Box
      sx={{
        minHeight: 64,
        px: 2.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Typography
        sx={{
          fontSize: "0.72rem",
          fontWeight: 700,
          letterSpacing: "0.2em",
          color: "#55C7FF",
        }}
      >
        CHAT
      </Typography>

      {onClose && (
        <Tooltip title="Close chat" arrow placement="bottom">
          <IconButton
            onClick={onClose}
            aria-label="Close chat"
            size="small"
            // Hidden on desktop — VoicePanel's toggle already does this.
            sx={{
              display: { xs: "inline-flex", md: "none" },
              color: "rgba(255,255,255,0.55)",
              bgcolor: "rgba(255,255,255,0.04)",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.1)",
                color: "#FFFFFF",
              },
            }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}