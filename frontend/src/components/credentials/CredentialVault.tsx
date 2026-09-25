import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, KeyRound, Search } from "lucide-react";
import { useProjectCredentials, useCreateCredential, useDeleteCredential } from "@/hooks/useCredentials";
import { useAuthStore } from "@/store/authStore";
import CredentialRow from "./CredentialRow";
import CredentialForm from "./CredentialForm";
import CredentialDetailDrawer from "./CredentialDetailDrawer";

export default function CredentialVault({ projectId }: { projectId: string }) {
  const { data, isLoading } = useProjectCredentials(projectId);
  const { canReveal, canEditCreds } = useAuthStore();
  const createCred = useCreateCredential();
  const deleteCred = useDeleteCredential();

  const [showForm, setShowForm]       = useState(false);
  const [selected, setSelected]       = useState<any>(null);
  const [search, setSearch]           = useState("");

  const credentials = (data?.items ?? []).filter((c: any) =>
    c.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">Credential Vault</h2>
          <span className="text-xs text-slate-400">({data?.total ?? 0})</span>
        </div>
        {canEditCreds() && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5
                       text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 transition-all">
            <Plus size={12} /> Add Credential
          </button>
        )}
      </div>

      {/* Search */}
      {credentials.length > 3 && (
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search credentials…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm text-slate-800
                       placeholder:text-slate-300 focus:border-indigo-500/50 focus:outline-none transition-all" />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-50 animate-pulse" />)}
        </div>
      ) : credentials.length === 0 ? (
        <div className="py-10 text-center">
          <KeyRound size={32} className="mx-auto text-indigo-200 mb-3" />
          <p className="text-sm text-slate-400">{search ? "No matching credentials" : "No credentials yet"}</p>
          {canEditCreds() && !search && (
            <button onClick={() => setShowForm(true)} className="mt-3 text-xs text-indigo-400 hover:text-indigo-300">
              Add the first credential →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {credentials.map((cred: any, i: number) => (
            <motion.div key={cred.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <CredentialRow
                credential={cred}
                canReveal={canReveal()}
                canEdit={canEditCreds()}
                onClick={() => setSelected(cred)}
                onDelete={canEditCreds() ? () => deleteCred.mutate(cred.id) : undefined}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Drawer */}
      <AnimatePresence>
        {selected && (
          <CredentialDetailDrawer
            credential={selected}
            canReveal={canReveal()}
            canEdit={canEditCreds()}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <CredentialForm
            projectId={projectId}
            scope="project"
            onSubmit={(d) => { createCred.mutate(d); setShowForm(false); }}
            onCancel={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
