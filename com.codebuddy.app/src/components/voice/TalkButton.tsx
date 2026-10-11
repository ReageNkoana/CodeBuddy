import { Mic, Stop } from "@mui/icons-material";
import { Box, Button, Typography } from "@mui/material";

interface TalkButtonProps {
  isListening: boolean;
  onToggle: () => void;
}

export default function TalkButton({
  isListening,
  onToggle,
}: TalkButtonProps) {
  return (
    <Box sx={{ textAlign: "center" }}>
      <Button
        onClick={onToggle}
        startIcon={isListening ? <Stop /> : <Mic />}
        sx={{
          minWidth: 210,
          height: 58,
          px: 3.5,

          borderRadius: 999,

          color: "#FFFFFF",

          background:
            "linear-gradient(135deg, #16458F 0%, #2176C9 50%, #45BFFF 100%)",

          boxShadow: isListening
            ? "0 0 35px rgba(66,191,255,0.35)"
            : "0 10px 35px rgba(22,91,170,0.3)",

          fontSize: "0.9rem",
          fontWeight: 600,

          "&:hover": {
            background:
              "linear-gradient(135deg, #1A4F9D 0%, #2682D8 50%, #55C7FF 100%)",

            transform: "translateY(-2px)",
          },

          transition: "all 200ms ease",
        }}
      >
        {isListening ? "Stop Listening" : "Press to Talk"}
      </Button>

      <Typography
        sx={{
          mt: 1.5,
          fontSize: "0.7rem",
          color: "rgba(255,255,255,0.32)",
        }}
      >
        {isListening
          ? "Buddy will keep listening until you stop."
          : "Speak naturally without holding the button."}
      </Typography>
    </Box>
  );
}