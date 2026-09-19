"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { aiApi, type AICompanion, type AIMessage } from "@/lib/api";

const LEVEL_NAMES: Record<string, { label: string; icon: string; color: string }> = {
  Stranger: { label: "Người lạ", icon: "👤", color: "#94a3b8" },
  Friend: { label: "Bạn bè", icon: "🤝", color: "#38bdf8" },
  "Close Friend": { label: "Bạn thân", icon: "🌟", color: "#a855f7" },
  Crush: { label: "Thầm thích", icon: "💓", color: "#f43f5e" },
  Romantic: { label: "Người yêu", icon: "❤️", color: "#ff4b72" },
};

export default function AICompanionChatPage({
  params,
}: {
  params: Promise<{ companionId: string }>;
}) {
  const { companionId } = use(params);
  const [companion, setCompanion] = useState<AICompanion | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  useEffect(() => {
    if (!companionId) return;
    setLoading(true);

    Promise.all([
      aiApi.getCompanion(companionId),
      aiApi.companions(),
    ])
      .then(async ([compRes]) => {
        setCompanion(compRes);

        // Fetch conversations list to find conversation ID for this companion
        try {
          const convsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080"}/api/ai/conversations`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("neardy_access_token") || ""}`,
            },
          }).then((r) => r.json());

          const convList = convsRes?.data?.conversations || [];
          const matchedConv = convList.find((c: { companion_id: string }) => c.companion_id === companionId);

          if (matchedConv) {
            setConversationId(matchedConv.id);
            const msgsRes = await aiApi.messages(matchedConv.id);
            setMessages(msgsRes.messages || []);
          }
        } catch {}
      })
      .catch((err) => console.error("Failed to load companion:", err))
      .finally(() => setLoading(false));
  }, [companionId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || streaming || !companion) return;

    const userMsg: AIMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setStreamingText("");

    let currentStream = "";

    try {
      await aiApi.streamChat(
        {
          companion_id: companion.id,
          conversation_id: conversationId,
          message: trimmed,
        },
        (chunk) => {
          currentStream += chunk;
          setStreamingText(currentStream);
        },
        (err) => {
          console.error("Stream error:", err);
        }
      );

      if (currentStream) {
        const assistantMsg: AIMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: currentStream,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Refresh companion relationship points
        aiApi.getCompanion(companion.id).then((updated) => setCompanion(updated)).catch(() => {});
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Gửi tin nhắn thất bại";
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ ${errMsg}`,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setStreaming(false);
      setStreamingText("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0a0c14" }}>
        <div className="skeleton w-36 h-6 rounded-full bg-slate-800" />
      </div>
    );
  }

  const relInfo = LEVEL_NAMES[companion?.level || "Friend"] || { label: "Bạn bè", icon: "🤝", color: "#38bdf8" };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto" style={{ backgroundColor: "#0a0c14", color: "#e8eaf2" }}>
      {/* Header */}
      <header
        className="px-4 py-3 border-b flex items-center gap-3 sticky top-0 z-20 backdrop-blur-md"
        style={{ backgroundColor: "rgba(13, 15, 26, 0.85)", borderColor: "#1e2240" }}
      >
        <Link
          href="/ai-companions"
          className="p-2 rounded-xl transition-all hover:bg-slate-800/60 text-slate-300"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
             style={{ background: "linear-gradient(135deg, #2e1065, #3b0764)" }}>
          {companion?.avatar || "🌸"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-sm text-slate-100 truncate">{companion?.name}</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0"
                  style={{ backgroundColor: `${relInfo.color}25`, color: relInfo.color, border: `1px solid ${relInfo.color}40` }}>
              {relInfo.icon} {relInfo.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "#94a3b8" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sẵn sàng trò chuyện · {companion?.affection_points} pt</span>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !streaming && (
          <div className="text-center py-12 px-6">
            <div className="text-4xl mb-3">{companion?.avatar || "🌸"}</div>
            <h3 className="font-bold text-slate-200 text-sm">Bắt đầu trò chuyện cùng {companion?.name}</h3>
            <p className="text-xs mt-1 text-slate-400">
              Hãy chia sẻ những suy nghĩ, cảm xúc hoặc câu hỏi của bạn. {companion?.name} luôn lắng nghe!
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-md ${
                msg.role === "user" ? "rounded-br-xs" : "rounded-bl-xs"
              }`}
              style={{
                backgroundColor: msg.role === "user" ? "#6c63ff" : "#181b30",
                color: "#f8fafc",
                border: msg.role === "user" ? "none" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming text bubble */}
        {streaming && (
          <div className="flex justify-start">
            <div
              className="max-w-[82%] px-4 py-2.5 rounded-2xl rounded-bl-xs text-xs leading-relaxed break-words shadow-md"
              style={{
                backgroundColor: "#181b30",
                color: "#f8fafc",
                border: "1px solid rgba(108, 99, 255, 0.3)",
              }}
            >
              {streamingText}
              <span className="inline-block w-1.5 h-3 ml-1 bg-purple-400 animate-pulse rounded-full" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t sticky bottom-0 z-20"
        style={{ backgroundColor: "#0d0f1a", borderColor: "#1e2240" }}
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Nhắn tin với ${companion?.name || "AI"}...`}
            disabled={streaming}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-medium focus:outline-none transition-all"
            style={{
              backgroundColor: "#14172b",
              color: "#f8fafc",
              border: "1px solid #282c4d",
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-40 active:scale-95 shadow-md flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #6c63ff, #8b5cf6)" }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
