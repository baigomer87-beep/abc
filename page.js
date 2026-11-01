"use client";

import { useEffect, useRef, useState } from "react";

const SUGGESTIONS = [
  "Explain how async/await works in JavaScript",
  "Write a Python script to rename files in a folder",
  "Give me a 3-day workout plan",
  "Help me write a professional email",
];

// Minimal markdown: ``` code blocks, `inline code`, **bold**
function renderContent(text) {
  const parts = text.split(/```/);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const nl = part.indexOf("\n");
      const lang = nl > -1 ? part.slice(0, nl).trim() : "";
      const code = nl > -1 ? part.slice(nl + 1) : part;
      return (
        <div className="codeblock" key={i}>
          <div className="codehead">
            <span>{lang || "code"}</span>
            <button onClick={() => navigator.clipboard?.writeText(code)}>Copy</button>
          </div>
          <pre>
            <code>{code}</code>
          </pre>
        </div>
      );
    }
    const inline = part.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((seg, j) => {
      if (seg.startsWith("`") && seg.endsWith("`") && seg.length > 2)
        return <code className="inline" key={j}>{seg.slice(1, -1)}</code>;
      if (seg.startsWith("**") && seg.endsWith("**") && seg.length > 4)
        return <strong key={j}>{seg.slice(2, -2)}</strong>;
      return <span key={j}>{seg}</span>;
    });
    return <p key={i} className="text">{inline}</p>;
  });
}

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null);
  const bottomRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    setError("");
    setInput("");
    const next = [...messages, { role: "user", content }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        setError(e.message || "Something went wrong.");
        setMessages((m) =>
          m[m.length - 1]?.content === "" ? m.slice(0, -1) : m
        );
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function newChat() {
    stop();
    setMessages([]);
    setError("");
    setInput("");
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo">G</span> Groq Chat
        </div>
        <button className="ghost" onClick={newChat}>+ New chat</button>
      </header>

      <main className="chat">
        {messages.length === 0 ? (
          <div className="empty">
            <h1>How can I help you today?</h1>
            <div className="chips">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="thread">
            {messages.map((m, i) => (
              <div key={i} className={`row ${m.role}`}>
                <div className="avatar">{m.role === "user" ? "U" : "G"}</div>
                <div className="bubble">
                  {m.content ? (
                    renderContent(m.content)
                  ) : (
                    <span className="dots"><i /><i /><i /></span>
                  )}
                </div>
              </div>
            ))}
            {error && <div className="error">{error}</div>}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      <footer className="composer">
        <div className="box">
          <textarea
            ref={taRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message the assistant..."
          />
          {loading ? (
            <button className="send stop" onClick={stop} aria-label="Stop">■</button>
          ) : (
            <button className="send" onClick={() => send()} disabled={!input.trim()} aria-label="Send">↑</button>
          )}
        </div>
        <p className="hint">Enter to send · Shift+Enter for new line</p>
      </footer>
    </div>
  );
}
