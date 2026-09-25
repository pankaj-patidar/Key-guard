import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Copy, Check, Trash2, ChevronRight } from "lucide-react";
import { useRevealField } from "@/hooks/useCredentials";

const TYPE_COLORS: Record<string, string> = {
  ssh_key:         "text-cyan-400    bg-cyan-400/10    border-cyan-400/20",
  database:        "text-violet-400  bg-violet-400/10  border-violet-400/20",
  api_key:         "text-amber-400   bg-amber-400/10   border-amber-400/20",
  cloud_account:   "text-sky-400     bg-sky-400/10     border-sky-400/20",
  vpn:             "text-rose-400    bg-rose-400/10    border-rose-400/20",
  server:          "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  tls_cert:        "text-orange-400  bg-orange-400/10  border-orange-400/20",
  oauth_client:    "text-pink-400    bg-pink-400/10    border-pink-400/20",
  smtp:            "text-blue-400    bg-blue-400/10    border-blue-400/20",
  docker_registry: "text-teal-400    bg-teal-400/10    border-teal-400/20",
  generic:         "text-slate-400    bg-slate-50        border-slate-200",
};

interface Credential {
  id: string; label: string; credential_type: string;
  fields: { field_key: string; field_label: string; is_sensitive: boolean; plain_value?: string }[];
  description?: string;
}

interface Props {
  credential: Credential;
  canReveal: boolean;
  canEdit:   boolean;
  onDelete?: () => void;
  onClick?:  () => void;
}

export default function CredentialRow({ credential, canReveal, canEdit, onDelete, onClick }: Props) {
  const [copied, setCopied]     = useState(false);
  const { mutateAsync: reveal } = useRevealField();

  const primaryField = credential.fields.find(f => f.is_sensitive) ?? credential.fields[0];
  const metaFields   = credential.fields.filter(f => !f.is_sensitive).slice(0, 2);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canReveal) return;
    const res = await reveal({ credentialId: credential.id, fieldKey: primaryField?.field_key ?? "" });
    await navigator.clipboard.writeText(res.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tc = TYPE_COLORS[credential.credential_type] ?? TYPE_COLORS.generic;

  return (
    <motion.div
      layout
      className="group flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50
                 hover:bg-slate-50 hover:border-slate-200 px-5 py-4 cursor-pointer transition-all duration-150"
      onClick={onClick}
    >
      {/* Type badge */}
      <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tc}`}>
        {credential.credential_type.replace("_", " ")}
      </span>

      {/* Label + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{credential.label}</p>
        <p className="text-xs text-slate-400 truncate mt-0.5">
          {metaFields.map(f => f.plain_value).filter(Boolean).join(" · ")}
        </p>
      </div>

      {/* Secret pill */}
      <span className="hidden sm:block font-mono text-sm text-slate-300 tracking-widest select-none">
        ••••••••
      </span>

      {/* Actions (visible on hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
        {canReveal && primaryField?.is_sensitive && (
          <ActionBtn onClick={handleCopy} title="Copy to clipboard"
            icon={copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />} />
        )}
        <ActionBtn onClick={e => e.stopPropagation()} title="Open details"
          icon={<ChevronRight size={13} />} onClick2={onClick} />
        {canEdit && onDelete && (
          <ActionBtn
            onClick={e => { e.stopPropagation(); onDelete(); }}
            title="Delete" icon={<Trash2 size={13} />} danger />
        )}
      </div>
    </motion.div>
  );
}

function ActionBtn({ onClick, onClick2, icon, title, danger }: {
  onClick:  (e: React.MouseEvent) => void;
  onClick2?: (() => void) | undefined;
  icon:     React.ReactNode;
  title:    string;
  danger?:  boolean;
}) {
  return (
    <button title={title}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150
        ${danger
          ? "text-slate-400 hover:text-rose-400 hover:bg-rose-400/10"
          : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        }`}>
      {icon}
    </button>
  );
}
