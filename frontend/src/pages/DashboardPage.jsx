import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge, CategoryBadge, PriorityBadge } from "../components/StatusBadge";
import { EvidenceRenderer } from "../components/EvidenceRenderer";
import { Button } from "../components/ui/button";
import {
  ChartBar, ClockCountdown, Spinner, CheckCircle, FilePlus, ArrowRight, Sparkle,
} from "@phosphor-icons/react";

const StatCard = ({ label, value, Icon, accent, testid }) => (
  <div className="panel hover-lift p-5" data-testid={testid}>
    <div className="flex items-start justify-between">
      <div className="label-caps">{label}</div>
      <div className={`w-9 h-9 rounded-md flex items-center justify-center ${accent}`}>
        <Icon size={18} weight="duotone" />
      </div>
    </div>
    <div className="mt-4 font-display text-3xl md:text-4xl font-semibold tracking-tight">{value}</div>
  </div>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, c] = await Promise.all([
          api.get("/complaints/stats"),
          api.get("/complaints", { params: { sort_by: "urgency_score", order: "desc" } }),
        ]);
        setStats(s.data);
        setRecent(c.data.slice(0, 5));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="label-caps">Overview</div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mt-2">
            {user?.role === "student" ? "Your complaint snapshot" : "Campus complaint snapshot"}
          </h1>
          <p className="text-slate-400 text-sm mt-2 max-w-xl">
            {user?.role === "student"
              ? "Track the status of your submissions and file new ones with a click."
              : "Monitor incoming issues, prioritise responses and resolve faster."}
          </p>
        </div>
        {user?.role === "student" && (
          <Link to="/submit">
            <Button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium" data-testid="dash-new-complaint">
              <FilePlus size={18} className="mr-1.5" /> New Complaint
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard label="Total" value={loading ? "—" : stats?.total ?? 0}
          Icon={ChartBar} accent="bg-slate-800 text-slate-300" testid="stat-total" />
        <StatCard label="Pending" value={loading ? "—" : stats?.pending ?? 0}
          Icon={ClockCountdown} accent="bg-amber-500/10 text-amber-400" testid="stat-pending" />
        <StatCard label="In Progress" value={loading ? "—" : stats?.in_progress ?? 0}
          Icon={Spinner} accent="bg-sky-500/10 text-sky-400" testid="stat-in-progress" />
        <StatCard label="Resolved" value={loading ? "—" : stats?.resolved ?? 0}
          Icon={CheckCircle} accent="bg-emerald-500/10 text-emerald-400" testid="stat-resolved" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 panel overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <div>
              <div className="label-caps">Recent activity</div>
              <h2 className="font-display text-lg font-medium mt-1">Latest complaints</h2>
            </div>
            <Link to="/complaints" className="text-sm text-emerald-400 hover:text-emerald-300 inline-flex items-center" data-testid="view-all-complaints">
              View all <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-slate-800">
            {loading && (
              <div className="p-6 text-sm text-slate-500">Loading…</div>
            )}
            {!loading && recent.length === 0 && (
              <div className="p-8 text-center">
                <div className="text-slate-400 text-sm">No complaints yet.</div>
                {user?.role === "student" && (
                  <Link to="/submit"><Button variant="outline" className="mt-4 border-slate-700">File your first complaint</Button></Link>
                )}
              </div>
            )}
            {recent.map((c) => (
              <div key={c.id} className="px-5 py-4 hover:bg-slate-800/30 transition-colors" data-testid={`recent-row-${c.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-100 truncate">{c.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {user?.role !== "student" && <span>{c.user_name} • </span>}
                      {new Date(c.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <PriorityBadge priority={c.priority} score={c.urgency_score} status={c.ai_status} />
                    <CategoryBadge category={c.category} />
                    <StatusBadge status={c.status} />
                  </div>
                </div>
                <EvidenceRenderer attachments={c.attachments} />
                {c.ai_status === "done" && c.ai_reasoning && (
                  <div className="mt-2 text-xs text-emerald-300/70 flex items-start gap-1.5">
                    <Sparkle size={11} weight="fill" className="text-emerald-400 mt-0.5 shrink-0" />
                    <span className="line-clamp-1">{c.ai_reasoning}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-5">
          <div className="label-caps">By category</div>
          <h3 className="font-display text-lg font-medium mt-1">Distribution</h3>
          <div className="mt-5 space-y-3">
            {(loading || !stats) && <div className="text-sm text-slate-500">Loading…</div>}
            {!loading && stats && Object.keys(stats.by_category || {}).length === 0 && (
              <div className="text-sm text-slate-500">No data yet</div>
            )}
            {!loading && stats && Object.entries(stats.by_category || {}).map(([cat, count]) => {
              const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={cat} data-testid={`cat-row-${cat}`}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>{cat}</span>
                    <span className="font-mono-c">{count} • {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
