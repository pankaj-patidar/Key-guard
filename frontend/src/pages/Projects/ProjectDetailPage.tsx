import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Plus, KeyRound, Trash2, UserMinus } from "lucide-react";
import { useProject, useProjectMembers, useDeleteProject, useRemoveMember } from "@/hooks/useProjects";
import { useAuthStore } from "@/store/authStore";
import CredentialVault from "@/components/credentials/CredentialVault";
import MemberAssignment from "@/components/projects/MemberAssignment";
import { initials, formatDate } from "@/lib/utils";
import { RoleBadge } from "@/components/shared/RoleBadge";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(id!);
  const { data: members } = useProjectMembers(id!);
  const { canManage, isAdmin } = useAuthStore();
  const deleteProject = useDeleteProject();
  const removeMember  = useRemoveMember(id!);

  const [showAddMember, setShowAddMember] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 rounded-lg glass animate-pulse" />
      <div className="h-40 rounded-2xl glass animate-pulse" />
    </div>
  );

  if (!project) return <p className="text-slate-400">Project not found.</p>;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Back + Header */}
      <div>
        <button onClick={() => navigate("/projects")}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-4 transition-colors">
          <ArrowLeft size={14} /> Back to Projects
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white font-bold text-sm shadow-lg"
              style={{ background: `linear-gradient(135deg, ${project.color_tag}, ${project.color_tag}88)` }}>
              {project.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
              {project.description && <p className="text-sm text-slate-400 mt-0.5">{project.description}</p>}
            </div>
          </div>

          {isAdmin() && (
            <button onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 px-3 py-2 text-xs text-rose-400
                         hover:bg-rose-500/10 transition-all">
              <Trash2 size={13} /> Delete Project
            </button>
          )}
        </div>
      </div>

      {/* Credential Vault */}
      <section>
        <CredentialVault projectId={id!} />
      </section>

      {/* Members */}
      <section className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800">Team Members</h2>
            <span className="text-xs text-slate-400">({members?.length ?? 0})</span>
          </div>
          {canManage() && (
            <button onClick={() => setShowAddMember(true)}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5
                         text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 transition-all">
              <Plus size={12} /> Add Member
            </button>
          )}
        </div>

        <div className="space-y-2">
          {(members ?? []).map((m: any) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl px-4 py-3 bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500/30 to-violet-500/30
                                flex items-center justify-center text-xs font-bold text-indigo-300">
                  {initials(m.user?.full_name ?? "U")}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{m.user?.full_name}</p>
                  <p className="text-xs text-slate-400">{m.user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <RoleBadge role={m.user?.role} />
                <div className="flex gap-1 text-[10px] text-slate-400">
                  {m.can_reveal && <span className="px-1.5 py-0.5 rounded bg-slate-50">reveal</span>}
                  {m.can_edit   && <span className="px-1.5 py-0.5 rounded bg-slate-50">edit</span>}
                </div>
                {canManage() && (
                  <button onClick={() => removeMember.mutate(m.user_id)}
                    className="text-slate-300 hover:text-rose-400 transition-colors">
                    <UserMinus size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {showAddMember && <MemberAssignment projectId={id!} onClose={() => setShowAddMember(false)} />}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Project"
          message={`Are you sure you want to delete "${project.name}"? All credentials in this project will also be permanently deleted.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => { deleteProject.mutate(id!); navigate("/projects"); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
