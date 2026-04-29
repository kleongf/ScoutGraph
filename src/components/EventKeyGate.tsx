import { useState, type FormEvent } from "react";

const EXAMPLE_KEYS = ["2026caven", "2026cagl", "2026casj", "2026nccmp"];

interface Props {
  onConfirm: (eventKey: string) => void;
}

export function EventKeyGate({ onConfirm }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
      setError("Please enter an event key.");
      return;
    }
    // Basic format check: 4-digit year followed by letters
    if (!/^\d{4}[a-z]+$/.test(trimmed)) {
      setError("Event key should look like 2026caven (year + letters).");
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <div className="fixed inset-0 bg-surface flex items-center justify-center p-4">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-lg shadow-blue-600/30">
            SG
          </div>
          <h1 className="text-white font-semibold text-2xl tracking-tight">
            ScoutGraph
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            FRC Scouting Intelligence
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 shadow-xl">
          <h2 className="text-white font-semibold text-base mb-1">
            Select your event
          </h2>
          <p className="text-slate-400 text-sm mb-5">
            Enter the TBA event key for the competition you are scouting. This
            will be saved for future sessions.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="event-key-input"
                className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider"
              >
                Event Key
              </label>
              <input
                id="event-key-input"
                type="text"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError("");
                }}
                placeholder="e.g. 2026caven"
                autoFocus
                spellCheck={false}
                className="w-full bg-surface border border-surface-border rounded-xl px-4 py-3 text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {error && (
                <p className="mt-1.5 text-red-400 text-xs">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              Open Dashboard
            </button>
          </form>

          {/* Example keys */}
          <div className="mt-5 pt-4 border-t border-surface-border">
            <p className="text-slate-500 text-xs mb-2">Examples</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setValue(k)}
                  className="px-2.5 py-1 text-xs font-mono text-slate-400 bg-surface rounded-lg border border-surface-border hover:border-blue-500 hover:text-blue-300 transition-colors"
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          You can change the event at any time from the header.
        </p>
      </div>
    </div>
  );
}
