import { motion } from "framer-motion";
import { KeyRound, Users, ChevronRight, Archive } from "lucide-react";
import { Link } from "react-router-dom";

interface Project {
  id: string; name: string; slug: string; description: string;
  color_tag: string; is_archived: boolean;
  member_count: number; credential_count: number;
}

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <motion.div whileHover={{ y: -3, scale: 1.01 }} transition={{ duration: 0.2, ease: "easeOut" }}>
      <Link to={`/projects/${project.id}`} className="block group">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 backdrop-blur-xl
                        shadow-[0_4px_24px_rgba(0,0,0,0.3)]
                        hover:border-white/15 hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)]
                        transition-all duration-300">
          {/* Top accent */}
          <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${project.color_tag}, transparent)` }} />

          {/* Glow */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-15 pointer-events-none"
            style={{ background: project.color_tag }} />

          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold text-sm shadow-md"
                  style={{ background: `linear-gradient(135deg, ${project.color_tag}cc, ${project.color_tag}55)` }}>
                  {project.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm leading-snug">{project.name}</h3>
                  {project.is_archived && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-400/70 mt-0.5">
                      <Archive size={9} /> Archived
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
            </div>

            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 min-h-[2rem]">
              {project.description || "No description provided."}
            </p>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><Users size={11} />{project.member_count} members</span>
              <span className="flex items-center gap-1.5"><KeyRound size={11} />{project.credential_count} creds</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
