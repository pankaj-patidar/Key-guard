import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FolderKanban, Users, CheckCircle2, Clock, AlertCircle,
  ArrowRight, Loader2, BarChart3, Zap, Target, TrendingUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const ITEM = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };
const STAGGER = { container: { animate: { transition: { staggerChildren: 0.06 } } } };

const PRIORITY_COLOR: Record<string, string> = {
  critical: "bg-rose-100 text-rose-700 border-rose-200",
  high:     "bg-orange-100 text-orange-700 border-orange-200",
  medium:   "bg-amber-100 text-amber-700 border-amber-200",
  low:      "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_COLOR: Record<string, string> = {
  backlog:     "bg-slate-100 text-slate-600",
  todo:        "bg-blue-100 text-blue-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  in_review:   "bg-violet-100 text-violet-700",
  on_hold:     "bg-orange-100 text-orange-700",
  done:        "bg-emerald-100 text-emerald-700",
};

const STATUS_LABEL: Record<string, string> = {
  backlog:     "Backlog",
  todo:        "To Do",
  in_progress: "In Progress",
  in_review:   "In Review",
  on_hold:     "On Hold",
  done:        "Done",
};

function useStats()            { return useQuery({ queryKey: ["dashboard", "stats"],            queryFn: () => api.get("/dashboard/stats").then(r => r.data),            staleTime: 60_000 }) }
function useMyTasks()          { return useQuery({ queryKey: ["dashboard", "my-tasks"],          queryFn: () => api.get("/dashboard/my-tasks").then(r => r.data),          staleTime: 60_000 }) }
function useProjectBreakdown() { return useQuery({ queryKey: ["dashboard", "project-breakdown"], queryFn: () => api.get("/dashboard/project-breakdown").then(r => r.data), staleTime: 60_000 }) }

