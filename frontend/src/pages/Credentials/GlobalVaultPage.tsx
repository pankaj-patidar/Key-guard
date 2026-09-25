import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Plus, KeyRound } from "lucide-react";
import { useGlobalCredentials, useCreateCredential, useDeleteCredential } from "@/hooks/useCredentials";
import { useAuthStore } from "@/store/authStore";
import CredentialRow from "@/components/credentials/CredentialRow";
import CredentialForm from "@/components/credentials/CredentialForm";
import CredentialDetailDrawer from "@/components/credentials/CredentialDetailDrawer";

export default function GlobalVaultPage() {
  const { data, isLoading } = useGlobalCredentials();
  const { canReveal, canEditCreds } = useAuthStore();
  const createCred  = useCreateCredential();
  const deleteCred  = useDeleteCredential();
  const [showForm, setShowForm]   = useState(false);
  const [selected, setSelected]   = useState<any>(null);

  const credentials = data?.items ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
            <Globe size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Global Vault</h1>
            <p className="text-sm text-slate-400">Company-wide shared credentials</p>
          </div>
        </div>
        {canEditCreds() && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white
                       hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus size={16} /> Add Credential
          </button>
        )}
      </div>

      <div className="glass rounded-2xl p-1">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-50 animate-pulse" />)}
          </div>
        ) : credentials.length === 0 ? (
          <div className="p-16 text-center">
            <KeyRound size={40} className="mx-auto text-indigo-200 mb-3" />
            <p className="text-sm text-slate-400">No global credentials yet</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {credentials.map((cred: any, i: number) => (
              <motion.div key={cred.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
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
      </div>

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

      {showForm && (
        <CredentialForm
          scope="global"
          onSubmit={(data) => { createCred.mutate(data); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
