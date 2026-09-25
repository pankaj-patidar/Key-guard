import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, EyeOff, Copy, Check, Download, Terminal, FileKey, Loader2, Lock, Pencil, Save } from "lucide-react";
import { useRevealField, useSnippets, useUpdateCredential, exportField } from "@/hooks/useCredentials";
import toast from "react-hot-toast";

type Tab = "fields" | "use" | "export";

const EXPORTABLE = new Set(["private_key", "certificate", "chain", "ca_cert", "client_cert", "client_key", "config_file"]);
const EXPORT_META: Record<string, { filename: string; hint: string }> = {
  private_key:  { filename: "key.pem",        hint: "chmod 600 key.pem after download" },
  certificate:  { filename: "cert.pem",        hint: "" },
  chain:        { filename: "chain.pem",       hint: "" },
  ca_cert:      { filename: "ca.pem",          hint: "" },
  config_file:  { filename: "vpn.ovpn",        hint: "Use with: sudo openvpn --config vpn.ovpn" },
  client_cert:  { filename: "client.pem",      hint: "" },
  client_key:   { filename: "client-key.pem",  hint: "chmod 600 client-key.pem after download" },
};

interface CredField { field_key: string; field_label: string; is_sensitive: boolean; is_multiline: boolean; plain_value?: string; }
interface Credential { id: string; label: string; credential_type: string; fields: CredField[]; }

