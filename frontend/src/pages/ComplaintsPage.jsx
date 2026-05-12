import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge, CategoryBadge, PriorityBadge } from "../components/StatusBadge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { MagnifyingGlass, ArrowsDownUp, Trash, PencilSimple, Sparkle, ArrowsClockwise, Clock } from "@phosphor-icons/react";
import { EvidenceRenderer } from "../components/EvidenceRenderer";
import { EditComplaintDialog } from "../components/EditComplaintDialog";

const STATUSES = ["All", "Pending", "In Progress", "Resolved"];
const CATS = ["All", "Women Safety", "Anti Ragging", "Security", "Infrastructure", "Medical Emergency", "Discipline", "Examination", "Others"];
const PRIORITIES = ["All", "Critical", "High", "Medium", "Low", "Unrated"];

const CountdownTimer = ({ createdAt }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const start = new Date(createdAt).getTime();
      const now = new Date().getTime();
      const diff = 10 * 60 * 1000 - (now - start);
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [createdAt]);

  if (timeLeft === "Expired") return <span className="text-rose-500 font-medium">Edit expired</span>;
  return (
    <span className="text-amber-400 flex items-center gap-1 font-medium">
      <Clock size={12} weight="fill" /> Edit ends in {timeLeft}
    </span>
  );
};

