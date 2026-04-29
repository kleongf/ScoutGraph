import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "../firebase.js";
import { ChatOpenAI } from "@langchain/openai";

export const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

// ─── Statbotics EPA constants ─────────────────────────────────────────────────
const MEAN_SCORE = 156.11;
const STANDARD_DEVIATION = 107.91;

function unitlessEpaToEpa(u: number): number {
  return STANDARD_DEVIATION * ((u - 1500) / 250) + MEAN_SCORE / 3.0;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(v: unknown): string {
  return v != null ? `${((v as number) * 100).toFixed(1)}%` : "N/A";
}
function num(v: unknown, dec = 1): string {
  return v != null ? (v as number).toFixed(dec) : "N/A";
}

// ─── Tool: get_team_stats ─────────────────────────────────────────────────────
// Reads the pre-computed aggregate document — much cheaper than scanning matches.

export const getTeamStats = tool(
  async ({ eventKey, teamNumber }) => {
    try {
      const ref = db
        .collection("competitions")
        .doc(eventKey)
        .collection("teams")
        .doc(String(teamNumber))
        .collection("stats")
        .doc("current");
      const snap = await ref.get();

      if (!snap.exists) {
        return `No stats found for team ${teamNumber} at ${eventKey}. Stats may not have been computed yet.`;
      }

      const d = snap.data() as Record<string, unknown>;
      const lines = [
        `Stats — team ${teamNumber} at ${eventKey} (${d.matchCount ?? "?"} matches):`,
        `  Scoring: auto ${num(d.avgAutoFuelScored)} fuel | teleop ${num(d.avgTeleopFuelScored)} fuel | shuttled ${num(d.avgFuelShuttled)}`,
        `  Climb success: ${pct(d.avgClimbSuccessRate)} | Brick: ${pct(d.avgBrickRate)} | Beach: ${pct(d.avgBeachRate)}`,
        `  Defense: ${pct(d.avgDefenseRate)} of matches${d.avgFuelPreventedOnDefense != null ? ` | prevented when defending: ${num(d.avgFuelPreventedOnDefense)}` : ""}`,
        `  Avg driver rating: ${num(d.avgDriverRating)}/10`,
        `  Updated: ${d.updatedAt ?? "unknown"}`,
      ];
      return lines.join("\n");
    } catch (e) {
      return `Firestore error: ${(e as Error).message}`;
    }
  },
  {
    name: "get_team_stats",
    description:
      "Fetch pre-computed aggregate statistics for a team (averages for scoring, climb, defense, etc.). " +
      "Prefer this over fetching individual matches — much cheaper. " +
      "Use as the first step for reports, classifications, strategies, and picklists.",
    schema: z.object({
      eventKey: z.string().describe("TBA event key, e.g. '2026caven'"),
      teamNumber: z.string().describe("Team number without 'frc' prefix"),
    }),
  }
);

// ─── Tool: get_team_notes_summary ─────────────────────────────────────────────
// Fetches per-match notes (text-only) and summarizes them with the LLM.

export const getTeamNotesSummary = tool(
  async ({ eventKey, teamNumber }) => {
    try {
      const col = db
        .collection("competitions")
        .doc(eventKey)
        .collection("teams")
        .doc(String(teamNumber))
        .collection("matches");
      const snap = await col.get();

      if (snap.empty) {
        return `No matches found for team ${teamNumber} at ${eventKey}.`;
      }

      const notes = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          return { match: data.matchNumber, note: data.notes as string };
        })
        .filter((n) => n.note && n.note.trim() !== "")
        .sort((a, b) => ((a.match as number) ?? 0) - ((b.match as number) ?? 0));

      if (notes.length === 0) {
        return `Team ${teamNumber} has ${snap.size} scouted matches but no written notes.`;
      }

      const raw = notes.map((n) => `Match ${n.match}: ${n.note}`).join("\n");

      const response = await llm.invoke(
        `Summarize these FRC scouting notes for team ${teamNumber} into 3-6 concise bullet points. ` +
          `Focus on recurring patterns, robot behavior, and notable events.\n\nNotes:\n${raw}`
      );

      const summary =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      return `Notes summary — team ${teamNumber} (${notes.length}/${snap.size} matches have notes):\n${summary}`;
    } catch (e) {
      return `Firestore error: ${(e as Error).message}`;
    }
  },
  {
    name: "get_team_notes_summary",
    description:
      "Fetch scouter notes from all matches for a team and return an LLM-generated summary. " +
      "Use this for qualitative insights alongside the quantitative get_team_stats data.",
    schema: z.object({
      eventKey: z.string().describe("TBA event key"),
      teamNumber: z.string().describe("Team number without 'frc' prefix"),
    }),
  }
);