export default function CredentialDetailDrawer({
  credential, canReveal, canEdit = false, onClose,
}: { credential: Credential; canReveal: boolean; canEdit?: boolean; onClose: () => void }) {
  const [tab, setTab]       = useState<Tab>("fields");
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel]   = useState(credential.label);
  const [editFields, setEditFields] = useState<Record<string, string>>({});

  const update = useUpdateCredential(credential.id);
  const exportable = credential.fields.filter(f => EXPORTABLE.has(f.field_key));

  const startEdit = () => {
    const initial: Record<string, string> = {};
    credential.fields.forEach(f => { initial[f.field_key] = f.plain_value ?? ""; });
    setEditFields(initial);
    setEditLabel(credential.label);
    setEditing(true);
    setTab("fields");
  };

  const cancelEdit = () => { setEditing(false); };

  const saveEdit = () => {
    const payload: any = { label: editLabel, fields: {} };
    credential.fields.forEach(f => {
      const v = editFields[f.field_key];
      if (v !== undefined && v !== "") payload.fields[f.field_key] = v;
    });
    update.mutate(payload, { onSuccess: onClose });
  };

  const tabs = [
    { key: "fields", label: "Fields",  Icon: FileKey  },
    { key: "use",    label: "Use",     Icon: Terminal },
    ...(exportable.length > 0 ? [{ key: "export", label: "Export", Icon: Download }] : []),
  ] as const;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={editing ? undefined : onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", damping: 30, stiffness: 350 }}
        className="relative z-10 w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl
                   border border-slate-200 bg-white shadow-2xl shadow-indigo-100/80"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-medium mb-1">Credential</p>
            {editing ? (
              <input
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                className="w-full rounded-lg border border-indigo-500/50 bg-slate-50 px-3 py-1.5
                           text-base font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
              />
            ) : (
              <h2 className="text-base font-semibold text-slate-800 leading-none truncate">{credential.label}</h2>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4 shrink-0">
            {canEdit && !editing && (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50
                           px-3 py-1.5 text-xs font-medium text-slate-500
                           hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all"
              >
                <Pencil size={12} /> Edit
              </button>
            )}
            {editing && (
              <>
                <button
                  onClick={cancelEdit}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium
                             text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={update.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold
                             text-white hover:bg-indigo-500 disabled:opacity-50 transition-all"
                >
                  {update.isPending
                    ? <><Loader2 size={11} className="animate-spin" /> Saving…</>
                    : <><Save size={11} /> Save</>}
                </button>
              </>
            )}
            {!editing && (
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs — hidden in edit mode */}
        {!editing && (
          <div className="flex border-b border-slate-200 px-4 shrink-0">
            {tabs.map(t => (
              <button
                key={t.key} onClick={() => setTab(t.key as Tab)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 -mb-px transition-all
                  ${tab === t.key
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-600"}`}
              >
                <t.Icon size={12} /> {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait">
            {editing ? (
              <motion.div
                key="edit"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  Edit Fields — leave blank to keep existing value
                </p>
                {credential.fields.map(f => (
                  <EditField
                    key={f.field_key}
                    field={f}
                    value={editFields[f.field_key] ?? ""}
                    onChange={v => setEditFields(p => ({ ...p, [f.field_key]: v }))}
                  />
                ))}
              </motion.div>
            ) : (
              <>
                {tab === "fields" && <FieldsTab key="f" credential={credential} canReveal={canReveal} />}
                {tab === "use"    && <UseTab    key="u" credentialId={credential.id} canReveal={canReveal} />}
                {tab === "export" && <ExportTab key="e" credentialId={credential.id} exportable={exportable} />}
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

// ─── Edit Field ───────────────────────────────────────────────────────────────

function EditField({ field, value, onChange }: { field: CredField; value: string; onChange: (v: string) => void }) {
  const [revealed, setRevealed] = useState(false);
  const base = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 " +
    "placeholder:text-slate-400 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-800/55">{field.field_label}</label>
        {field.is_sensitive && (
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 font-semibold">
            <Lock size={9} /> ENCRYPTED
          </span>
        )}
      </div>
      <div className="relative">
        {field.is_multiline ? (
          <textarea
            value={value} onChange={e => onChange(e.target.value)}
            placeholder={field.is_sensitive ? "Enter new value to replace…" : ""}
            rows={4}
            className={`${base} font-mono resize-y min-h-[80px]`}
          />
        ) : (
          <input
            type={field.is_sensitive && !revealed ? "password" : "text"}
            value={value} onChange={e => onChange(e.target.value)}
            placeholder={field.is_sensitive ? "Enter new value to replace…" : ""}
            autoComplete="off"
            className={`${base} ${field.is_sensitive ? "font-mono pr-10" : ""}`}
          />
        )}
        {field.is_sensitive && !field.is_multiline && (
          <button
            type="button" onClick={() => setRevealed(r => !r)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Fields Tab ───────────────────────────────────────────────────────────────

function FieldsTab({ credential, canReveal }: { credential: Credential; canReveal: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
      {credential.fields.map(f => (
        <FieldRevealRow key={f.field_key} credentialId={credential.id} field={f} canReveal={canReveal} />
      ))}
    </motion.div>
  );
}

function FieldRevealRow({ credentialId, field, canReveal }: {
  credentialId: string; field: CredField; canReveal: boolean;
}) {
  const [value, setValue]   = useState<string | null>(null);
  const [shown, setShown]   = useState(false);
  const [copied, setCopied] = useState(false);
  const timer               = useRef<ReturnType<typeof setTimeout>>();
  const { mutateAsync: revealFn, isPending } = useRevealField();

  const doReveal = async () => {
    if (shown) { setShown(false); setValue(null); clearTimeout(timer.current); return; }
    const res = await revealFn({ credentialId, fieldKey: field.field_key });
    setValue(res.value);
    setShown(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setShown(false); setValue(null); }, 30_000);
  };

  const doCopy = async () => {
    let v = value;
    if (!v) {
      const res = await revealFn({ credentialId, fieldKey: field.field_key });
      v = res.value;
    }
    await navigator.clipboard.writeText(v!);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="rounded-xl border border-white/6 bg-slate-50 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{field.field_label}</span>
        {field.is_sensitive && (
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 font-semibold">
            <Lock size={9} /> ENCRYPTED
          </span>
        )}
      </div>

      <div className={`rounded-lg bg-black/30 px-3 py-2.5 font-mono text-sm min-h-[2.5rem]
                       ${field.is_multiline ? "whitespace-pre-wrap break-all" : "flex items-center justify-between gap-2"}`}>
        <AnimatePresence mode="wait">
          {shown && value ? (
            <motion.span key="val" initial={{ opacity: 0, filter: "blur(4px)" }} animate={{ opacity: 1, filter: "blur(0)" }}
              exit={{ opacity: 0 }} className="text-emerald-300 break-all">{value}</motion.span>
          ) : field.is_sensitive ? (
            <motion.span key="dot" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-slate-300 tracking-widest text-base">••••••••••••</motion.span>
          ) : (
            <motion.span key="plain" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-slate-500">{field.plain_value || "—"}</motion.span>
          )}
        </AnimatePresence>
      </div>

      {canReveal && (
        <div className="flex gap-2">
          {field.is_sensitive && (
            <Chip onClick={doReveal} disabled={isPending}
              icon={isPending ? <Loader2 size={11} className="animate-spin" /> : shown ? <EyeOff size={11} /> : <Eye size={11} />}
              label={shown ? "Hide" : "Reveal"} active={shown} />
          )}
          <Chip onClick={doCopy} disabled={isPending}
            icon={copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            label={copied ? "Copied!" : "Copy"} active={copied} />
        </div>
      )}
    </div>
  );
}

// ─── Use Tab ──────────────────────────────────────────────────────────────────

function UseTab({ credentialId, canReveal }: { credentialId: string; canReveal: boolean }) {
  const { mutate, data, isPending } = useSnippets();

  if (!canReveal) return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
      <span className="text-4xl">🔒</span>
      <p className="text-sm">Reveal permission required</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      {!data ? (
        <button onClick={() => mutate(credentialId)} disabled={isPending}
          className="w-full rounded-xl border border-indigo-500/30 bg-indigo-500/10 py-3
                     text-sm font-medium text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/50
                     disabled:opacity-50 transition-all flex items-center justify-center gap-2">
          {isPending ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : "⚡ Generate Use Snippets"}
        </button>
      ) : (
        <>
          {Object.entries(data.snippets).map(([title, snippet]) => (
            <SnippetCard key={title} title={title} snippet={snippet as string} />
          ))}
          <p className="text-center text-xs text-slate-300 pt-1">Contains live credentials — do not share screenshots.</p>
        </>
      )}
    </motion.div>
  );
}

function SnippetCard({ title, snippet }: { title: string; snippet: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-xl border border-white/6 bg-black/30 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
        <span className="text-xs font-medium text-slate-500">{title}</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors">
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="px-4 py-3 text-xs font-mono text-emerald-300/80 overflow-x-auto whitespace-pre">{snippet}</pre>
    </div>
  );
}

// ─── Export Tab ───────────────────────────────────────────────────────────────

function ExportTab({ credentialId, exportable }: { credentialId: string; exportable: CredField[] }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <p className="text-xs text-slate-400 pb-1">Files are decrypted server-side and streamed directly to your browser.</p>
      {exportable.map(f => {
        const meta = EXPORT_META[f.field_key];
        return (
          <div key={f.field_key} className="flex items-center justify-between rounded-xl border border-white/6 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800">{f.field_label}</p>
              {meta?.hint && <code className="text-[10px] text-amber-400/70 mt-0.5 block">{meta.hint}</code>}
            </div>
            <button onClick={() => exportField(credentialId, f.field_key, meta?.filename ?? f.field_key)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5
                         text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 hover:bg-indigo-50 transition-all">
              <Download size={12} /> Download
            </button>
          </div>
        );
      })}
    </motion.div>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ onClick, icon, label, disabled, active }: {
  onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean; active?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-40
        ${active
          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
          : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-indigo-50 hover:text-slate-700"}`}>
      {icon} {label}
    </button>
  );
}
