// ─── Firebase data shapes ────────────────────────────────────────────────────

export interface AutoData {
  fuelScored: number;
  startPosition: "depot" | "center" | "bottom" | string;
  climbAttempted: boolean;
  climbLevel: number;
}

export interface TeleopData {
  fuelScored: number;
  fuelShuttled: number;
  fuelPrevented: number;
  bricked: boolean;
  beached: boolean;
  playedDefense: boolean;
}

export interface EndgameData {
  climbAttempted: boolean;
  climbLevel: number;
}

export interface MatchScoutingData {
  eventKey: string;
  matchKey: string;
  matchNumber: number;
  teamNumber: string;
  submittedAt: string;
  auto: AutoData;
  teleop: TeleopData;
  endgame: EndgameData;
  notes: string;
  driverRating: number;
}

export interface PitScoutingData {
  drivetrain: "Swerve" | "Mecanum" | "Holonomic" | "Other" | "";
  archetype: "Turret" | "Dumper" | "Other" | "";
  climbLevel: "None" | "Level 1" | "Level 2" | "Level 3" | "";
  scoringZone: "Close" | "Far" | "Any" | "";
  underTrench: boolean;
  overBump: boolean;
  shootingOnMove: boolean;
  shootingOnMoveAccuracy: "Low (<40%)" | "Medium (40–70%)" | "High (>70%)" | "";
  numCameras: number;
  weightLbs: number | "";
  notes: string;
  updatedAt: string;
}

// ─── Pre-computed stats shape ────────────────────────────────────────────────

export interface TeamStats {
  matchCount: number;
  avgBrickRate: number;
  avgDefenseRate: number;
  avgClimbSuccessRate: number;
  avgAutoFuelScored: number;
  avgTeleopFuelScored: number;
  avgFuelShuttled: number;
  avgFuelPreventedOnDefense: number | null;
  avgBeachRate: number;
  avgDriverRating: number;
  updatedAt: string;
}

// ─── Flattened per-match record for charts ───────────────────────────────────

export interface MatchRecord {
  matchNumber: number;
  matchKey: string;
  autoFuel: number;
  teleopFuel: number;
  fuelShuttled: number;
  fuelPrevented: number;
  playedDefense: boolean;
  bricked: boolean;
  beached: boolean;
  climbAttempted: boolean;
  climbLevel: number; // 0 if not attempted, 1–3 if attempted
  driverRating: number;
  notes: string;
}

// ─── Combined team entry for the dashboard table ─────────────────────────────

export interface TeamEntry {
  teamNumber: string;
  stats: TeamStats | null;
  epa: number | null; // null while still loading or not available
  epaLoading: boolean;
}

// ─── Chat / Agent types ──────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "tool_call" | "tool_result";

export interface ToolCallInfo {
  name: string;
  args: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  toolCall?: ToolCallInfo;
  toolName?: string;
  isStreaming?: boolean;
  node?: string;
}

// ─── API types ───────────────────────────────────────────────────────────────

export interface ChatRequest {
  message: string;
  eventKey: string;
  history: Array<{ role: "human" | "ai"; content: string }>;
}

export type StreamEventType =
  | "token"
  | "tool_start"
  | "tool_result"
  | "error"
  | "done";

export interface StreamEvent {
  type: StreamEventType;
  node?: string;
  content?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  error?: string;
}