// ─── Tool: get_match_scouting_data ────────────────────────────────────────────
// Kept for single-match lookups when the user asks about a specific match.

export const getMatchScoutingData = tool(
  async ({ eventKey, teamNumber, matchNumber }) => {
    try {
      const ref = db
        .collection("competitions")
        .doc(eventKey)
        .collection("teams")
        .doc(String(teamNumber))
        .collection("matches")
        .doc(String(matchNumber));
      const snap = await ref.get();

      if (!snap.exists) {
        return `No scouting data found for team ${teamNumber} in match ${matchNumber} at ${eventKey}.`;
      }

      const d = snap.data() as Record<string, unknown>;
      const auto = (d.auto ?? {}) as Record<string, unknown>;
      const teleop = (d.teleop ?? {}) as Record<string, unknown>;
      const endgame = (d.endgame ?? {}) as Record<string, unknown>;

      return [
        `Match ${matchNumber} — team ${teamNumber} at ${eventKey}:`,
        `  Auto: ${auto.fuelScored ?? 0} fuel, start=${auto.startPosition ?? "?"}`,
        `  Teleop: ${teleop.fuelScored ?? 0} scored, ${teleop.fuelShuttled ?? 0} shuttled, ${teleop.fuelPrevented ?? 0} prevented, defense=${teleop.playedDefense ?? false}`,
        `  Issues: bricked=${teleop.bricked ?? false}, beached=${teleop.beached ?? false}`,
        `  Endgame: climbed=${endgame.climbAttempted ?? false}${endgame.climbAttempted ? `, level ${endgame.climbLevel}` : ""}`,
        `  Driver rating: ${d.driverRating ?? "N/A"}/10`,
        `  Notes: ${d.notes || "(none)"}`,
      ].join("\n");
    } catch (e) {
      return `Firestore error: ${(e as Error).message}`;
    }
  },
  {
    name: "get_match_scouting_data",
    description:
      "Fetch detailed scouting data for one specific match. " +
      "Only use this when the user asks about a particular match number — for general stats use get_team_stats instead.",
    schema: z.object({
      eventKey: z.string(),
      teamNumber: z.string(),
      matchNumber: z.number().int().positive(),
    }),
  }
);

// ─── Tool: get_pit_scouting_data ─────────────────────────────────────────────

export const getPitScoutingData = tool(
  async ({ eventKey, teamNumber }) => {
    try {
      const ref = db
        .collection("competitions")
        .doc(eventKey)
        .collection("teams")
        .doc(String(teamNumber))
        .collection("pit_scouting")
        .doc("data");
      const snap = await ref.get();

      if (!snap.exists) {
        return `No pit scouting data for team ${teamNumber} at ${eventKey}.`;
      }

      const d = snap.data() as Record<string, unknown>;
      return [
        `Pit — team ${teamNumber} at ${eventKey}:`,
        `  Drive: ${d.drivetrain || "?"} | Archetype: ${d.archetype || "?"}`,
        `  Max climb: ${d.climbLevel || "None"} | Zone: ${d.scoringZone || "?"}`,
        `  Under trench: ${d.underTrench ?? "?"} | Over bump: ${d.overBump ?? "?"}`,
        `  Shoot on move: ${d.shootingOnMove ?? "?"}${d.shootingOnMove ? ` (${d.shootingOnMoveAccuracy || "?"})` : ""}`,
        `  Cameras: ${d.numCameras ?? "?"} | Weight: ${d.weightLbs != null && d.weightLbs !== "" ? `${d.weightLbs} lbs` : "?"}`,
        `  Notes: ${d.notes || "(none)"}`,
      ].join("\n");
    } catch (e) {
      return `Firestore error: ${(e as Error).message}`;
    }
  },
  {
    name: "get_pit_scouting_data",
    description:
      "Fetch pit scouting data for a team (robot specs: drivetrain, weight, climb capability, shooting on move, etc.).",
    schema: z.object({
      eventKey: z.string(),
      teamNumber: z.string(),
    }),
  }
);

// ─── Tool: get_all_teams_at_event ────────────────────────────────────────────

