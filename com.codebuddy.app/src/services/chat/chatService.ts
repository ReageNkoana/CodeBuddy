import { ENDPOINTS } from "../config";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamHandlers {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export async function streamChat(
  messages: ChatMessage[],
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const res = await fetch(ENDPOINTS.chat, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`Chat returned ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data:")) continue;

        const payload = line.slice(5).trim();

        if (payload === "[DONE]") {
          handlers.onDone();
          return;
        }

        // -- Step 1: parse. Parse failure = raw token, forward as-is.
        let parsed: unknown;
        let parseFailed = false;
        try {
          parsed = JSON.parse(payload);
        } catch {
          parseFailed = true;
        }

        if (parseFailed) {
          handlers.onToken(payload);
          continue;
        }

        // -- Step 2: dispatch. Errors here go to onError.
        if (typeof parsed === "string") {
          handlers.onToken(parsed);
        } else if (
          parsed !== null &&
          typeof parsed === "object" &&
          "error" in parsed &&
          typeof (parsed as { error: unknown }).error === "string"
        ) {
          handlers.onError(new Error((parsed as { error: string }).error));
          return;
        } else {
          // Unknown shape — fall back to raw text
          handlers.onToken(payload);
        }
      }
    }

    handlers.onDone();
  } catch (err) {
    if (signal?.aborted) return;
    handlers.onError(err instanceof Error ? err : new Error(String(err)));
  }
}