export default function ComplaintsPage() {
  const { user } = useAuth();
  const isStaff = user?.role === "staff" || user?.role === "admin";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("All");
  const [category, setCategory] = useState("All");
  const [priority, setPriority] = useState("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(isStaff ? "urgency_score" : "created_at");
  const [order, setOrder] = useState("desc");

  // status update dialog (staff)
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ status: "Pending", response: "" });

  // general edit dialog (student)
  const [editingStudent, setEditingStudent] = useState(null);

  const pollRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/complaints", {
        params: { status, category, search: search || undefined, sort_by: sortBy, order },
      });
      const filtered = priority === "All" ? data : data.filter((d) => (d.priority || "Unrated") === priority);
      setItems(filtered);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  }, [status, category, priority, search, sortBy, order]);

  useEffect(() => {
    const t = setTimeout(fetchData, 250);
    return () => clearTimeout(t);
  }, [fetchData]);

  // Poll while any item is being analyzed (max ~30s)
  useEffect(() => {
    const hasPending = items.some((i) => i.ai_status === "pending");
    if (!hasPending) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (pollRef.current) return;
    let ticks = 0;
    pollRef.current = setInterval(() => {
      ticks += 1;
      fetchData();
      if (ticks > 10) { clearInterval(pollRef.current); pollRef.current = null; }
    }, 3000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const openEdit = (c) => {
    setEditing(c);
    setDraft({ status: c.status, response: c.response || "" });
  };

  const saveEdit = async () => {
    try {
      const { data } = await api.patch(`/complaints/${editing.id}/status`, draft);
      setItems((prev) => prev.map((x) => (x.id === data.id ? data : x)));
      toast.success("Status updated");
      setEditing(null);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const reanalyze = async (c) => {
    try {
      const { data } = await api.post(`/complaints/${c.id}/reanalyze`);
      setItems((p) => p.map((x) => (x.id === data.id ? data : x)));
      toast.success("Re-analyzing with AI…");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const deleteItem = async (c) => {
    if (!window.confirm("Delete this complaint?")) return;
    try {
      await api.delete(`/complaints/${c.id}`);
      setItems((p) => p.filter((x) => x.id !== c.id));
      toast.success("Deleted");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const counts = useMemo(() => ({
    all: items.length,
    critical: items.filter((i) => i.priority === "Critical").length,
    high: items.filter((i) => i.priority === "High").length,
    pending: items.filter((i) => i.status === "Pending").length,
    in_progress: items.filter((i) => i.status === "In Progress").length,
    resolved: items.filter((i) => i.status === "Resolved").length,
  }), [items]);

  return (
    <div className="space-y-6" data-testid="complaints-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="label-caps inline-flex items-center gap-1.5"><Sparkle size={11} weight="fill" className="text-emerald-400" /> AI Triage</div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mt-2">
            {isStaff ? "All complaints" : "Your complaints"}
          </h1>
          <p className="text-slate-400 text-sm mt-2 max-w-2xl">
            Our system prioritizes complaints based on severity to help resolve critical issues faster and more effectively.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="panel p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-4 relative">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder={isStaff ? "Search by title, description, student name…" : "Search your complaints…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="search-input"
            className="bg-slate-950 border-slate-800 pl-9 h-10"
          />
        </div>
        <div className="md:col-span-2">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="bg-slate-950 border-slate-800 h-10" data-testid="filter-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" sideOffset={4} className="bg-slate-900 border-slate-800">
              {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p === "All" ? "All priority" : p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-slate-950 border-slate-800 h-10" data-testid="filter-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s === "All" ? "All status" : s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-slate-950 border-slate-800 h-10" data-testid="filter-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              {CATS.map((c) => <SelectItem key={c} value={c}>{c === "All" ? "All categories" : c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-1">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="bg-slate-950 border-slate-800 h-10" data-testid="sort-field">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="urgency_score">Urgency</SelectItem>
              <SelectItem value="created_at">Date created</SelectItem>
              <SelectItem value="updated_at">Date updated</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-1">
          <Button
            variant="outline"
            className="w-full h-10 border-slate-800 hover:bg-slate-800"
            onClick={() => setOrder(order === "desc" ? "asc" : "desc")}
            data-testid="sort-order"
            title={order === "desc" ? "Descending" : "Ascending"}
          >
            <ArrowsDownUp size={16} className={order === "desc" ? "" : "rotate-180"} />
          </Button>
        </div>
      </div>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-2 text-xs font-mono-c">
        <span className="px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700 text-slate-300">All: {counts.all}</span>
        <span className="px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300">Critical: {counts.critical}</span>
        <span className="px-2.5 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-300">High: {counts.high}</span>
        <span className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300">Pending: {counts.pending}</span>
        <span className="px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-300">In Progress: {counts.in_progress}</span>
        <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">Resolved: {counts.resolved}</span>
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto scrollbar-slim">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="px-5 py-3 font-medium w-[36%]">Title & AI insight</th>
                <th className="px-5 py-3 font-medium">Priority</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Status</th>
                {isStaff && <th className="px-5 py-3 font-medium">Submitted by</th>}
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={isStaff ? 7 : 6} className="px-5 py-10 text-center text-slate-500">Loading…</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={isStaff ? 7 : 6} className="px-5 py-12 text-center text-slate-500">No complaints found.</td></tr>
              )}
              {!loading && items.map((c) => (
                // Priority left border + subtle hover/shadow for improved clarity
                <tr
                  key={c.id}
                  className={`border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors ${
                    (c.priority === 'Critical' && 'border-l-4 border-rose-500') ||
                    (c.priority === 'High' && 'border-l-4 border-orange-500') ||
                    (c.priority === 'Medium' && 'border-l-4 border-amber-500') ||
                    (c.priority === 'Low' && 'border-l-4 border-emerald-500') ||
                    'border-l-4 border-slate-700'
                  }`} data-testid={`row-${c.id}`}>
                  <td className="px-5 py-4 max-w-md">
                    <div className="font-medium text-slate-100 truncate">{c.title}</div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-1">{c.description}</div>
                    {c.ai_status === "done" && c.ai_reasoning && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-emerald-300/80">
                        <Sparkle size={11} weight="fill" className="text-emerald-400 mt-0.5 shrink-0" />
                        <span className="line-clamp-2"><span className="text-slate-500">AI:</span> {c.ai_reasoning}</span>
                      </div>
                    )}
                    <EvidenceRenderer attachments={c.attachments} />
                    {c.ai_tags?.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {c.ai_tags.slice(0, 4).map((t) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">{t}</span>
                        ))}
                      </div>
                    )}
                    {c.response && (
                      <div className="text-xs mt-2 text-sky-300/80">
                        <span className="text-slate-500">Response: </span>{c.response}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <PriorityBadge priority={c.priority} score={c.urgency_score} status={c.ai_status} />
                  </td>
                  <td className="px-5 py-4"><CategoryBadge category={c.category} /></td>
                  <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                  {isStaff && (
                    <td className="px-5 py-4">
                      <div className="text-slate-200">{c.user_name}</div>
                      <div className="text-xs text-slate-500">{c.user_email}</div>
                    </td>
                  )}
                  <td className="px-5 py-4 text-slate-400 font-mono-c text-xs whitespace-nowrap">
                    {new Date(c.created_at).toLocaleDateString()} · {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {isStaff && (
                        <>
                          <Button size="sm" variant="outline"
                            className="border-slate-700 hover:bg-slate-800"
                            onClick={() => openEdit(c)}
                            data-testid={`edit-status-${c.id}`}>
                            <PencilSimple size={14} className="mr-1" /> Update
                          </Button>
                          <Button size="sm" variant="ghost"
                            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                            onClick={() => reanalyze(c)}
                            title="Re-analyze with AI"
                            data-testid={`reanalyze-${c.id}`}>
                            <ArrowsClockwise size={14} />
                          </Button>
                        </>
                      )}
                      {!isStaff && user?.id === c.user_id && c.status === "Pending" && (
                        <div className="flex flex-col items-end gap-1.5 mr-2">
                          <CountdownTimer createdAt={c.created_at} />
                          {new Date().getTime() - new Date(c.created_at).getTime() < 10 * 60 * 1000 && (
                            <Button size="sm" variant="outline"
                              className="border-slate-700 hover:bg-slate-800 h-8"
                              onClick={() => setEditingStudent(c)}
                              data-testid={`edit-student-${c.id}`}>
                              <PencilSimple size={14} className="mr-1" /> Edit
                            </Button>
                          )}
                        </div>
                      )}
                      {(user?.role === "admin" || (user?.role === "student" && c.status === "Pending" && c.user_id === user?.id)) && (
                        <Button size="sm" variant="ghost"
                          onClick={() => deleteItem(c)}
                          data-testid={`delete-${c.id}`}
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
                          <Trash size={14} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg" data-testid="edit-status-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Update complaint status</DialogTitle>
            <DialogDescription className="text-slate-400">
              {editing?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Status</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                <SelectTrigger className="bg-slate-950 border-slate-800" data-testid="edit-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" sideOffset={4} className="bg-slate-900 border-slate-800">
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Response (optional)</Label>
              <Textarea
                rows={4}
                value={draft.response}
                onChange={(e) => setDraft({ ...draft, response: e.target.value })}
                className="bg-slate-950 border-slate-800 resize-none"
                placeholder="Add a note for the student…"
                data-testid="edit-response-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-700" onClick={() => setEditing(null)}>Cancel</Button>
            <Button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950" onClick={saveEdit} data-testid="save-status-btn">
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditComplaintDialog 
        complaint={editingStudent}
        open={!!editingStudent}
        onOpenChange={(o) => !o && setEditingStudent(null)}
        onUpdated={(updated) => {
          setItems(p => p.map(x => x.id === updated.id ? updated : x));
        }}
      />
    </div>
  );
}