export const getAllTeamsAtEvent = tool(
  async ({ eventKey }) => {
    try {
      const col = db.collection("competitions").doc(eventKey).collection("teams");
      const snap = await col.get();

      if (snap.empty) {
        return `No teams found at ${eventKey}.`;
      }

      const ids = snap.docs.map((d) => d.id).sort((a, b) => Number(a) - Number(b));
      return `Teams at ${eventKey} (${ids.length}): ${ids.join(", ")}`;
    } catch (e) {
      return `Firestore error: ${(e as Error).message}`;
    }
  },
  {
    name: "get_all_teams_at_event",
    description:
      "List all team numbers that have scouting data at an event. Use before iterating over all teams.",
    schema: z.object({ eventKey: z.string() }),
  }
);

// ─── Tool: get_team_epa ──────────────────────────────────────────────────────

export const getTeamEPA = tool(
  async ({ eventKey, teamNumber }) => {
    const year = eventKey.slice(0, 4);
    const url = `https://api.statbotics.io/v3/team_year/${teamNumber}/${year}`;

    try {
      const res = await fetch(url);
      if (res.status === 404) {
        return `No Statbotics data for team ${teamNumber} in ${year}.`;
      }
      if (!res.ok) {
        return `Statbotics error ${res.status} for team ${teamNumber}/${year}.`;
      }

      const data = (await res.json()) as { epa?: { unitless?: number } };
      const u = data.epa?.unitless;
      if (u == null) {
        return `Statbotics has no unitless EPA for team ${teamNumber} in ${year}.`;
      }

      const epa = unitlessEpaToEpa(u);
      return `EPA — team ${teamNumber} (${year}): ${epa.toFixed(2)} (unitless: ${u.toFixed(4)})`;
    } catch (e) {
      return `Statbotics fetch failed: ${(e as Error).message}`;
    }
  },
  {
    name: "get_team_epa",
    description:
      "Fetch and normalize Expected Points Added (EPA) from Statbotics. Year is extracted from the event key.",
    schema: z.object({
      eventKey: z.string().describe("TBA event key — year extracted automatically"),
      teamNumber: z.string(),
    }),
  }
);

// ─── Tool: generate_team_report ──────────────────────────────────────────────

export const generateTeamReport = tool(
  async ({ teamNumber, statsData, pitData, epaData, notesData }) => {
    const prompt = `Generate a concise FRC scouting report for team ${teamNumber} using ONLY the data below.

STATS:
${statsData}

PIT SCOUTING:
${pitData || "Not available"}

EPA:
${epaData || "Not computed"}

NOTES SUMMARY:
${notesData || "No notes"}

Write in markdown with sections: Overview, Scoring, Endgame, Defense & Driving, Robot Specs, Strengths (bullets), Weaknesses (bullets), Assessment.
Be specific. Use actual numbers. Flag inconsistencies.`;

    const r = await llm.invoke(prompt);
    return typeof r.content === "string" ? r.content : JSON.stringify(r.content);
  },
  {
    name: "generate_team_report",
    description:
      "Generate a formatted scouting report. Call get_team_stats, get_pit_scouting_data, get_team_epa, and optionally get_team_notes_summary first.",
    schema: z.object({
      teamNumber: z.string(),
      statsData: z.string().describe("Output of get_team_stats"),
      pitData: z.string().optional().describe("Output of get_pit_scouting_data"),
      epaData: z.string().optional().describe("Output of get_team_epa"),
      notesData: z.string().optional().describe("Output of get_team_notes_summary"),
    }),
  }
);

// ─── Tool: classify_team_strengths ───────────────────────────────────────────

export const classifyTeamStrengths = tool(
  async ({ teamNumber, statsData, pitData }) => {
    const prompt = `Classify team ${teamNumber} with tags based on the data below.

STATS:
${statsData}
${pitData ? `\nPIT:\n${pitData}` : ""}

Return JSON:
{"tags":["..."],"primary_role":"scorer|defender|shuttler|climber|all-rounder|unreliable","rationale":"..."}

Tags: High Scorer, Auto Scorer, Defensive Bot, Fuel Shuttler, Reliable Climber L1/L2/L3, Under-Trench Capable, Over-Bump Capable, Shoot on Move, Swerve Drive, Consistent, Inconsistent, Bricking Risk, Beaching Risk, High Driver Rating. Only use tags supported by the data.`;

    const r = await llm.invoke(prompt);
    const raw = typeof r.content === "string" ? r.content : JSON.stringify(r.content);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return raw;

    try {
      const p = JSON.parse(match[0]) as { tags: string[]; primary_role: string; rationale: string };
      return `Team ${teamNumber}: tags=[${p.tags.join(", ")}] role=${p.primary_role} — ${p.rationale}`;
    } catch {
      return raw;
    }
  },
  {
    name: "classify_team_strengths",
    description:
      "Tag a team with strength/weakness labels. Fetch stats (and optionally pit data) first.",
    schema: z.object({
      teamNumber: z.string(),
      statsData: z.string().describe("Output of get_team_stats"),
      pitData: z.string().optional(),
    }),
  }
);

