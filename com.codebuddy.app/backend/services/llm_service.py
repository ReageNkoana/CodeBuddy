from groq import Groq

from config import (
    LLM_MODEL,
    LLM_TEMPERATURE,
    LLM_TOP_P,
    LLM_MAX_TOKENS,
    LLM_SYSTEM_PROMPT,
    get_groq_key,
)

_client = Groq(api_key=get_groq_key())

# Tiny in-memory cache for exact-match simple messages
_reply_cache: dict[str, str] = {}


def _get_cached(user_text: str) -> str | None:
    return _reply_cache.get(user_text.lower().strip())


def _set_cached(user_text: str, reply: str) -> None:
    if len(_reply_cache) > 200:
        _reply_cache.clear()
    _reply_cache[user_text.lower().strip()] = reply


def stream_reply(messages: list[dict]):
    """Yield reply tokens. Caches replies to simple standalone questions."""
    # Only cache when this is a single-turn conversation
    is_standalone = len(messages) == 1 and messages[0]["role"] == "user"
    user_text = messages[-1]["content"] if messages else ""

    if is_standalone:
        cached = _get_cached(user_text)
        if cached:
            yield cached
            return

    full = [{"role": "system", "content": LLM_SYSTEM_PROMPT}] + messages

    stream = _client.chat.completions.create(
        model=LLM_MODEL,
        messages=full,
        stream=True,
        temperature=LLM_TEMPERATURE,
        top_p=LLM_TOP_P,
        max_tokens=LLM_MAX_TOKENS,
    )

    collected = ""
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            collected += delta
            yield delta

    if is_standalone and collected and len(user_text) < 30:
        _set_cached(user_text, collected)