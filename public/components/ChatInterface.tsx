import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";
import { MessageBubble } from "./MessageBubble";
import { SuggestedPrompts } from "./SuggestedPrompts";
import { streamChat } from "../lib/api";
import type { ChatMessage, StreamEvent } from "../types";

interface Props {
  eventKey: string;
  externalPrompt?: string | null;
  onExternalPromptConsumed?: () => void;
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export function ChatInterface({
  eventKey,
  externalPrompt,
  onExternalPromptConsumed,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fire an externally-requested prompt (e.g. from the team panel)
  useEffect(() => {
    if (externalPrompt) {
      sendMessage(externalPrompt);
      onExternalPromptConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPrompt]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setInput("");
      setIsLoading(true);

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);

      // Build history for the server (exclude tool_call / tool_result rows)
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role === "user" ? ("human" as const) : ("ai" as const),
          content: m.content,
        }));

      // Streaming assistant message (placeholder)
      const assistantId = generateId();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", isStreaming: true },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChat(
          { message: trimmed, eventKey, history },
          (event: StreamEvent) => {
            if (event.type === "token") {
              const node = event.node;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: m.content + (event.content ?? ""),
                        node,
                      }
                    : m
                )
              );
            } else if (event.type === "tool_start") {
              setMessages((prev) => [
                ...prev,
                {
                  id: generateId(),
                  role: "tool_call",
                  content: "",
                  toolCall: {
                    name: event.toolName ?? "unknown",
                    args: event.toolArgs ?? {},
                  },
                },
              ]);
            } else if (event.type === "tool_result") {
              setMessages((prev) => [
                ...prev,
                {
                  id: generateId(),
                  role: "tool_result",
                  content: event.content ?? "",
                  toolName: event.toolName,
                },
              ]);
            } else if (event.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content:
                          m.content ||
                          `Error: ${event.error ?? "Unknown error"}`,
                        isStreaming: false,
                      }
                    : m
                )
              );
            } else if (event.type === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, isStreaming: false } : m
                )
              );
            }
          },
          controller.signal
        );
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content:
                      m.content ||
                      `Connection error: ${(err as Error).message}`,
                    isStreaming: false,
                  }
                : m
            )
          );
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, eventKey, isLoading]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsLoading(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center pb-8">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-4 text-2xl">
              🤖
            </div>
            <h2 className="text-white font-semibold text-lg mb-1">
              ScoutGraph Agent
            </h2>
            <p className="text-slate-400 text-sm max-w-sm">
              Ask me anything about teams at{" "}
              <span className="font-mono text-blue-400">{eventKey}</span>. I can
              generate reports, create picklists, suggest strategies, and more.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts — shown when chat is empty */}
      {isEmpty && <SuggestedPrompts onSelect={(p) => sendMessage(p)} />}

      {/* Input bar */}
      <div className="border-t border-surface-border px-4 py-3 bg-surface-card/50">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a team, match, strategy, or picklist…"
            rows={1}
            style={{ resize: "none" }}
            className="flex-1 bg-surface border border-surface-border rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 max-h-40 overflow-y-auto"
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
            }}
          />
          {isLoading ? (
            <button
              onClick={handleStop}
              className="shrink-0 w-10 h-10 rounded-xl bg-red-600 hover:bg-red-500 flex items-center justify-center transition-colors"
              title="Stop"
            >
              <span className="w-3 h-3 rounded-sm bg-white" />
            </button>
          ) : (
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className="shrink-0 w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              title="Send (Enter)"
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          )}
        </div>
        <p className="text-slate-600 text-xs mt-1.5 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
