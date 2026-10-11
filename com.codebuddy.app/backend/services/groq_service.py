import re

from groq import Groq

from config import (
    STT_MODEL,
    STT_LANGUAGE,
    STT_TEMPERATURE,
    STT_PROMPT,
    get_groq_key,
)

_client = Groq(api_key=get_groq_key())


# ---------------------------------------------------------------------------
# Known Whisper hallucinations — text produced from silence or transient noise
# because Whisper was trained on YouTube videos with subtitle credits.
# These are NEVER things a real user would say to Buddy. Always drop.
# ---------------------------------------------------------------------------
_HALLUCINATION_PATTERNS = [
    r"^thanks? for watching.*$",
    r"^thank you for watching.*$",
    r"^subscribe\.?!?$",
    r"^please subscribe.*$",
    r"^like and subscribe.*$",
    r"^don'?t forget to subscribe.*$",
    r"^subtitles? by.*$",
    r"^subtitle.*by.*$",
    r"^subtitled by.*$",
    r"^captions? by.*$",
    r"^amara\.?org.*$",
    r"^amara.*$",
    r"^the amara.*$",
    r"^community.*amara.*$",
    r"^thanks to .* amara.*$",
    r"^www\..*$",
    r"^https?://.*$",
    r"^\[music\]$",
    r"^\(music\)$",
    r"^\[applause\]$",
    r"^\(applause\)$",
    r"^\[laughter\]$",
    r"^\[silence\]$",
    r"^\[inaudible\]$",
    r"^\[blank_audio\]$",
    r"^♪+$",
    r"^\.+$",
    r"^,+$",
    r"^\-+$",
    r"^\s*$",
]

# ---------------------------------------------------------------------------
# Pure filler — user speech, but no semantic content. Nothing for the LLM
# to respond to. Drop silently.
# ---------------------------------------------------------------------------
_FILLER_PATTERNS = [
    r"^u+h+\.?$",
    r"^u+m+\.?$",
    r"^h+m+\.?$",
    r"^a+h+\.?$",
    r"^e+r+\.?$",
    r"^m+m+\.?$",
    r"^mhm+\.?$",
    r"^uh[\s\-]?huh\.?$",
    r"^mm[\s\-]?hmm\.?$",
    r"^hmm+[\s\-]?hmm+\.?$",
]

_hallucination_re = [re.compile(p, re.IGNORECASE) for p in _HALLUCINATION_PATTERNS]
_filler_re = [re.compile(p, re.IGNORECASE) for p in _FILLER_PATTERNS]


def _matches_any(text: str, patterns: list[re.Pattern]) -> bool:
    if not text:
        return True
    stripped = text.strip(" .,!?:;\"'")
    for pattern in patterns:
        if pattern.match(text) or pattern.match(stripped):
            return True
    return False


def transcribe(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """Send a complete audio clip to Groq Whisper. Returns the transcript,
    or an empty string if the result is a hallucination or pure filler."""
    result = _client.audio.transcriptions.create(
        file=(filename, audio_bytes),
        model=STT_MODEL,
        response_format="text",
        language=STT_LANGUAGE,
        prompt=STT_PROMPT,
        temperature=STT_TEMPERATURE,
    )
    text = result if isinstance(result, str) else result.text
    text = (text or "").strip()

    if _matches_any(text, _hallucination_re):
        return ""
    if _matches_any(text, _filler_re):
        return ""

    return text