import { useState, useMemo } from "react";
import type { TeamEntry } from "../types";

type SortKey =
  | "teamNumber"
  | "epa"
  | "matchCount"
  | "avgAutoFuelScored"
  | "avgTeleopFuelScored"
  | "avgFuelShuttled"
  | "avgClimbSuccessRate"
  | "avgDefenseRate"
  | "avgDriverRating"
  | "avgBrickRate";

interface Column {
  key: SortKey;
  label: string;
  format: (entry: TeamEntry) => string;
  numeric: boolean;
  rawValue: (entry: TeamEntry) => number | null;
}

const pct = (v: number | null | undefined) =>
  v != null ? `${(v * 100).toFixed(0)}%` : "—";
const dec = (v: number | null | undefined, d = 1) =>
  v != null ? v.toFixed(d) : "—";

const COLUMNS: Column[] = [
  {
    key: "teamNumber",
    label: "Team",
    format: (e) => e.teamNumber,
    numeric: true,
    rawValue: (e) => Number(e.teamNumber),
  },
  {
    key: "epa",
    label: "EPA",
    format: (e) =>
      e.epaLoading ? "…" : e.epa != null ? e.epa.toFixed(1) : "—",
    numeric: true,
    rawValue: (e) => e.epa,
  },
  {
    key: "matchCount",
    label: "Matches",
    format: (e) => e.stats?.matchCount?.toString() ?? "—",
    numeric: true,
    rawValue: (e) => e.stats?.matchCount ?? null,
  },
  {
    key: "avgAutoFuelScored",
    label: "Auto Fuel",
    format: (e) => dec(e.stats?.avgAutoFuelScored),
    numeric: true,
    rawValue: (e) => e.stats?.avgAutoFuelScored ?? null,
  },
  {
    key: "avgTeleopFuelScored",
    label: "TP Fuel",
    format: (e) => dec(e.stats?.avgTeleopFuelScored),
    numeric: true,
    rawValue: (e) => e.stats?.avgTeleopFuelScored ?? null,
  },
  {
    key: "avgFuelShuttled",
    label: "Shuttled",
    format: (e) => dec(e.stats?.avgFuelShuttled),
    numeric: true,
    rawValue: (e) => e.stats?.avgFuelShuttled ?? null,
  },
  {
    key: "avgClimbSuccessRate",
    label: "Climb%",
    format: (e) => pct(e.stats?.avgClimbSuccessRate),
    numeric: true,
    rawValue: (e) => e.stats?.avgClimbSuccessRate ?? null,
  },
  {
    key: "avgDefenseRate",
    label: "Defense%",
    format: (e) => pct(e.stats?.avgDefenseRate),
    numeric: true,
    rawValue: (e) => e.stats?.avgDefenseRate ?? null,
  },
  {
    key: "avgDriverRating",
    label: "Driver",
    format: (e) => dec(e.stats?.avgDriverRating),
    numeric: true,
    rawValue: (e) => e.stats?.avgDriverRating ?? null,
  },
  {
    key: "avgBrickRate",
    label: "Brick%",
    format: (e) => pct(e.stats?.avgBrickRate),
    numeric: true,
    rawValue: (e) => e.stats?.avgBrickRate ?? null,
  },
];

interface Props {
  teams: TeamEntry[];
  loading: boolean;
  epaProgress: number;
  error: string | null;
  onSelectTeam: (teamNumber: string) => void;
}

export function TeamTable({
  teams,
  loading,
  epaProgress,
  error,
  onSelectTeam,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("epa");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? teams.filter((t) => t.teamNumber.includes(q)) : teams;
  }, [teams, search]);

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const av = col.rawValue(a);
      const bv = col.rawValue(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortAsc ? av - bv : bv - av;
    });
  }, [filtered, sortKey, sortAsc]);

  const handleHeaderClick = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const SortIcon = ({ col }: { col: Column }) => {
    if (sortKey !== col.key)
      return <span className="text-slate-600 ml-1">↕</span>;
    return (
      <span className="text-blue-400 ml-1">{sortAsc ? "↑" : "↓"}</span>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-spin">⊙</div>
          <p>Loading teams…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-6 py-4 text-red-400 text-sm max-w-sm text-center">
          <p className="font-semibold mb-1">Failed to load</p>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm">
            {teams.length} teams
          </span>
          {epaProgress < 1 && (
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${epaProgress * 100}%` }}
                />
              </div>
              <span className="text-slate-500 text-xs">loading EPA…</span>
            </div>
          )}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by team #"
          className="bg-surface border border-surface-border rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono w-36"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-surface-card border-b border-surface-border">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleHeaderClick(col.key)}
                  className="px-4 py-2.5 text-left text-slate-400 font-medium cursor-pointer select-none hover:text-white transition-colors whitespace-nowrap"
                >
                  {col.label}
                  <SortIcon col={col} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((team, i) => (
              <tr
                key={team.teamNumber}
                onClick={() => onSelectTeam(team.teamNumber)}
                className={`cursor-pointer border-b border-surface-border/50 hover:bg-blue-900/20 transition-colors ${
                  i % 2 === 0 ? "" : "bg-surface-card/30"
                }`}
              >
                {COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-2.5 ${
                      col.key === "teamNumber"
                        ? "font-mono font-semibold text-white"
                        : col.key === "epa"
                        ? "font-semibold text-blue-300"
                        : col.key === "avgBrickRate"
                        ? "text-red-400"
                        : "text-slate-300"
                    }`}
                  >
                    {col.format(team)}
                  </td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No teams match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
