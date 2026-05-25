import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  House, FilePlus, ListChecks, UserCircle, SignOut, Users,
  ShieldStar, List as ListIcon, X, GraduationCap,
} from "@phosphor-icons/react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import ContactButton from "./ContactButton";
const logo = "/logo.jpg";

const baseNav = [
  { to: "/dashboard", label: "Dashboard", icon: House, testid: "nav-dashboard" },
  { to: "/complaints", label: "View Complaints", icon: ListChecks, testid: "nav-complaints" },
  { to: "/profile", label: "Profile", icon: UserCircle, testid: "nav-profile" },
];

const studentExtra = [
  { to: "/submit", label: "Submit Complaint", icon: FilePlus, testid: "nav-submit" },
];

const adminExtra = [
  { to: "/admin/users", label: "Manage Users", icon: Users, testid: "nav-users" },
];

function roleBadge(role) {
  const map = {
    admin: { label: "Admin", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", Icon: ShieldStar },
    staff: { label: "Staff", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30", Icon: ShieldStar },
    student: { label: "Student", cls: "bg-sky-500/10 text-sky-400 border-sky-500/30", Icon: GraduationCap },
  };
  return map[role] || map.student;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    baseNav[0],
    ...(user?.role === "student" ? studentExtra : []),
    baseNav[1],
    ...(user?.role === "admin" ? adminExtra : []),
    baseNav[2],
  ];

  const rb = roleBadge(user?.role);
  const initials = (user?.name || "U").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();

  const handleLogout = () => { logout(); navigate("/login"); };

  const SidebarInner = (
    <div className="h-full flex flex-col">
      <div className="px-6 py-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <img src={logo} alt="College Logo" className="h-9 w-auto object-contain" />
          <div>
            <div className="font-display font-semibold text-slate-50 leading-none">CampusDesk</div>
            <div className="label-caps mt-1 text-[10px]">Complaint Suite</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-slim">
        {links.map(({ to, label, icon: Icon, testid }) => (
          <NavLink
            key={to}
            to={to}
            data-testid={testid}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 ${
                isActive
                  ? "bg-slate-800/80 text-slate-50 border border-slate-700"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 border border-transparent"
              }`
            }
          >
            <Icon size={18} weight="duotone" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-slate-800">
        <button
          onClick={handleLogout}
          data-testid="logout-btn"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
        >
          <SignOut size={18} weight="duotone" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-slate-800 bg-slate-900/40 fixed inset-y-0 left-0">
        {SidebarInner}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-800">
            <div className="flex justify-end p-2">
              <button onClick={() => setMobileOpen(false)} className="p-2 text-slate-400" data-testid="close-mobile-nav">
                <X size={20} />
              </button>
            </div>
            {SidebarInner}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 md:px-8 h-16">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 text-slate-400 hover:text-slate-100"
                onClick={() => setMobileOpen(true)}
                data-testid="open-mobile-nav"
              >
                <ListIcon size={22} />
              </button>
              <div className="flex flex-col justify-center">
                <div className="label-caps leading-none">College Portal</div>
                <div className="font-display text-sm sm:text-base text-slate-100 mt-1">Welcome back, {user?.name?.split(" ")[0]}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${rb.cls}`}
                data-testid="user-role-badge"
              >
                <rb.Icon size={14} weight="duotone" />
                {rb.label}
              </span>
              <div className="flex items-center gap-2">
                <Avatar className="w-9 h-9 border border-slate-700">
                  <AvatarFallback className="bg-emerald-500/10 text-emerald-400 text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <div className="text-sm text-slate-100 leading-none" data-testid="header-user-name">{user?.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{user?.email}</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                data-testid="header-logout-btn"
                className="hidden md:inline-flex text-slate-400 hover:text-rose-300 hover:bg-rose-500/10"
              >
                <SignOut size={16} className="mr-1.5" /> Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 fade-in">
          <Outlet />
        </main>
        <ContactButton />
      </div>
    </div>
  );
}
