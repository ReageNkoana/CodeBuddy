import asyncio
import hashlib
import io
import re
from pathlib import Path

import edge_tts
from gtts import gTTS

from config import TTS_VOICE, TTS_RATE, TTS_VOLUME


CACHE_DIR = Path(__file__).parent.parent / ".tts_cache"
CACHE_DIR.mkdir(exist_ok=True)


def _cache_key(text: str, voice: str) -> str:
    h = hashlib.sha256(f"{text}|{voice}|{TTS_RATE}".encode()).hexdigest()[:24]
    return h


def _cache_path(key: str, ext: str) -> Path:
    return CACHE_DIR / f"{key}.{ext}"


def _strip_markdown(text: str) -> str:
    """Remove markdown so TTS never reads 'asterisk' or 'hash'."""
    # Fenced code blocks — drop entirely (voice shouldn't read code)
    text = re.sub(r"```[\s\S]*?```", " ", text)
    # Inline code — keep content, drop backticks
    text = re.sub(r"`([^`]+)`", r"\1", text)
    # Bold + italic
    text = re.sub(r"\*\*\*(.+?)\*\*\*", r"\1", text)
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    text = re.sub(r"___(.+?)___", r"\1", text)
    text = re.sub(r"__(.+?)__", r"\1", text)
    text = re.sub(r"_(.+?)_", r"\1", text)
    # Headings
    text = re.sub(r"^#+\s*", "", text, flags=re.MULTILINE)
    # Bullets and numbered lists
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)
    # Links — keep label, drop URL
    text = re.sub(r"\[(.+?)\]\(.+?\)", r"\1", text)
    # Horizontal rules
    text = re.sub(r"^\s*[-_*]{3,}\s*$", "", text, flags=re.MULTILINE)
    # Blockquotes
    text = re.sub(r"^\s*>\s?", "", text, flags=re.MULTILINE)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text)
    return text.strip()


async def _synthesize_edge(text: str, voice: str) -> bytes:
    communicate = edge_tts.Communicate(
        text, voice, rate=TTS_RATE, volume=TTS_VOLUME
    )
    audio = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio += chunk["data"]
    return audio


def _synthesize_gtts(text: str) -> bytes:
    tts = gTTS(text=text, lang="en", slow=False)
    fp = io.BytesIO()
    tts.write_to_fp(fp)
    return fp.getvalue()


async def synthesize(text: str, voice: str | None = None) -> tuple[bytes, str]:
    """Return (audio_bytes, mime_type). Cached on disk.
    Order: Edge TTS → gTTS."""
    selected = voice or TTS_VOICE

    # Strip markdown before we synthesize or hash
    clean = _strip_markdown(text)
    if not clean:
        raise RuntimeError("Nothing to say after stripping markdown.")

    key = _cache_key(clean, selected)

    for ext, mime in [("mp3", "audio/mpeg"), ("wav", "audio/wav")]:
        p = _cache_path(key, ext)
        if p.exists():
            return p.read_bytes(), mime

    # Edge TTS
    try:
        audio = await _synthesize_edge(clean, selected)
        if audio:
            _cache_path(key, "mp3").write_bytes(audio)
            return audio, "audio/mpeg"
    except Exception as e:
        print(f"[Buddy] Edge TTS failed: {type(e).__name__}")

    # gTTS fallback
    try:
        audio = await asyncio.to_thread(_synthesize_gtts, clean)
        if audio:
            _cache_path(key, "mp3").write_bytes(audio)
            return audio, "audio/mpeg"
    except Exception as e:
        print(f"[Buddy] gTTS failed: {e}")

    raise RuntimeError("All TTS engines failed.")