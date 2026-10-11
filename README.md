# Buddy — AI-Powered Desktop Voice Assistant

A desktop AI assistant you can talk to. Buddy listens to your voice, streams back intelligent responses, and speaks them aloud — running locally on your Windows machine using free cloud APIs. It is being developed to eventually assist with coding, understand what is on your screen, and help with tasks visible on your laptop.


> **Status:** Phase 1 complete — active development

---

## Table of Contents

- [What Buddy Does](#what-buddy-does)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Features in Detail](#features-in-detail)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Why I Built This](#why-i-built-this)
- [License](#license)

---

## What Buddy Does

Buddy is a voice-first AI assistant built as a desktop application. It combines a modern React frontend with a Python backend to deliver real-time voice conversations powered by large language models.

**Current capabilities:**

- **Voice input** — Click to talk, or use the wake word "Buddy"
- **Streamed AI responses** — Powered by Groq LLMs, delivered token-by-token
- **Voice output** — Text-to-speech with 40+ selectable voices
- **Interruption handling** — Say "wait", "stop", or simply start talking to interrupt Buddy mid-sentence
- **Chat history** — Full scrollable conversation log with clear user/assistant labels
- **Voice visualizer** — Reactive circular waveform that responds to your microphone
- **Caching layers** — TTS audio and common LLM replies are cached for instant playback
- **Graceful fallbacks** — Automatic switching between TTS engines and LLM models when rate limits or errors occur

---

## Architecture
┌──────────────────────────────────────────────────────┐
│ Tauri Desktop Window (Windows) │
│ │
│ ┌──────────────────┐ ┌────────────────────────┐ │
│ │ Voice Panel │ │ Chat Panel │ │
│ │ • Wave visual │ │ • Message history │ │
│ │ • Voice picker │ │ • Text input │ │
│ │ • Status chip │ │ • Streaming output │ │
│ └──────────────────┘ └────────────────────────┘ │
│ │
│ React + TypeScript + Material UI │
└──────────────────────────────────────────────────────┘
│
│ HTTP (localhost:8000)
▼
┌──────────────────────────────────────────────────────┐
│ Python Backend (FastAPI) │
│ │
│ POST /transcribe → Groq Whisper (speech-to-text) │
│ POST /chat → Groq LLM (streamed responses) │
│ POST /speak → Edge TTS → gTTS (fallback) │
│ GET /health → Service status │
└──────────────────────────────────────────────────────┘

text

Buddy follows a **frontend/backend split**: the Tauri app handles UI and audio capture, while the Python service handles transcription, language model inference, and speech synthesis. Communication happens over HTTP on `localhost`.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Desktop shell** | Tauri |
| **Frontend** | React 18, TypeScript, Material UI |
| **Backend** | Python 3.11+, FastAPI, Uvicorn |
| **Speech-to-text** | Groq Whisper large-v3 |
| **Language model** | Groq GPT-OSS 120B / Llama 4 Scout |
| **Text-to-speech** | Microsoft Edge TTS (primary), gTTS (fallback) |
| **Caching** | Disk-based (TTS), in-memory (LLM) |

---

## Getting Started

### Prerequisites

Before you begin, make sure you have:

- **Node.js** 20 or higher
- **Python** 3.11 – 3.12 (avoid 3.13 — it breaks some TTS dependencies)
- **Rust** toolchain (required for Tauri) — install from [rustup.rs](https://rustup.rs)
- A free **Groq API key** — get one at [console.groq.com](https://console.groq.com)

### Backend Setup

```bash
# Navigate to the backend folder
cd backend

# Create a virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Create your .env file (see Environment Variables below)
copy .env.example .env         # Windows
# cp .env.example .env         # macOS / Linux

# Run the server
uvicorn main:app --reload --port 8000
The backend is now running at http://localhost:8000.

Frontend Setup
In a new terminal:

bash
# Navigate to the frontend folder
cd frontend

# Install dependencies
npm install

# Run the desktop app in development mode
npm run tauri dev
The Tauri window should open automatically. If it doesn't, check the terminal for errors.

Environment Variables
Create a .env file in the backend/ folder with the following:

Variable	Required	Description
GROQ_API_KEY	Yes	Your Groq API key for LLM and speech-to-text
GROQ_LLM_MODEL	No	Override the default LLM (default: llama-4-scout)
TTS_VOICE	No	Default voice for Edge TTS (default: en-ZA-LukeNeural)
CACHE_DIR	No	Directory for cached TTS audio (default: ./cache)
Example .env:

env
GROQ_API_KEY=gsk_your_key_here
GROQ_LLM_MODEL=llama-4-scout
TTS_VOICE=en-ZA-LukeNeural
CACHE_DIR=./cache
Never commit your .env file. It's already in .gitignore.

API Endpoints
Method	Endpoint	Description
POST	/transcribe	Accepts an audio file, returns transcribed text
POST	/chat	Accepts a message, returns a streamed LLM response
POST	/speak	Accepts text, returns synthesized audio
GET	/health	Returns backend status and dependency health
All endpoints accept and return JSON (with /speak returning audio bytes).

Project Structure
text
CodeBuddy/
├── backend/
│   ├── main.py                 # FastAPI entry point
│   ├── routers/                # Endpoint definitions
│   │   ├── transcribe.py
│   │   ├── chat.py
│   │   └── speak.py
│   ├── services/               # Business logic
│   │   ├── llm.py              # Groq LLM integration
│   │   ├── stt.py              # Groq Whisper integration
│   │   └── tts.py              # Edge TTS + gTTS fallback
│   ├── config.py               # Environment loading
│   ├── cache/                  # Cached TTS audio
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── VoicePanel.tsx
│   │   │   ├── ChatPanel.tsx
│   │   │   └── WaveVisual.tsx
│   │   ├── services/           # API and audio services
│   │   ├── contexts/           # React contexts
│   │   ├── types/              # TypeScript interfaces
│   │   └── App.tsx
│   ├── src-tauri/              # Tauri config and Rust code
│   ├── package.json
│   └── vite.config.ts
│
├── .gitignore
├── LICENSE
└── README.md
Features in Detail
Wake Word Activation
Buddy stays in a low-power listening state until it hears the word "Buddy". Once activated, it listens freely for 30 seconds before returning to sleep. This prevents accidental transcriptions and reduces unnecessary API calls.

Barge-In Interruption
You can interrupt Buddy mid-sentence by simply speaking. The audio playback stops immediately, and the backend cancels the current stream. Trigger words like "wait", "stop", or "hold on" also halt Buddy's response.

Fragment Staging
When you take a breath mid-sentence, the speech-to-text engine sometimes returns two separate fragments. Buddy's staging buffer holds these fragments briefly and merges them into a single message, preventing broken-up replies.

Caching Strategy
Type	Storage	Benefit
TTS audio	Disk (cache/)	Repeated phrases play instantly
LLM replies	In-memory	Common greetings like "hi" and "thanks" answered without an API call
Markdown Stripping
The LLM returns formatted text with markdown syntax (e.g., **bold**, # headers). Before sending text to the TTS engine, Buddy strips the markdown so it never reads "asterisk asterisk" aloud.

Known Limitations
Buddy is a Phase 1 project — the voice pipeline works reliably, but there are acknowledged rough edges:

Limitation	Impact	Planned Fix
Edge TTS occasional 403s	Falls back to gTTS (robotic voice)	Local TTS (Kokoro or Piper)
Whisper accent accuracy	~25% word error rate on South African English	Switch to Deepgram Nova-3
Whisper hallucinations	Occasional "Thank you" on silence	Blocklist + peak RMS filter (partial fix)
Groq rate limits	8K tokens per minute on GPT-OSS 120B	Use Llama 4 Scout (30K TPM)
No persistent memory	Conversations don't survive restart	Add SQLite storage
Single-turn context	Very long chats hit token limits	Summarise older messages
Roadmap
Phase 1 — Voice Conversation (Complete)
☑ Real-time voice input with wake-word activation
☑ Streamed AI responses from Groq LLM
☑ Text-to-speech with 40+ voices
☑ Interruption and barge-in handling
☑ TTS and LLM response caching
Phase 2 — Persistent Memory
□ SQLite storage for conversations
□ Cross-session context
□ Learned user preferences
□ "What did we talk about yesterday?"
Phase 3 — Tool Use
□ File system access (open my project folder)
□ Code execution (run the tests)
□ Screen awareness (screenshot → vision model)
□ Web search integration
Phase 4 — Agent Mode
□ Multi-step task execution
□ Local model support for privacy
□ Multi-device companion app
□ Plugin ecosystem for custom tools
Why I Built This
I wanted to understand how voice-driven AI assistants actually work — not just use one. Buddy taught me real-time audio streaming, interruption handling, streamed LLM responses, and how to wire a Python backend to a modern desktop frontend.

It's a foundation I plan to keep building on.

License
This project is licensed under the MIT License — see the LICENSE file for details.

Author
Reage Nkoana

GitHub: @ReageNkoana

Portfolio: reagenkoana.github.io/my-cv-portfolio