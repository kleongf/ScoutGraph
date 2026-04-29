import { useState } from "react";

interface TeamEntry {
  teamNumber: string;
  epa?: number;
  tags?: string[];
}

interface Props {
  eventKey: string;
  onSelectTeam: (prompt: string) => void;
}

export function TeamPanel({ eventKey, onSelectTeam }: Props) {
  const [search, setSearch] = useState("");
  const [teams] = useState<TeamEntry[]>([]);
  const [loading] = useState(false);

  const filtered = teams.filter((t) => t.teamNumber.includes(search.trim()));

  return (
    <aside className="flex flex-col border-r border-surface-border bg-surface-card/30 w-64 shrink-0">
      <div className="px-4 py-3 border-b border-surface-border">
        <h3 className="text-white font-semibold text-sm mb-2">Teams</h3>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team #…"
          className="w-full bg-surface border border-surface-border rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8 text-slate-500 text-sm">
            Loading…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="px-4 py-6 text-center">
            <p className="text-slate-500 text-xs leading-relaxed">
              Teams will appear here once scouting data is loaded for{" "}
              <span className="font-mono text-blue-400">{eventKey}</span>.
            </p>
            <p className="text-slate-600 text-xs mt-2">
              Ask the agent to fetch team data.
            </p>
          </div>
        )}

        {filtered.map((team) => (
          <button
            key={team.teamNumber}
            onClick={() =>
              onSelectTeam(`Generate a report on team ${team.teamNumber}`)
            }
            className="w-full text-left px-4 py-3 border-b border-surface-border/50 hover:bg-surface-elevated/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold font-mono text-sm">
                {team.teamNumber}
              </span>
              {team.epa != null && (
                <span className="text-xs text-blue-400 font-medium">
                  EPA {team.epa.toFixed(1)}
                </span>
              )}
            </div>
            {team.tags && team.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {team.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-blue-900/50 text-blue-300 border border-blue-800/50"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 py-2 border-t border-surface-border text-center">
        <button
          onClick={() =>
            onSelectTeam(
              "What teams have scouting data at this event? List them with their EPAs."
            )
          }
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Load all teams via agent →
        </button>
      </div>
    </aside>
  );
}
