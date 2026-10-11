import { Box, Typography } from "@mui/material";

interface BackendStatusProps {
  status: string;
}

export default function BackendStatus({ status }: BackendStatusProps) {
  const connected = status === "Buddy is alive";

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 14,
        left: 16,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 0.8,
        px: 1.2,
        py: 0.65,
        borderRadius: 2,
        border: "1px solid rgba(255,255,255,0.06)",
        bgcolor: "rgba(5,11,24,0.72)",
        backdropFilter: "blur(10px)",
      }}
    >
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          bgcolor: connected ? "#55C7FF" : "#777",
          boxShadow: connected
            ? "0 0 8px rgba(85,199,255,0.8)"
            : "none",
        }}
      />

      <Typography
        sx={{
          fontSize: "0.62rem",
          color: "rgba(255,255,255,0.45)",
          letterSpacing: "0.04em",
        }}
      >
        Status:
      </Typography>

      <Typography
        sx={{
          fontSize: "0.62rem",
          color: connected
            ? "rgba(255,255,255,0.7)"
            : "rgba(255,255,255,0.4)",
        }}
      >
        {status}
      </Typography>
    </Box>
  );
}