// ─── Tool: generate_strategy ─────────────────────────────────────────────────

export const generateStrategy = tool(
  async ({ teamNumber, statsData, pitData, mode, allianceContext }) => {
    const prompt = `FRC strategy: playing ${mode === "with" ? "WITH" : "AGAINST"} team ${teamNumber}.

STATS:
${statsData}
${pitData ? `\nPIT:\n${pitData}` : ""}
${allianceContext ? `\nALLIANCE CONTEXT:\n${allianceContext}` : ""}

Sections: Key Observations, ${mode === "with" ? "Complementary Roles" : "Vulnerabilities to Exploit"}, Match Plan (auto/teleop/endgame), Watch-outs, Recommendation.
Be specific and actionable.`;

    const r = await llm.invoke(prompt);
    return typeof r.content === "string" ? r.content : JSON.stringify(r.content);
  },
  {
    name: "generate_strategy",
    description: "Generate strategy for playing with or against a team.",
    schema: z.object({
      teamNumber: z.string(),
      statsData: z.string(),
      pitData: z.string().optional(),
      mode: z.enum(["with", "against"]),
      allianceContext: z.string().optional(),
    }),
  }
);

// ─── Tool: generate_picklist ─────────────────────────────────────────────────

export const generatePicklist = tool(
  async ({ teamsData, criteria, yourTeamContext }) => {
    const prompt = `FRC alliance selection picklist.

CRITERIA: ${criteria}
${yourTeamContext ? `YOUR TEAM: ${yourTeamContext}\n` : ""}
TEAMS:
${teamsData}

Output: ranked table (Rank | Team | Strength | EPA | Notes), rationale, do-not-pick list.`;

    const r = await llm.invoke(prompt);
    return typeof r.content === "string" ? r.content : JSON.stringify(r.content);
  },
  {
    name: "generate_picklist",
    description:
      "Rank teams by desired traits. Fetch stats for all relevant teams first, concatenate, pass as teamsData.",
    schema: z.object({
      teamsData: z.string(),
      criteria: z.string(),
      yourTeamContext: z.string().optional(),
    }),
  }
);

// ─── Tool: fact_check ────────────────────────────────────────────────────────

export const factCheck = tool(
  async ({ claimsText, rawEvidence }) => {
    const prompt = `Fact-check the claims below against the raw data.

CLAIMS:
${claimsText}

DATA:
${rawEvidence}

For each factual claim mark CORRECT, INCORRECT (with right value), or UNVERIFIABLE.
End with VERDICT: PASS | FAIL. If FAIL, provide CORRECTED VERSION.`;

    const r = await llm.invoke(prompt);
    return typeof r.content === "string" ? r.content : JSON.stringify(r.content);
  },
  {
    name: "fact_check",
    description:
      "Verify factual claims in a report or answer against raw scouting data. Run after generating reports or classifications.",
    schema: z.object({
      claimsText: z.string(),
      rawEvidence: z.string(),
    }),
  }
);

// ─── Tool: compare_teams ─────────────────────────────────────────────────────

export const compareTeams = tool(
  async ({ teamsData, comparisonFocus }) => {
    const prompt = `Compare these FRC teams.${comparisonFocus ? ` Focus: ${comparisonFocus}.` : ""}

${teamsData}

Output: comparison table, key differences, best-at per team, recommendation.`;

    const r = await llm.invoke(prompt);
    return typeof r.content === "string" ? r.content : JSON.stringify(r.content);
  },
  {
    name: "compare_teams",
    description: "Compare two or more teams side by side using pre-fetched stats.",
    schema: z.object({
      teamsData: z.string(),
      comparisonFocus: z.string().optional(),
    }),
  }
);

// ─── Exported list ────────────────────────────────────────────────────────────

export const allTools = [
  getTeamStats,
  getTeamNotesSummary,
  getMatchScoutingData,
  getPitScoutingData,
  getAllTeamsAtEvent,
  getTeamEPA,
  generateTeamReport,
  classifyTeamStrengths,
  generateStrategy,
  generatePicklist,
  factCheck,
  compareTeams,
];
