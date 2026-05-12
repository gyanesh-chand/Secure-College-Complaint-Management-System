import { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { Trash, ShieldStar, GraduationCap, UserGear } from "@phosphor-icons/react";

const ROLE_ICONS = { admin: ShieldStar, staff: UserGear, student: GraduationCap };

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const setRole = async (uid, role) => {
    try {
      const { data } = await api.patch(`/users/${uid}/role`, { role });
      setUsers((p) => p.map((u) => (u.id === uid ? data : u)));
      toast.success("Role updated");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`Delete user ${u.email}?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      setUsers((p) => p.filter((x) => x.id !== u.id));
      toast.success("User deleted");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-users-page">
      <div>
        <div className="label-caps">Administration</div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mt-2">Manage users</h1>
        <p className="text-slate-400 text-sm mt-2">Update roles or remove accounts.</p>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto scrollbar-slim">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Loading…</td></tr>}
              {!loading && users.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">No users found.</td></tr>
              )}
              {!loading && users.map((u) => {
                const Icon = ROLE_ICONS[u.role] || GraduationCap;
                const isMe = u.id === me?.id;
                return (
                  <tr key={u.id} className="border-b border-slate-800/60 hover:bg-slate-800/30" data-testid={`user-row-${u.id}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                          <Icon size={16} weight="duotone" className="text-emerald-400" />
                        </div>
                        <span className="text-slate-100">{u.name}</span>
                        {isMe && <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">you</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{u.email}</td>
                    <td className="px-5 py-4">
                      <Select value={u.role} onValueChange={(v) => setRole(u.id, v)} disabled={isMe}>
                        <SelectTrigger className="w-32 bg-slate-950 border-slate-800 h-9" data-testid={`role-select-${u.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800">
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-4 text-slate-400 font-mono-c text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button size="sm" variant="ghost" disabled={isMe}
                        onClick={() => deleteUser(u)}
                        data-testid={`delete-user-${u.id}`}
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
                        <Trash size={14} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
