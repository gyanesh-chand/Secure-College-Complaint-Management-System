import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, formatApiError } from "../lib/api";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { PasswordInput } from "../components/ui/password-input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { 
  ShieldStar, GraduationCap, Envelope, Calendar, 
  PencilSimple, Trash, LockKey, Check, X 
} from "@phosphor-icons/react";

export default function ProfilePage() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  
  // State for Edit Name
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || "");
  const [isSavingName, setIsSavingName] = useState(false);

  // State for Change Password
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwData, setPwData] = useState({ current: "", new: "", confirm: "" });
  const [isChangingPw, setIsChangingPw] = useState(false);

  // State for Delete Account
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!user) return null;
  const initials = user.name.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();

  const handleUpdateName = async () => {
    if (!newName.trim()) return toast.error("Name cannot be empty");
    setIsSavingName(true);
    try {
      await api.patch("/auth/me", { name: newName });
      await refresh();
      setIsEditingName(false);
      toast.success("Username updated");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwData.new !== pwData.confirm) return toast.error("Passwords do not match");
    if (pwData.new.length < 6) return toast.error("New password must be at least 6 characters");
    
    setIsChangingPw(true);
    try {
      await api.post("/auth/change-password", {
        current_password: pwData.current,
        new_password: pwData.new
      });
      toast.success("Password changed successfully");
      setPwModalOpen(false);
      setPwData({ current: "", new: "", confirm: "" });
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await api.delete("/auth/me");
      toast.success("Account deleted");
      logout();
      navigate("/login");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
      setIsDeleting(false);
    }
  };

  const Item = ({ Icon, label, value, testid }) => (
    <div className="flex items-start gap-3 py-3 border-b border-slate-800 last:border-0" data-testid={testid}>
      <div className="w-8 h-8 rounded-md bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
        <Icon size={16} weight="duotone" />
      </div>
      <div className="min-w-0">
        <div className="label-caps">{label}</div>
        <div className="text-sm text-slate-100 mt-1 break-all">{value}</div>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto pb-20" data-testid="profile-page">
      <div className="label-caps">Profile</div>
      <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mt-2 text-slate-50">Your account</h1>
      <p className="text-slate-400 text-sm mt-2">Account details associated with your CampusDesk login.</p>

      <div className="mt-8 panel p-6 md:p-8 bg-slate-900/40 border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-slate-800">
          <Avatar className="w-20 h-20 border border-slate-700">
            <AvatarFallback className="bg-emerald-500/10 text-emerald-400 text-2xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-2 max-w-sm">
                <Input 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-slate-100 h-10"
                  placeholder="New username"
                />
                <Button size="icon" variant="ghost" onClick={handleUpdateName} disabled={isSavingName} className="text-emerald-400 hover:bg-emerald-500/10">
                  <Check size={18} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setIsEditingName(false); setNewName(user.name); }} className="text-slate-400 hover:bg-slate-800">
                  <X size={18} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="font-display text-2xl font-semibold text-slate-50">{user.name}</div>
                <button 
                  onClick={() => setIsEditingName(true)}
                  className="p-1.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-all"
                  title="Edit Username"
                >
                  <PencilSimple size={18} weight="duotone" />
                </button>
              </div>
            )}
            <div className="text-slate-400 text-sm">{user.email}</div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 font-medium">
              {user.role === "student" ? <GraduationCap size={14} weight="duotone" /> : <ShieldStar size={14} weight="duotone" />}
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </div>
          </div>
        </div>

        <div className="mt-2">
          <Item Icon={Envelope} label="Email Address" value={user.email} testid="profile-email" />
          <Item Icon={ShieldStar} label="Account Role" value={user.role} testid="profile-role" />
          <Item Icon={Calendar} label="Member Since" value={new Date(user.created_at).toLocaleString()} testid="profile-created" />
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800">
          <div className="label-caps mb-4">Account Management</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="justify-start border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              onClick={() => setPwModalOpen(true)}
            >
              <LockKey size={18} weight="duotone" className="mr-2.5 text-sky-400" />
              Change Password
            </Button>
            <Button 
              variant="outline" 
              className="justify-start border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
              onClick={() => setDeleteModalOpen(true)}
            >
              <Trash size={18} weight="duotone" className="mr-2.5" />
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <Dialog open={pwModalOpen} onOpenChange={setPwModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-semibold text-slate-50">Change Password</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update your account password to stay secure.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-300">Current Password</Label>
              <PasswordInput 
                required
                className="bg-slate-950 border-slate-800 text-slate-100 focus:ring-sky-500/20"
                value={pwData.current}
                onChange={e => setPwData({...pwData, current: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-300">New Password</Label>
              <PasswordInput 
                required
                className="bg-slate-950 border-slate-800 text-slate-100 focus:ring-sky-500/20"
                value={pwData.new}
                onChange={e => setPwData({...pwData, new: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-300">Confirm New Password</Label>
              <PasswordInput 
                required
                className="bg-slate-950 border-slate-800 text-slate-100 focus:ring-sky-500/20"
                value={pwData.confirm}
                onChange={e => setPwData({...pwData, confirm: e.target.value})}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isChangingPw} className="w-full bg-sky-600 hover:bg-sky-500">
                {isChangingPw ? "Updating..." : "Update Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Account Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-semibold text-rose-400">Delete Account</DialogTitle>
            <DialogDescription className="text-slate-400">
              This action is permanent and cannot be undone. All your complaints and personal data will be removed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-300 italic">"Are you sure you want to proceed?"</p>
          </div>
          <DialogFooter className="flex gap-3 pt-4 sm:justify-end">
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting} className="text-slate-400 hover:bg-slate-800 hover:text-slate-100">
              Cancel
            </Button>
            <Button onClick={handleDeleteAccount} disabled={isDeleting} className="bg-rose-600 hover:bg-rose-500">
              {isDeleting ? "Deleting..." : "Yes, Delete My Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
