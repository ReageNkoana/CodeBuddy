# Buddy — AI-Powered Desktop Voice Assistant

A voice-first AI desktop assistant built with Tauri, React, TypeScript, and Python. Buddy listens to your voice, streams AI-generated responses, and speaks them aloud using text-to-speech.

Currently runs on Windows and uses free cloud APIs for AI processing, with plans to expand into coding assistance, screen awareness, and task automation.

**Status:** Phase 1 complete — active development

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Implementation Details](#implementation-details)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Why I Built This](#why-i-built-this)
- [Author](#author)
- [License](#license)

## Features

- **Voice Input:** Activate Buddy using the wake word "Buddy" or click to talk.
- **Streaming AI Responses:** Receive real-time responses powered by Groq-hosted language models.
- **Text-to-Speech:** Listen to responses using 40+ selectable voices.
- **Interruption Handling:** Interrupt speech playback by talking or using commands such as "stop" and "wait".
- **Chat History:** View conversations in a scrollable chat interface.
- **Voice Visualizer:** A reactive waveform that responds to microphone input.
- **Response Caching:** Cache TTS audio and common LLM responses to reduce latency and API usage.
- **Automatic Fallbacks:** Switch between supported TTS engines and LLM models when errors or rate limits occur.

## Architecture

```text
┌─────────────────────────────────────┐
│          Tauri Desktop App          │
│                                     │
│  React + TypeScript + Material UI   │
│                                     │
│  ┌──────────────┐ ┌──────────────┐  │
│  │ Voice Panel  │ │  Chat Panel  │  │
│  │ Waveform     │ │ Message Log  │  │
│  │ Voice Picker │ │ Text Input   │  │
│  └──────────────┘ └──────────────┘  │
└──────────────────┬──────────────────┘
                   │
              HTTP / localhost:8000
                   │
                   ▼
┌─────────────────────────────────────┐
│          Python Backend             │
│          FastAPI + Uvicorn          │
│                                     │
│  /transcribe  → Speech-to-Text      │
│  /chat        → Streaming LLM       │
│  /speak       → Text-to-Speech      │
│  /health      → Health Check        │
└─────────────────────────────────────┘
```

The frontend handles the desktop interface and audio capture. The Python backend manages speech transcription, LLM requests, and speech synthesis.

## Tech Stack

| Component | Technology |
|---|---|
| Desktop Framework | Tauri |
| Frontend | React, TypeScript, Material UI |
| Backend | Python, FastAPI, Uvicorn |
| Speech-to-Text | Groq Whisper large-v3 |
| Language Models | Groq-hosted GPT-OSS 120B / Llama 4 Scout |
| Text-to-Speech | Microsoft Edge TTS, gTTS fallback |
| Desktop Integration | Rust |
| Audio Cache | Disk-based storage |
| LLM Cache | In-memory storage |

## Getting Started

### Prerequisites

Install the following before setting up Buddy:

- [Node.js](https://nodejs.org/) — version 20 or later
- [Python](https://www.python.org/downloads/) — version 3.11–3.12 recommended
- [Rust](https://rustup.rs/) — required by Tauri
- [Groq API Key](https://console.groq.com/) — for speech-to-text and LLM requests

> **Note:** Python 3.13 may cause compatibility issues with some TTS dependencies.

### Backend Setup

Clone the repository and navigate to the backend directory:

```bash
git clone https://github.com/ReageNkoana/CodeBuddy.git
cd CodeBuddy/backend
```

Create and activate a virtual environment:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory and configure the required environment variables.

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at [http://localhost:8000](http://localhost:8000).

### Frontend Setup

Open a second terminal from the repository root:

```bash
cd frontend
npm install
npm run tauri dev
```

The Tauri desktop application should launch automatically.

### Environment Variables

Create `backend/.env`:

```dotenv
GROQ_API_KEY=gsk_your_key_here
GROQ_LLM_MODEL=llama-4-scout
TTS_VOICE=en-ZA-LukeNeural
CACHE_DIR=./cache
```

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | API key for Groq services |
| `GROQ_LLM_MODEL` | No | Configures the language model |
| `TTS_VOICE` | No | Default Edge TTS voice |
| `CACHE_DIR` | No | Directory for cached audio |

Never commit your `.env` file or expose your API key. Ensure `.env` is included in `.gitignore`.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/transcribe` | Transcribes uploaded audio |
| `POST` | `/chat` | Streams an AI-generated response |
| `POST` | `/speak` | Generates speech audio from text |
| `GET` | `/health` | Returns backend health information |

The `/speak` endpoint returns audio data. Request formats and response types vary by endpoint.

## Project Structure

```text
CodeBuddy/
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   ├── routers/
│   │   ├── transcribe.py
│   │   ├── chat.py
│   │   └── speak.py
│   ├── services/
│   │   ├── llm.py
│   │   ├── stt.py
│   │   └── tts.py
│   └── cache/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VoicePanel.tsx
│   │   │   ├── ChatPanel.tsx
│   │   │   └── WaveVisual.tsx
│   │   ├── services/
│   │   ├── contexts/
│   │   ├── types/
│   │   └── App.tsx
│   ├── src-tauri/
│   ├── package.json
│   └── vite.config.ts
│
├── .gitignore
├── LICENSE
└── README.md
```

## Implementation Details

### Wake Word Activation

Buddy supports wake-word activation using "Buddy". Once activated, it listens for speech for up to 30 seconds before returning to its idle listening state.

### Barge-In Interruption

Speech playback can be interrupted by speaking or using commands such as "stop", "wait", or "hold on". The application coordinates audio playback interruption with the active response stream.

### Fragment Staging

A staging buffer temporarily holds speech transcription fragments and combines them when appropriate, reducing the likelihood of incomplete sentences being submitted to the LLM.

### Caching

- **TTS caching:** Stores generated audio on disk for reuse.
- **LLM caching:** Stores eligible common responses in memory to avoid unnecessary API calls.

### Markdown Stripping

Markdown formatting is removed from AI-generated responses before text is passed to the TTS engine, preventing formatting symbols from being spoken aloud.

## Known Limitations

| Limitation | Impact | Potential Improvement |
|---|---|---|
| Edge TTS errors | Occasional HTTP 403 errors can trigger the gTTS fallback. | Evaluate local TTS engines such as Kokoro or Piper. |
| Accent recognition | Whisper can struggle with South African English. | Evaluate alternative speech recognition services. |
| Transcription hallucinations | Silence can occasionally produce incorrect text. | Improve silence detection and audio filtering. |
| API rate limits | Requests may be throttled depending on model limits. | Evaluate alternative models and monitor usage. |
| No persistent memory | Conversations do not survive application restarts. | Add SQLite storage. |
| Long conversations | Context limits can affect extended conversations. | Summarize older messages and preserve relevant context. |

## Roadmap

### Phase 1 — Voice Conversations

- [x] Voice input and wake-word activation
- [x] Streaming AI responses
- [x] Text-to-speech with selectable voices
- [x] Interruption handling
- [x] TTS and LLM response caching

### Phase 2 — Persistent Memory

- [ ] SQLite conversation storage
- [ ] Cross-session context
- [ ] User preference retention
- [ ] Historical conversation queries

### Phase 3 — Tool Use

- [ ] File system access
- [ ] Code execution and test running
- [ ] Screen awareness using vision models
- [ ] Web search integration

### Phase 4 — Agent Mode

- [ ] Multi-step task execution
- [ ] Local model support
- [ ] Multi-device companion application
- [ ] Plugin ecosystem

## Why I Built This

I wanted to understand how voice-driven AI assistants work rather than simply use one.

Building Buddy has given me practical experience with audio processing, speech recognition, text-to-speech, streaming LLM responses, interruption handling, and integrating a Python backend with a modern desktop application.

Buddy is a foundation I plan to continue building on.

## Author

**Reage Nkoana**

- GitHub: [@ReageNkoana](https://github.com/ReageNkoana)
- Portfolio: [reagenkoana.github.io/my-cv-portfolio](https://reagenkoana.github.io/my-cv-portfolio)

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
