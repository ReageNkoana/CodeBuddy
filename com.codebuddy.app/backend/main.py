import json

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

from config import ALLOWED_ORIGINS
from services.groq_service import transcribe
from services.llm_service import stream_reply
from services.tts_service import synthesize

app = FastAPI(title="Buddy Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class SpeakRequest(BaseModel):
    text: str
    voice: str | None = None


@app.get("/health")
def health():
    return {"status": "ok", "message": "Buddy is alive"}


@app.post("/transcribe")
async def transcribe_endpoint(audio: UploadFile = File(...)):
    audio_bytes = await audio.read()
    filename = audio.filename or "audio.webm"
    text = transcribe(audio_bytes, filename=filename)
    return {"text": text.strip()}


@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    def generate():
        try:
            for token in stream_reply(messages):
                yield f"data: {json.dumps(token)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/speak")
async def speak_endpoint(request: SpeakRequest):
    text = request.text.strip()
    if not text:
        return Response(status_code=204)
    audio, mime = await synthesize(text, voice=request.voice)
    return Response(content=audio, media_type=mime)