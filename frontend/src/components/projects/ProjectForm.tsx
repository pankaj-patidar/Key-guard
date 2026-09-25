import { useState } from "react";
import { motion } from "framer-motion";
import { useCreateProject } from "@/hooks/useProjects";

const COLORS = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316","#f59e0b","#10b981","#06b6d4","#3b82f6","#a78bfa"];

export default function ProjectForm({ onClose }: { onClose: () => void }) {
  const [name, setName]             = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor]           = useState(COLORS[0]);
  const create = useCreateProject();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate({ name, description, color_tag: color }, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 w-full max-w-md glass rounded-2xl p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-5">New Project</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Project Name <span className="text-rose-400">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} required
              placeholder="e.g. Production API"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800
                         placeholder:text-slate-300 focus:border-indigo-500/60 focus:outline-none transition-all" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="What is this project about?"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800
                         placeholder:text-slate-300 focus:border-indigo-500/60 focus:outline-none transition-all resize-none" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500">Color Tag</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-lg transition-all ${color === c ? "ring-2 ring-white/60 ring-offset-1 ring-offset-background scale-110" : "hover:scale-105"}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-500 hover:border-slate-300 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={create.isPending}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50">
              Create Project
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
