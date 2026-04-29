import { Router } from "express";
import type { Request, Response } from "express";
import { AIMessageChunk } from "@langchain/core/messages";
import { app, buildInput } from "../agent/graph.js";

interface ChatRequest {
  message: string;
  eventKey?: string;
  history?: Array<{ role: "human" | "ai"; content: string }>;
}

export const chatRouter = Router();

chatRouter.post("/", async (req: Request, res: Response) => {
  const { message, eventKey, history } = req.body as ChatRequest;

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering if behind proxy
  res.flushHeaders();

  function send(data: object) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    const input = buildInput(message, eventKey ?? "2026caven", history ?? []);

    const stream = await app.stream(input, {
      streamMode: "messages",
    });

    for await (const [chunk, metadata] of stream) {
      const node: string = (metadata as { langgraph_node?: string }).langgraph_node ?? "unknown";

      if (chunk instanceof AIMessageChunk) {
        // Streaming token from the LLM
        const content =
          typeof chunk.content === "string" ? chunk.content : "";

        if (content) {
          send({ type: "token", node, content });
        }

        // Tool call starts — notify the client what tool is being called
        if (chunk.tool_call_chunks && chunk.tool_call_chunks.length > 0) {
          for (const tc of chunk.tool_call_chunks) {
            if (tc.name) {
              // First chunk with the tool name — announce it
              let args: Record<string, unknown> = {};
              try {
                args = tc.args ? (JSON.parse(tc.args) as Record<string, unknown>) : {};
              } catch {
                // args may arrive in pieces; show partial
              }
              send({
                type: "tool_start",
                node,
                toolName: tc.name,
                toolArgs: args,
              });
            }
          }
        }
      } else if (
        // ToolMessage — the result coming back from a tool call
        chunk &&
        typeof chunk === "object" &&
        "name" in chunk &&
        "content" in chunk
      ) {
        const toolMsg = chunk as { name: string; content: unknown };
        const content =
          typeof toolMsg.content === "string"
            ? toolMsg.content
            : JSON.stringify(toolMsg.content);

        // Send a short preview to the client (don't flood with 1000+ char payloads)
        send({
          type: "tool_result",
          node,
          toolName: toolMsg.name,
          content: content.length > 600 ? content.slice(0, 600) + "…" : content,
        });
      }
    }

    send({ type: "done" });
  } catch (err: unknown) {
    console.error("[chat] Agent error:", err);
    send({ type: "error", error: (err as Error).message });
    send({ type: "done" });
  } finally {
    res.end();
  }
});
