import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { usePicklists } from "../hooks/usePicklists";
import type { TeamEntry } from "../types";

interface Props {
  teams: TeamEntry[];
  eventKey: string;
}

export function PicklistTab({ teams, eventKey }: Props) {
  const [orderedTeams, setOrderedTeams] = useState<string[]>([]);
  const [listName, setListName] = useState("");
  const { lists, saving, loadLists, saveList } = usePicklists(eventKey);

  // Seed order from teams sorted by EPA desc when teams first load
  useEffect(() => {
    if (teams.length === 0) return;
    setOrderedTeams((prev) => {
      if (prev.length > 0) return prev; // don't reset if already set
      return [...teams]
        .sort((a, b) => (b.epa ?? 0) - (a.epa ?? 0))
        .map((t) => t.teamNumber);
    });
  }, [teams]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(orderedTeams);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setOrderedTeams(items);
  };

  const handleLoad = (list: { name: string; teams: string[] }) => {
    setListName(list.name);
    setOrderedTeams(list.teams);
  };

  const teamMap = Object.fromEntries(teams.map((t) => [t.teamNumber, t]));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-5 py-5 space-y-4">

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="List name…"
            className="bg-surface border border-surface-border rounded-md px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44 font-mono"
          />
          <button
            onClick={() => saveList(listName, orderedTeams)}
            disabled={!listName.trim() || saving}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-lg transition-colors font-medium"
          >
            {saving ? "Saving…" : "Save"}
          </button>

          {lists.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500 text-xs">Load:</span>
              {lists.map((l) => (
                <button
                  key={l.id}
                  onClick={() => handleLoad(l)}
                  className="px-2.5 py-1 bg-surface-elevated hover:bg-surface-card border border-surface-border text-slate-300 text-xs rounded-md transition-colors"
                >
                  {l.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Draggable list */}
        {orderedTeams.length === 0 ? (
          <div className="text-center text-slate-500 py-16 text-sm">
            Load event data from the Dashboard tab first.
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="picklist">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-1"
                >
                  {orderedTeams.map((tn, index) => {
                    const team: TeamEntry | undefined = teamMap[tn];
                    const s = team?.stats;
                    return (
                      <Draggable key={tn} draggableId={tn} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center gap-4 px-4 py-3 rounded-lg border transition-colors ${
                              snapshot.isDragging
                                ? "bg-blue-900/40 border-blue-600/50 shadow-lg"
                                : "bg-surface-card border-surface-border hover:bg-surface-elevated"
                            }`}
                          >
                            {/* Drag handle */}
                            <div
                              {...provided.dragHandleProps}
                              className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing select-none text-lg leading-none"
                            >
                              ⠿
                            </div>

                            {/* Rank */}
                            <span className="text-slate-500 text-sm font-mono w-6 text-right shrink-0">
                              {index + 1}
                            </span>

                            {/* Team number */}
                            <span className="text-white font-bold font-mono text-sm w-14 shrink-0">
                              {tn}
                            </span>

                            {/* EPA badge */}
                            {team?.epaLoading ? (
                              <span className="text-slate-600 text-xs">EPA…</span>
                            ) : team?.epa != null ? (
                              <span className="px-2 py-0.5 bg-blue-900/40 border border-blue-700/40 rounded text-blue-300 text-xs font-mono">
                                EPA {team.epa.toFixed(1)}
                              </span>
                            ) : null}

                            {/* Key stats */}
                            {s && (
                              <span className="ml-auto text-slate-400 text-xs tabular-nums">
                                Auto {s.avgAutoFuelScored?.toFixed(1) ?? "—"} &nbsp;|&nbsp;
                                TP {s.avgTeleopFuelScored?.toFixed(1) ?? "—"} &nbsp;|&nbsp;
                                Climb {s.avgClimbSuccessRate != null ? `${(s.avgClimbSuccessRate * 100).toFixed(0)}%` : "—"}
                              </span>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}
