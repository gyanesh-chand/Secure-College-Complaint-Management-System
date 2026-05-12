const MAP = {
  Pending:        "bg-amber-500/10 text-amber-300 border-amber-500/30",
  "In Progress":  "bg-sky-500/10 text-sky-300 border-sky-500/30",
  Resolved:       "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
};

const CAT_MAP = {
  "Women Safety":        "bg-rose-500/15 text-rose-300 border-rose-500/30",
  "Anti Ragging":       "bg-orange-500/15 text-orange-300 border-orange-500/30",
  "Security":           "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "Infrastructure":     "bg-sky-500/15 text-sky-300 border-sky-500/30",
  "Medical Emergency":  "bg-red-500/15 text-red-300 border-red-500/30",
  "Discipline":         "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  "Examination":        "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "Others":             "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

export function StatusBadge({ status }) {
  return (
    <span
      data-testid={`status-badge-${status.replace(/\s/g, "-").toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium ${MAP[status] || MAP.Pending}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
}

export function CategoryBadge({ category }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md border text-xs font-medium ${CAT_MAP[category] || CAT_MAP.IT}`}>
      {category}
    </span>
  );
}

const PRIORITY_MAP = {
  Critical: { cls: "bg-rose-500/15 text-rose-300 border-rose-500/40 ring-1 ring-rose-500/20", dot: "bg-rose-400" },
  High:     { cls: "bg-orange-500/15 text-orange-300 border-orange-500/40", dot: "bg-orange-400" },
  Medium:   { cls: "bg-amber-500/10 text-amber-300 border-amber-500/30", dot: "bg-amber-400" },
  Low:      { cls: "bg-slate-700/30 text-slate-300 border-slate-600/40", dot: "bg-slate-400" },
  Unrated:  { cls: "bg-slate-800/60 text-slate-500 border-slate-700/60", dot: "bg-slate-500" },
};

export function PriorityBadge({ priority, score, status }) {
  const isPending = status === "pending";
  if (isPending) {
    return (
      <span data-testid="priority-pending" className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-slate-700 bg-slate-800/60 text-xs font-medium text-slate-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Analyzing…
      </span>
    );
  }
  const cfg = PRIORITY_MAP[priority] || PRIORITY_MAP.Unrated;
  return (
    <span
      data-testid={`priority-badge-${(priority || "unrated").toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium ${cfg.cls}`}
      title={typeof score === "number" ? `Urgency ${score}/10` : undefined}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {priority || "Unrated"}
      {typeof score === "number" && score > 0 && (
        <span className="font-mono-c text-[10px] opacity-70">{score}/10</span>
      )}
    </span>
  );
}
