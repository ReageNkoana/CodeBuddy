import { createTheme } from "@mui/material/styles";

export const buddyTheme = createTheme({
  palette: {
    mode: "dark",

    primary: {
      main: "#42BFFF",
      light: "#8DDEFF",
      dark: "#1769AA",
    },

    background: {
      default: "#050B18",
      paper: "#0A1428",
    },

    text: {
      primary: "#FFFFFF",
      secondary: "rgba(255,255,255,0.55)",
    },
  },

  typography: {
    fontFamily: [
      "Inter",
      "system-ui",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "sans-serif",
    ].join(","),
  },

  shape: {
    borderRadius: 14,
  },

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
  },
});