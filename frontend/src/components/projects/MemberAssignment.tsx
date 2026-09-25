import { useState } from "react";
import { motion } from "framer-motion";
import { useUsers } from "@/hooks/useCredentials";
import { useAddMember, useProjectMembers } from "@/hooks/useProjects";

export default function MemberAssignment({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { data: users }    = useUsers();
  const { data: members }  = useProjectMembers(projectId);
  const addMember          = useAddMember(projectId);
  const [userId, setUserId]   = useState("");
  const [canReveal, setCanReveal] = useState(true);
  const [canEdit, setCanEdit]     = useState(false);

  const memberIds = new Set((members ?? []).map((m: any) => m.user_id));
  const available = (users?.items ?? []).filter((u: any) => !memberIds.has(u.id));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    addMember.mutate({ user_id: userId, can_reveal: canReveal, can_edit: canEdit }, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 w-full max-w-sm glass rounded-2xl p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-5">Add Team Member</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Select User</label>
            <select value={userId} onChange={e => setUserId(e.target.value)} required
              className="w-full rounded-xl border border-slate-200 bg-surface px-4 py-2.5 text-sm text-slate-800
                         focus:border-indigo-500/60 focus:outline-none transition-all">
              <option value="">— Pick a user —</option>
              {available.map((u: any) => (
                <option key={u.id} value={u.id} className="bg-surface">{u.full_name} ({u.email})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500">Permissions</label>
            {[
              { label: "Can reveal credentials", value: canReveal, set: setCanReveal },
              { label: "Can edit credentials",   value: canEdit,   set: setCanEdit   },
            ].map(p => (
              <label key={p.label} className="flex items-center gap-3 cursor-pointer group">
                <div className={`h-5 w-5 rounded flex items-center justify-center border transition-all
                  ${p.value ? "bg-indigo-600 border-indigo-500" : "border-slate-300 bg-slate-50 group-hover:border-white/40"}`}
                  onClick={() => p.set(v => !v)}>
                  {p.value && <span className="text-indigo-600 text-xs font-bold">✓</span>}
                </div>
                <span className="text-sm text-slate-500">{p.label}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-500 hover:border-slate-300 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={addMember.isPending || !userId}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50">
              Add Member
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
