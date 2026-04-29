import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../types";

const NODE_LABELS: Record<string, string> = {
  agent: "Agent",
  fact_checker: "Fact Checker",
  tools: "Tool",
};

interface Props {
  message: ChatMessage;
}

export function MessageBubble({ message }: Props) {
  if (message.role === "tool_call") {
    return (
      <div className="flex items-start gap-2 my-1">
        <div className="flex-1 bg-amber-950/40 border border-amber-800/50 rounded-lg px-3 py-2 text-xs font-mono">
          <span className="text-amber-400 font-semibold">Calling tool: </span>
          <span className="text-amber-300">{message.toolCall?.name}</span>
          {message.toolCall?.args &&
            Object.keys(message.toolCall.args).length > 0 && (
              <div className="mt-1 text-amber-500/80 pl-2 border-l border-amber-800/50">
                {Object.entries(message.toolCall.args).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-amber-600">{k}: </span>
                    <span>{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    );
  }

  if (message.role === "tool_result") {
    return (
      <div className="flex items-start gap-2 my-1">
        <div className="flex-1 bg-emerald-950/30 border border-emerald-800/40 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400/80">
          <span className="text-emerald-400 font-semibold">
            {message.toolName ?? "Tool"} result:{" "}
          </span>
          <span className="line-clamp-3 text-emerald-500/70">
            {message.content}
          </span>
        </div>
      </div>
    );
  }

  if (message.role === "user") {
    return (
      <div className="flex justify-end my-2">
        <div className="max-w-[78%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  // assistant
  return (
    <div className="flex justify-start my-2">
      <div className="max-w-[88%]">
        {message.node && NODE_LABELS[message.node] && (
          <div className="text-xs text-slate-500 mb-1 ml-1">
            {NODE_LABELS[message.node]}
          </div>
        )}
        <div className="bg-surface-card border border-surface-border rounded-2xl rounded-bl-sm px-4 py-3 text-sm shadow-sm">
          <div className="prose-chat">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content +
                (message.isStreaming && !message.content.endsWith("▋")
                  ? "▋"
                  : "")}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
