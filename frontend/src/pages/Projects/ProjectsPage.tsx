import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, FolderKanban, Search } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useAuthStore } from "@/store/authStore";
import ProjectCard from "@/components/projects/ProjectCard";
import ProjectForm from "@/components/projects/ProjectForm";

export default function ProjectsPage() {
  const { data, isLoading } = useProjects();
  const { canManage } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch]     = useState("");

  const projects = (data?.items ?? []).filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-400 mt-1">{data?.total ?? 0} projects total</p>
        </div>
        {canManage() && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white
                       hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search projects…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5
                     text-sm text-slate-800 placeholder:text-slate-400
                     focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30
                     transition-all"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl glass animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <FolderKanban size={48} className="mx-auto text-indigo-200 mb-4" />
          <p className="text-slate-400">{search ? "No projects match your search" : "No projects yet"}</p>
          {canManage() && !search && (
            <button onClick={() => setShowForm(true)} className="mt-4 text-sm text-indigo-400 hover:text-indigo-300">
              Create your first project →
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p: any, i: number) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <ProjectCard project={p} />
            </motion.div>
          ))}
        </div>
      )}

      {showForm && <ProjectForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
