export const runtime = "nodejs";
export const maxDuration = 60;

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const MAX_MESSAGES = 30;
const MAX_CHARS = 8000;

const SYSTEM_PROMPT =
  "You are a helpful, accurate and concise AI assistant. Use Markdown for code blocks and lists. Reply in the same language the user writes in.";

export async function POST(req) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "GROQ_API_KEY is not set on the server." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const incoming = Array.isArray(body?.messages) ? body.messages : [];
  const messages = incoming
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim()
    )
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  if (messages.length === 0) {
    return Response.json({ error: "No messages provided." }, { status: 400 });
  }

  let upstream;
  try {
    upstream = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        max_completion_tokens: 2048,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      }),
      signal: req.signal,
    });
  } catch {
    return Response.json(
      { error: "Could not reach the Groq API. Please try again." },
      { status: 502 }
    );
  }

  if (!upstream.ok || !upstream.body) {
    if (upstream.status === 429) {
      return Response.json(
        {
          error:
            "Groq free-tier rate limit reached. Wait a minute and try again.",
        },
        { status: 429 }
      );
    }
    const text = await upstream.text().catch(() => "");
    return Response.json(
      { error: `Groq API error (${upstream.status}): ${text.slice(0, 500)}` },
      { status: upstream.status || 502 }
    );
  }

  // Convert Groq's SSE stream into a plain text stream for the browser.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              // ignore partial / non-JSON lines
            }
          }
        }
      } catch {
        controller.enqueue(
          encoder.encode("\n\n[Connection interrupted. Please try again.]")
        );
      } finally {
        controller.close();
      }
    },
    cancel() {
      upstream.body?.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
