// All backend URLs live here.
// Vite injects VITE_* variables from the .env at the project root.
// Falls back to localhost defaults when .env is missing.

const RAW_BASE =
    import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000";

export const BACKEND_BASE = RAW_BASE.replace(/\/+$/, ""); // strip trailing slash

export const ENDPOINTS = {
    health: `${BACKEND_BASE}/health`,
    transcribe: `${BACKEND_BASE}/transcribe`,
    chat: `${BACKEND_BASE}/chat`,
    speak: `${BACKEND_BASE}/speak`,

};