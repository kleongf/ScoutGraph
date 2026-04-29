import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";

export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  eventKey: Annotation<string>({
    reducer: (_prev: string, next: string) => next ?? _prev,
    default: () => "2026caven",
  }),
  // Rolling summary of older conversation turns — prepended to system prompt
  // so the agent retains context even after old messages are pruned.
  conversationSummary: Annotation<string>({
    reducer: (_prev: string, next: string) => next ?? _prev,
    default: () => "",
  }),
});
