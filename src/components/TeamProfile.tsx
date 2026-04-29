import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useTeamMatchHistory } from "../hooks/useTeamMatchHistory";
import type { TeamEntry } from "../types";

// ─── Recharts dark theme helpers ──────────────────────────────────────────────

const AXIS = { fill: "#94a3b8", fontSize: 11 };
const GRID = { stroke: "#334155", strokeDasharray: "3 3" };
const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#1e293b",
    border: "1px solid #475569",
    borderRadius: "8px",
    color: "#f1f5f9",
    fontSize: "12px",
  },
  labelStyle: { color: "#94a3b8" },
};

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4">
      <h3 className="text-slate-300 text-sm font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

// ─── Stat badge ───────────────────────────────────────────────────────────────

function StatItem({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-slate-500 text-xs uppercase tracking-wider">
        {label}
      </span>
      <span
        className={`text-xl font-bold ${accent ? "text-blue-300" : "text-white"}`}
      >
        {value}
      </span>
      {sub && <span className="text-slate-500 text-xs">{sub}</span>}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  team: TeamEntry;
  eventKey: string;
  onBack: () => void;
  onAskAgent: (prompt: string) => void;
}

const pct = (v: number | null | undefined) =>
  v != null ? `${(v * 100).toFixed(1)}%` : "—";
const dec = (v: number | null | undefined, d = 1) =>
  v != null ? v.toFixed(d) : "—";

// ─── Component ────────────────────────────────────────────────────────────────

export function TeamProfile({ team, eventKey, onBack, onAskAgent }: Props) {
  const { matches, loading: matchLoading } = useTeamMatchHistory(
    eventKey,
    team.teamNumber
  );

  const s = team.stats;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-5 py-5 space-y-5">
        {/* Header row */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1"
          >
            ← Back
          </button>
          <div className="flex-1 flex items-center gap-4">
            <h1 className="text-white font-bold text-2xl font-mono">
              Team {team.teamNumber}
            </h1>
            {team.epa != null && (
              <span className="px-3 py-1 bg-blue-900/50 border border-blue-700/50 rounded-full text-blue-300 font-semibold text-sm">
                EPA {team.epa.toFixed(1)}
              </span>
            )}
            {team.epaLoading && (
              <span className="text-slate-500 text-sm">Computing EPA…</span>
            )}
          </div>
          <button
            onClick={() =>
              onAskAgent(`Generate a full scouting report for team ${team.teamNumber}`)
            }
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors font-medium"
          >
            Ask agent →
          </button>
        </div>

        {/* Stats overview */}
        {s ? (
          <div className="bg-surface-card border border-surface-border rounded-xl p-5">
            <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">
              Aggregate Stats ({s.matchCount} matches)
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-x-6 gap-y-4">
              <StatItem
                label="Auto Fuel"
                value={dec(s.avgAutoFuelScored)}
                sub="avg per match"
              />
              <StatItem
                label="TP Fuel"
                value={dec(s.avgTeleopFuelScored)}
                sub="avg per match"
              />
              <StatItem
                label="Shuttled"
                value={dec(s.avgFuelShuttled)}
                sub="avg per match"
              />
              <StatItem
                label="Climb%"
                value={pct(s.avgClimbSuccessRate)}
                accent
              />
              <StatItem label="Defense%" value={pct(s.avgDefenseRate)} />
              <StatItem
                label="Driver Rtg"
                value={dec(s.avgDriverRating)}
                sub="out of 10"
              />
              <StatItem label="Brick%" value={pct(s.avgBrickRate)} />
              <StatItem label="Beach%" value={pct(s.avgBeachRate)} />
              {s.avgFuelPreventedOnDefense != null && (
                <StatItem
                  label="Prevented"
                  value={dec(s.avgFuelPreventedOnDefense)}
                  sub="when defending"
                />
              )}
            </div>
          </div>
        ) : (
          <div className="bg-surface-card border border-surface-border rounded-xl p-5 text-slate-500 text-sm">
            No pre-computed stats available for this team.
          </div>
        )}

        {/* Match history charts */}
        {matchLoading ? (
          <div className="text-center text-slate-500 py-8">
            Loading match history…
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            No individual match data found.
          </div>
        ) : (
          <>
            {/* Scoring over matches */}
            <ChartCard title="Fuel Scoring per Match">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={matches}
                  margin={{ top: 4, right: 16, left: -10, bottom: 0 }}
                >
                  <CartesianGrid {...GRID} />
                  <XAxis
                    dataKey="matchNumber"
                    tick={AXIS}
                    label={{
                      value: "Match",
                      position: "insideBottomRight",
                      offset: -4,
                      ...AXIS,
                    }}
                  />
                  <YAxis tick={AXIS} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: "#94a3b8" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="autoFuel"
                    name="Auto Fuel"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#3b82f6" }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="teleopFuel"
                    name="Teleop Fuel"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#10b981" }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="fuelShuttled"
                    name="Shuttled"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#f59e0b" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Climb level per match */}
            <ChartCard title="Climb Level per Match (0 = no attempt)">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={matches}
                  margin={{ top: 4, right: 16, left: -10, bottom: 0 }}
                >
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="matchNumber" tick={AXIS} />
                  <YAxis tick={AXIS} domain={[0, 3]} ticks={[0, 1, 2, 3]} />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(v) =>
                      Number(v) === 0 ? "No climb" : `Level ${v}`
                    }
                  />
                  <Bar dataKey="climbLevel" name="Climb Level" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                  <ReferenceLine y={1} stroke="#475569" strokeDasharray="2 2" />
                  <ReferenceLine y={2} stroke="#475569" strokeDasharray="2 2" />
                  <ReferenceLine y={3} stroke="#475569" strokeDasharray="2 2" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Driver rating + fuel prevented (when defended) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ChartCard title="Driver Rating per Match">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart
                    data={matches}
                    margin={{ top: 4, right: 16, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="matchNumber" tick={AXIS} />
                    <YAxis tick={AXIS} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <ReferenceLine
                      y={s?.avgDriverRating ?? 0}
                      stroke="#f59e0b"
                      strokeDasharray="4 2"
                      label={{ value: "avg", fill: "#f59e0b", fontSize: 10 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="driverRating"
                      name="Rating"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#f59e0b" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Fuel Prevented per Match">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={matches.filter((m) => m.playedDefense)}
                    margin={{ top: 4, right: 16, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="matchNumber" tick={AXIS} />
                    <YAxis tick={AXIS} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar
                      dataKey="fuelPrevented"
                      name="Prevented"
                      fill="#ef4444"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                {matches.filter((m) => m.playedDefense).length === 0 && (
                  <p className="text-slate-500 text-xs text-center mt-2">
                    No defense played in scouted matches.
                  </p>
                )}
              </ChartCard>
            </div>

            {/* Boolean flags table */}
            <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-surface-border">
                <h3 className="text-slate-300 text-sm font-semibold">
                  Match-by-Match Flags
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-surface-border">
                      {["Match", "Defense", "Bricked", "Beached", "Notes"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left text-slate-500 font-medium"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m) => (
                      <tr
                        key={m.matchNumber}
                        className="border-b border-surface-border/40 hover:bg-surface-elevated/20"
                      >
                        <td className="px-3 py-2 font-mono text-slate-300">
                          {m.matchNumber}
                        </td>
                        <td className="px-3 py-2">
                          <Flag active={m.playedDefense} color="blue" />
                        </td>
                        <td className="px-3 py-2">
                          <Flag active={m.bricked} color="red" />
                        </td>
                        <td className="px-3 py-2">
                          <Flag active={m.beached} color="amber" />
                        </td>
                        <td className="px-3 py-2 text-slate-400 max-w-xs truncate">
                          {m.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Flag({
  active,
  color,
}: {
  active: boolean;
  color: "blue" | "red" | "amber";
}) {
  const colors = {
    blue: "bg-blue-500",
    red: "bg-red-500",
    amber: "bg-amber-500",
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${active ? colors[color] : "bg-slate-700"}`}
    />
  );
}
