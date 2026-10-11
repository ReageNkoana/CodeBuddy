import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { Box, IconButton, TextField } from "@mui/material";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

export default function ChatInput({ value, onChange, onSend }: ChatInputProps) {
  const canSend = value.trim().length > 0;

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          p: 0.75,
          pl: 1.5,
          borderRadius: 3,
          border: "1px solid rgba(255,255,255,0.08)",
          bgcolor: "rgba(255,255,255,0.035)",
          transition: "all 200ms ease",
          "&:focus-within": {
            borderColor: "rgba(66,191,255,0.4)",
            bgcolor: "rgba(255,255,255,0.055)",
          },
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type a message..."
          variant="standard"
          slotProps={{ input: { disableUnderline: true } }}
          sx={{
            "& .MuiInputBase-root": {
              color: "#FFFFFF",
              fontSize: "0.8rem",
            },
            "& textarea::placeholder": {
              color: "rgba(255,255,255,0.3)",
              opacity: 1,
            },
          }}
        />

        <IconButton
          onClick={onSend}
          disabled={!canSend}
          sx={{
            width: 38,
            height: 38,
            flexShrink: 0,
            borderRadius: 2.5,
            color: "#FFFFFF",
            bgcolor: canSend ? "#2582D0" : "rgba(255,255,255,0.04)",
            "&:hover": {
              bgcolor: canSend ? "#319BE8" : "rgba(255,255,255,0.04)",
            },
            "&.Mui-disabled": {
              color: "rgba(255,255,255,0.18)",
            },
          }}
        >
          <SendRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
  );
}