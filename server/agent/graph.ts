import { StateGraph, END, START } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  RemoveMessage,
} from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import { AgentState } from "./state.js";
import { allTools, llm } from "./tools.js";

// ─── Context window thresholds ────────────────────────────────────────────────
// Trim when total stored messages exceed this count; keep the most recent N.
const TRIM_THRESHOLD = 20;
const MESSAGES_TO_KEEP = 8;

// ─── System prompt ────────────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are ScoutGraph, an FRC scouting assistant. Be concise.

Capabilities: answer match/team questions, generate reports, classify teams (tags), strategy (with/against), picklists, comparisons.

WORKFLOW RULES:
- Reports: get_team_stats → get_pit_scouting_data → get_team_epa → get_team_notes_summary (optional) → generate_team_report → fact_check
- Classifications: get_team_stats → [get_pit_scouting_data] → classify_team_strengths → fact_check
- Strategy: get_team_stats → [get_pit_scouting_data] → generate_strategy → fact_check
- Picklists: get_team_stats for each team → generate_picklist
- Single match question: get_match_scouting_data
- Always fact_check reports and classifications before presenting
- Prefer get_team_stats over fetching individual matches (much cheaper)

Terminology: fuel=game pieces, shuttle=deliver to alliance, climb L1/L2/L3=endgame height, bricked=disabled, beached=stuck, EPA=Expected Points Added (Statbotics).`;

// ─── Model ────────────────────────────────────────────────────────────────────

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
  streaming: true,
});

const modelWithTools = model.bindTools(allTools);

// ─── Agent node ───────────────────────────────────────────────────────────────

async function agentNode(state: typeof AgentState.State) {
  const systemContent = state.conversationSummary
    ? `${BASE_SYSTEM_PROMPT}\n\n---\nPREVIOUS CONTEXT SUMMARY:\n${state.conversationSummary}\n---`
    : BASE_SYSTEM_PROMPT;

  const response = await modelWithTools.invoke([
    new SystemMessage(systemContent),
    ...state.messages,
  ]);
  return { messages: [response] };
}

// ─── Context manager node ─────────────────────────────────────────────────────
// Runs after every final response. When history exceeds the threshold it:
//   1. Builds a rolling summary that merges the old summary with dropped messages.
//   2. Emits RemoveMessage entries to prune those messages from the state.
// The next agentNode call will see a shorter history with the summary in the prompt.

function msgText(m: BaseMessage): string {
  if (typeof m.content === "string") return m.content.slice(0, 400);
  if (Array.isArray(m.content)) {
    return m.content
      .map((c) => (typeof c === "string" ? c : (c as { text?: string }).text ?? ""))
      .join(" ")
      .slice(0, 400);
  }
  return "";
}

async function contextManagerNode(state: typeof AgentState.State) {
  const messages = state.messages;

  if (messages.length <= TRIM_THRESHOLD) {
    return {}; // Nothing to do
  }

  const toRemove = messages.slice(0, -MESSAGES_TO_KEEP);
  const existing = state.conversationSummary;

  // Only include human and final-AI messages (skip tool call/result noise) in the summary
  const summaryLines = toRemove
    .filter((m) => {
      if (m instanceof HumanMessage) return true;
      if (m instanceof AIMessage) return !m.tool_calls?.length;
      return false;
    })
    .map((m) => `${m instanceof HumanMessage ? "User" : "Assistant"}: ${msgText(m)}`);

  if (summaryLines.length === 0) {
    // Nothing worth summarizing — just prune silently
    return {
      messages: toRemove.map((m) => new RemoveMessage({ id: m.id! })),
    };
  }

  const prompt = existing
    ? `Update this FRC scouting session summary to include the new exchanges below. Keep it under 200 words.\n\nCurrent summary:\n${existing}\n\nNew exchanges:\n${summaryLines.join("\n")}`
    : `Summarize this FRC scouting session in under 150 words (teams analyzed, key findings, answers given):\n\n${summaryLines.join("\n")}`;

  const r = await llm.invoke(prompt);
  const newSummary =
    typeof r.content === "string" ? r.content : existing;

  return {
    messages: toRemove.map((m) => new RemoveMessage({ id: m.id! })),
    conversationSummary: newSummary,
  };
}

// ─── Routing ──────────────────────────────────────────────────────────────────

function shouldContinue(
  state: typeof AgentState.State
): "tools" | "context_manager" {
  const last = state.messages[state.messages.length - 1] as AIMessage;
  if (last.tool_calls?.length) return "tools";
  return "context_manager";
}

// ─── Graph ────────────────────────────────────────────────────────────────────

const toolNode = new ToolNode(allTools);

const workflow = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addNode("context_manager", contextManagerNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, {
    tools: "tools",
    context_manager: "context_manager",
  })
  .addEdge("tools", "agent")
  .addEdge("context_manager", END);

export const app = workflow.compile();

// ─── Build initial input ──────────────────────────────────────────────────────

export function buildInput(
  userMessage: string,
  eventKey: string,
  history: Array<{ role: "human" | "ai"; content: string }>,
  conversationSummary = ""
) {
  const historyMessages = history.map((m) =>
    m.role === "human" ? new HumanMessage(m.content) : new AIMessage(m.content)
  );

  return {
    messages: [
      ...historyMessages,
      new HumanMessage(`[Event: ${eventKey}]\n${userMessage}`),
    ],
    eventKey,
    conversationSummary,
  };
}
