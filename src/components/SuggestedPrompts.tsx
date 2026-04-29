const PROMPTS = [
  "Generate a report on team 254",
  "What are the top 5 teams by EPA?",
  "Create a picklist for a team that needs a good scorer and a defender",
  "What are team 6036's strengths and weaknesses?",
  "Suggest a strategy for playing against the top alliance",
  "Which teams have swerve drive and can shoot on the move?",
];

interface Props {
  onSelect: (prompt: string) => void;
}

export function SuggestedPrompts({ onSelect }: Props) {
  return (
    <div className="px-4 pb-4">
      <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2.5">
        Suggested
      </p>
      <div className="flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onSelect(p)}
            className="px-3 py-1.5 text-xs text-slate-300 bg-surface-card border border-surface-border rounded-full hover:border-blue-500 hover:text-blue-300 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
