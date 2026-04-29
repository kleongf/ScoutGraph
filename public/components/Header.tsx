export type AppView = "dashboard" | "chat" | "picklist";

interface HeaderProps {
  eventKey: string;
  onEventKeyChange: (key: string) => void;
  onLoadData: (key: string) => void;
  view: AppView;
  onViewChange: (v: AppView) => void;
}

export function Header({
  eventKey,
  onEventKeyChange,
  onLoadData,
  view,
  onViewChange,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-5 py-2.5 bg-surface-card border-b border-surface-border shrink-0">
      {/* Left: logo + tabs */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2.5">
          <img src="/src/assets/6036.png" alt="6036" className="w-7 h-7 object-contain" />
          <span className="text-white font-semibold text-sm tracking-tight hidden sm:block">
            ScoutGraph
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {(["dashboard", "picklist", "chat"] as AppView[]).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                view === v
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-surface-elevated"
              }`}
            >
              {v === "dashboard" ? "Dashboard" : v === "picklist" ? "Picklist" : "Chat"}
            </button>
          ))}
        </nav>
      </div>

      {/* Right: event selector + live indicator */}
      <div className="flex items-center gap-3">
        <label
          className="text-slate-500 text-xs font-medium hidden sm:block"
          htmlFor="event-key"
        >
          Event
        </label>
        <input
          id="event-key"
          type="text"
          value={eventKey}
          onChange={(e) => onEventKeyChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onLoadData(eventKey)}
          placeholder="e.g. 2026caven"
          className="bg-surface border border-surface-border rounded-md px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-32 font-mono"
          spellCheck={false}
        />
        <button
          onClick={() => onLoadData(eventKey)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md transition-colors"
        >
          Load
        </button>
      </div>
    </header>
  );
}