function greet(name: string) {
  const h = new Date().getHours();
  const prefix = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${prefix}, ${name.split(" ")[0]}`;
}

function StatCard({ icon: Icon, label, value, sub, color, bg }: any) {
  return (
    <motion.div variants={ITEM}
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${bg} mb-4`}>
        <Icon size={18} className={color} />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user, isAdmin, canManage } = useAuthStore();
  const { data: stats, isLoading: statsLoading }       = useStats();
  const { data: myTasks = [], isLoading: tasksLoading } = useMyTasks();
  const { data: projects = [], isLoading: projLoading } = useProjectBreakdown();

  const role = user?.role ?? "viewer";
  const isAdminOrPm = isAdmin() || canManage();

  const statCards = [
    {
      icon: FolderKanban, label: "My Projects", bg: "bg-indigo-50", color: "text-indigo-600",
      value: stats?.my_project_count ?? "—",
    },
    {
      icon: Clock, label: "Open Tasks", bg: "bg-amber-50", color: "text-amber-600",
      value: stats?.my_open_tasks ?? "—",
      sub: stats?.my_in_progress ? `${stats.my_in_progress} in progress` : undefined,
    },
    {
      icon: CheckCircle2, label: "Completed", bg: "bg-emerald-50", color: "text-emerald-600",
      value: stats?.my_done_tasks ?? "—",
      sub: "tasks done",
    },
    ...(isAdminOrPm ? [
      {
        icon: Users, label: "Team Members", bg: "bg-violet-50", color: "text-violet-600",
        value: stats?.total_users ?? "—",
      },
      {
        icon: AlertCircle, label: "All Open Tasks", bg: "bg-rose-50", color: "text-rose-600",
        value: stats?.total_open_tasks ?? "—",
        sub: `${stats?.total_done_tasks ?? 0} done`,
      },
    ] : []),
  ];

  return (
    <motion.div className="space-y-8 max-w-6xl" variants={STAGGER.container} initial="initial" animate="animate">

      {/* Header */}
      <motion.div variants={ITEM} className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greet(user?.full_name ?? "there")} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here's what's happening across your projects
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize
          ${role === "admin" ? "bg-rose-50 text-rose-700 border-rose-200"
          : role === "pm" ? "bg-violet-50 text-violet-700 border-violet-200"
          : role === "devops" ? "bg-amber-50 text-amber-700 border-amber-200"
          : role === "developer" ? "bg-indigo-50 text-indigo-700 border-indigo-200"
          : "bg-slate-50 text-slate-600 border-slate-200"}`}
        >
          {role === "pm" ? "PM" : role === "devops" ? "DevOps" : role.charAt(0).toUpperCase() + role.slice(1)}
        </span>
      </motion.div>

      {/* Stat cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <motion.div variants={ITEM} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(c => <StatCard key={c.label} {...c} />)}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* My Tasks — left wide column */}
        <motion.div variants={ITEM} className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-indigo-500" />
              <h2 className="text-sm font-semibold text-slate-800">My Open Tasks</h2>
            </div>
            <span className="text-xs text-slate-400">{myTasks.length} assigned</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {tasksLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-slate-50 animate-pulse" />)}
              </div>
            ) : myTasks.length === 0 ? (
              <div className="py-14 text-center">
                <CheckCircle2 size={32} className="mx-auto text-emerald-300 mb-2" />
                <p className="text-sm font-medium text-slate-500">All caught up!</p>
                <p className="text-xs text-slate-400 mt-1">No open tasks assigned to you</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {myTasks.map((t: any) => (
                  <Link
                    key={t.id}
                    to={`/projects/${t.project_id}/board`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group"
                  >
                    <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${PRIORITY_COLOR[t.priority] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                      {t.priority.toUpperCase().slice(0, 4)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-700 transition-colors">{t.title}</p>
                      <p className="text-[11px] text-slate-400 truncate">{t.project_name}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[t.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {STATUS_LABEL[t.status] ?? t.status}
                    </span>
                    <ArrowRight size={13} className="shrink-0 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Projects breakdown — right narrow column */}
        <motion.div variants={ITEM} className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-violet-500" />
              <h2 className="text-sm font-semibold text-slate-800">Projects</h2>
            </div>
            <Link to="/projects" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
              View all →
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {projLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-50 animate-pulse" />)}
              </div>
            ) : projects.length === 0 ? (
              <div className="py-14 text-center">
                <FolderKanban size={32} className="mx-auto text-indigo-200 mb-2" />
                <p className="text-sm text-slate-500">No projects yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {projects.map((p: any) => {
                  const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                  return (
                    <Link key={p.id} to={`/projects/${p.id}/board`}
                      className="block px-4 py-3.5 hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: p.color_tag }}>
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-700 transition-colors flex-1">{p.name}</p>
                        <span className="text-xs font-bold text-slate-500">{pct}%</span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-1.5">
                        <div className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex gap-3 text-[11px] text-slate-400">
                        <span className="text-indigo-600 font-medium">{p.active} active</span>
                        <span>{p.todo} todo</span>
                        <span className="text-emerald-600">{p.done} done</span>
                        <span className="ml-auto">{p.members} members</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

      </div>

      {/* Admin summary row */}
      {isAdminOrPm && stats && (
        <motion.div variants={ITEM}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-800">Overall Progress</h2>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-600">
                <span className="font-bold text-slate-900">{stats.total_done_tasks}</span> of{" "}
                <span className="font-bold text-slate-900">{(stats.total_done_tasks ?? 0) + (stats.total_open_tasks ?? 0)}</span> tasks completed across all projects
              </span>
              <span className="text-sm font-bold text-indigo-600">
                {stats.total_done_tasks + stats.total_open_tasks > 0
                  ? Math.round((stats.total_done_tasks / (stats.total_done_tasks + stats.total_open_tasks)) * 100)
                  : 0}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                style={{
                  width: stats.total_done_tasks + stats.total_open_tasks > 0
                    ? `${Math.round((stats.total_done_tasks / (stats.total_done_tasks + stats.total_open_tasks)) * 100)}%`
                    : "0%"
                }}
              />
            </div>
            <div className="flex gap-6 mt-3 text-xs text-slate-500">
              <span><span className="font-semibold text-indigo-600">{stats.total_open_tasks}</span> open</span>
              <span><span className="font-semibold text-emerald-600">{stats.total_done_tasks}</span> completed</span>
              <span><span className="font-semibold text-violet-600">{stats.my_project_count}</span> projects</span>
              <span><span className="font-semibold text-rose-600">{stats.total_users}</span> team members</span>
            </div>
          </div>
        </motion.div>
      )}

    </motion.div>
  );
}
