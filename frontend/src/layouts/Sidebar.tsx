import { NavLink, useLocation, useMatch } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck, LayoutDashboard, FolderKanban,
  Users, ScrollText, LogOut, ChevronRight, Shield, Settings,
  LayoutGrid, List, Layers, ParkingCircle, Zap,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useLogout } from "@/hooks/useAuth";
import { initials } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";

const NAV = [
  { to: "/",         icon: LayoutDashboard, label: "Dashboard" },
  { to: "/projects", icon: FolderKanban,    label: "Projects"  },
];

const ADMIN_NAV = [
  { to: "/users", icon: Users,      label: "Users"     },
  { to: "/audit", icon: ScrollText, label: "Audit Log" },
];

const SETTINGS_NAV = [
  { to: "/settings/roles",  icon: Shield,   label: "Roles"   },
  { to: "/settings/system", icon: Settings, label: "System"  },
];

export default function Sidebar() {
  const { user, isAdmin } = useAuthStore();
  const logout = useLogout();
  const location = useLocation();
  const projectMatch = useMatch("/projects/:id/*");
  const projectId = projectMatch?.params?.id;
  const { app_name, app_logo_url } = useSettingsStore(s => s.settings);

  return (
    <aside className="flex flex-col w-60 h-screen flex-shrink-0 border-r border-indigo-100 bg-white shadow-[1px_0_0_0_rgba(99,102,241,0.06)] sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-indigo-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-400/30 overflow-hidden">
          {app_logo_url
            ? <img src={app_logo_url} alt={app_name} className="h-full w-full object-cover" />
            : <ShieldCheck size={18} className="text-white" />}
        </div>
        <div>
          <p className="text-sm font-bold text-indigo-900 tracking-tight">{app_name}</p>
          <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-medium">Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(item => <NavItem key={item.to} {...item} />)}

        {projectId && (
          <>
            <div className="pt-4 pb-1 px-2">
              <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-semibold">Project</p>
            </div>
            <NavItem to={`/projects/${projectId}/board`}       icon={LayoutGrid}    label="Board" />
            <NavItem to={`/projects/${projectId}/list`}        icon={List}          label="List" />
            <NavItem to={`/projects/${projectId}/backlog`}     icon={Layers}        label="Backlog" />
            <NavItem to={`/projects/${projectId}/parking-lot`} icon={ParkingCircle} label="Parking Lot" />
            <NavItem to={`/projects/${projectId}/epics`}       icon={Zap}           label="Epics" />
          </>
        )}

        {isAdmin() && (
          <>
            <div className="pt-4 pb-1 px-2">
              <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-semibold">Admin</p>
            </div>
            {ADMIN_NAV.map(item => <NavItem key={item.to} {...item} />)}
            <div className="pt-4 pb-1 px-2">
              <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-semibold">Settings</p>
            </div>
            {SETTINGS_NAV.map(item => <NavItem key={item.to} {...item} />)}
          </>
        )}
      </nav>

      {/* User card */}
      <div className="p-3 border-t border-indigo-100">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-indigo-50 transition-colors cursor-pointer group">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white shadow-sm shadow-indigo-300/40">
            {initials(user?.full_name ?? "U")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{user?.full_name}</p>
            <p className="text-[10px] text-slate-400 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="text-slate-300 hover:text-rose-500 transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
        ${isActive
          ? "bg-indigo-600 text-white shadow-md shadow-indigo-400/30"
          : "text-slate-600 hover:text-indigo-700 hover:bg-indigo-50"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={16} className={isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-500"} />
          <span className="flex-1">{label}</span>
          {isActive && <ChevronRight size={12} className="text-white/70" />}
        </>
      )}
    </NavLink>
  );
}
