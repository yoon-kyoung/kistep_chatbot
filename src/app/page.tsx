"use client";

import { useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const API_BASE = process.env.NEXT_PUBLIC_CHAT_API_URL ?? "";

const SUGGESTIONS = [
  "KISTEP은 어떤 일을 하는 기관인가요?",
  "예비타당성조사가 뭔가요?",
  "국가 R&D 예산은 어떻게 편성되나요?",
];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
      <path
        d="M12 19V5M12 5l-6 6M12 5l6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatInputBar({
  value,
  onChange,
  onSend,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  loading: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
      className="flex w-full max-w-[560px] items-center gap-2 rounded-[28px] border border-gray-200 bg-gray-50 py-2.5 pr-2.5 pl-5 shadow-sm transition focus-within:border-blue-300 focus-within:shadow-md"
    >
      <span className="text-gray-400">
        <SearchIcon />
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="자유롭게 물어보세요 (예: 예비타당성조사가 뭔가요?)"
        disabled={loading}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-gray-900 outline-none placeholder:text-gray-400"
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition disabled:bg-gray-200 disabled:text-gray-400"
      >
        <SendIcon />
      </button>
    </form>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function sendMessage(override?: string) {
    const text = (override ?? input).trim();
    if (!text || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "요청에 실패했습니다." }));
        throw new Error(err.error || "요청에 실패했습니다.");
      }

      setDemoMode(res.headers.get("X-Demo-Mode") === "true");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantText };
          return updated;
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "오류가 발생했습니다.";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: `⚠️ ${message}` };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  const started = messages.length > 0;

  return (
    <div className="mx-auto flex h-screen w-full max-w-2xl flex-col px-4">
      {started && (
        <header className="flex items-center gap-2 border-b border-gray-100 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-extrabold text-white">
            K
          </div>
          <h1 className="text-base font-semibold text-gray-900">KISTEP 챗봇</h1>
        </header>
      )}

      {!started ? (
        <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
          <div className="mb-5 flex h-[68px] w-[68px] items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-2xl font-extrabold text-white shadow-sm">
            K
          </div>
          <h1 className="mb-2 text-[26px] font-extrabold tracking-tight text-gray-900">
            KISTEP 챗봇
          </h1>
          <p className="mb-8 text-[15px] leading-relaxed text-gray-500">
            궁금한 KISTEP 정보나 과학기술 정책을 말씀해 주시면
            <br />
            자료를 찾아 알기 쉽게 정리해드릴게요.
          </p>

          <ChatInputBar
            value={input}
            onChange={setInput}
            onSend={() => sendMessage()}
            loading={loading}
          />

          <div className="mt-5 flex max-w-[560px] flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => sendMessage(s)}
                className="rounded-full border border-gray-200 bg-white/70 px-4 py-2 text-[13px] text-gray-700 transition hover:border-blue-300 hover:bg-blue-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {demoMode && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⚠️ 데모 모드 — ANTHROPIC_API_KEY가 등록되지 않아 예시 답변을 보여주고 있어요.
            </p>
          )}

          <main className="flex-1 space-y-3 overflow-y-auto py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-blue-600 text-white"
                    : "mr-auto bg-gray-100 text-gray-900"
                }`}
              >
                {m.content || (loading && i === messages.length - 1 ? "…" : "")}
              </div>
            ))}
          </main>

          <div className="flex justify-center border-t border-gray-100 py-3">
            <ChatInputBar
              value={input}
              onChange={setInput}
              onSend={() => sendMessage()}
              loading={loading}
            />
          </div>
        </>
      )}
    </div>
  );
}
