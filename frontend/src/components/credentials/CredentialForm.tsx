import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, X, ArrowLeft, Lock } from "lucide-react";
import { useCredentialTypes } from "@/hooks/useCredentials";

interface FieldTemplate {
  key: string; label: string; is_sensitive: boolean;
  required: boolean; default: string; placeholder: string;
  is_multiline: boolean; hint: string;
}
interface CredTypeTemplate {
  type: string; label: string; icon: string; color: string; fields: FieldTemplate[];
}

interface Props {
  projectId?: string;
  scope?: "project" | "global";
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function CredentialForm({ projectId, scope = "project", onSubmit, onCancel }: Props) {
  const { data: types } = useCredentialTypes();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [fieldValues, setFieldValues]   = useState<Record<string, string>>({});
  const [revealed, setRevealed]         = useState<Set<string>>(new Set());
  const [label, setLabel]               = useState("");
  const [step, setStep]                 = useState<"type" | "form">("type");

  const currentTemplate: CredTypeTemplate | undefined = types?.find(
    (t: CredTypeTemplate) => t.type === selectedType
  );

  useEffect(() => {
    if (!currentTemplate) return;
    const defaults: Record<string, string> = {};
    currentTemplate.fields.forEach(f => { defaults[f.key] = f.default || ""; });
    setFieldValues(defaults);
    setRevealed(new Set());
  }, [selectedType]);

  const selectType = (type: string) => {
    setSelectedType(type);
    setStep("form");
  };

  const goBack = () => {
    setStep("type");
    setSelectedType(null);
    setLabel("");
  };

  const toggleReveal = (key: string) =>
    setRevealed(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      label,
      credential_type: selectedType,
      scope,
      project_id: scope === "project" ? projectId : undefined,
      fields: fieldValues,
      tags: [],
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", damping: 30, stiffness: 350 }}
        className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl
                   border border-slate-200 bg-white shadow-2xl shadow-indigo-100/80"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 shrink-0">
          <div className="flex items-center gap-3">
            {step === "form" && (
              <button
                type="button" onClick={goBack}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
              >
                <ArrowLeft size={15} />
              </button>
            )}
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-widest font-medium mb-0.5">
                {step === "type" ? "New Credential" : "New Credential · " + currentTemplate?.label}
              </p>
              <h2 className="text-base font-semibold text-slate-800 leading-none">
                {step === "type" ? "Choose a credential type" : "Fill in the details"}
              </h2>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <AnimatePresence mode="wait">
            {step === "type" ? (
              <motion.div
                key="type-picker"
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}
              >
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {(types ?? []).map((t: CredTypeTemplate) => (
                    <button
                      key={t.type} type="button" onClick={() => selectType(t.type)}
                      className="group flex flex-col items-center gap-2.5 rounded-xl border border-slate-200
                                 bg-slate-50 px-3 py-5 text-xs font-medium text-slate-500
                                 hover:border-slate-300 hover:text-slate-900 hover:bg-white/6
                                 active:scale-95 transition-all duration-150"
                    >
                      <span className="text-2xl leading-none transition-transform group-hover:scale-110 duration-150">
                        {getIconEmoji(t.icon)}
                      </span>
                      <span className="text-center leading-snug">{t.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="cred-form"
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.18 }}
              >
                <form id="cred-form" onSubmit={handleSubmit} className="space-y-5">
                  {/* Credential Label */}
                  <Field
                    fieldKey="__label" label="Credential Label" isSensitive={false} isMultiline={false}
                    value={label} onChange={setLabel} required
                    placeholder={`e.g. Production ${currentTemplate?.label ?? ""}`}
                  />

                  <div className="border-t border-slate-100 pt-5 space-y-5">
                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                      {currentTemplate?.label} Fields
                    </p>

                    {currentTemplate?.fields.map(f => (
                      <Field
                        key={f.key}
                        fieldKey={f.key}
                        label={f.label}
                        isSensitive={f.is_sensitive}
                        isMultiline={f.is_multiline}
                        required={f.required}
                        placeholder={f.placeholder}
                        hint={f.hint}
                        value={fieldValues[f.key] ?? ""}
                        onChange={v => setFieldValues(p => ({ ...p, [f.key]: v }))}
                        revealed={revealed.has(f.key)}
                        onToggleReveal={() => toggleReveal(f.key)}
                      />
                    ))}
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer — only on form step */}
        <AnimatePresence>
          {step === "form" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="border-t border-slate-200 px-6 py-4 flex gap-3 shrink-0"
            >
              <button
                type="button" onClick={goBack}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm text-slate-500
                           hover:border-slate-300 hover:text-slate-700 transition-all"
              >
                Back
              </button>
              <button
                type="submit" form="cred-form"
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white
                           hover:bg-indigo-500 active:scale-[0.98] transition-all
                           shadow-lg shadow-indigo-500/25"
              >
                Save Credential
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>,
    document.body
  );
}

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label, isSensitive, isMultiline, value, onChange,
  required, revealed, onToggleReveal, placeholder, hint,
}: {
  fieldKey: string; label: string; isSensitive: boolean; isMultiline: boolean;
  value: string; onChange: (v: string) => void; required?: boolean;
  revealed?: boolean; onToggleReveal?: () => void; placeholder?: string; hint?: string;
}) {
  const base =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 " +
    "placeholder:text-slate-300 focus:border-indigo-500/50 focus:outline-none " +
    "focus:ring-1 focus:ring-indigo-500/20 transition-all";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-500">
          {label}
          {required && <span className="ml-1 text-rose-400">*</span>}
        </label>
        {isSensitive && (
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded
                           bg-amber-400/10 text-amber-400 font-semibold">
            <Lock size={9} /> ENCRYPTED
          </span>
        )}
      </div>
      <div className="relative">
        {isMultiline ? (
          <textarea
            value={value} onChange={e => onChange(e.target.value)}
            required={required} placeholder={placeholder} rows={4}
            className={`${base} font-mono resize-y min-h-[90px]`}
          />
        ) : (
          <input
            type={isSensitive && !revealed ? "password" : "text"}
            value={value} onChange={e => onChange(e.target.value)}
            required={required} placeholder={placeholder} autoComplete="off"
            className={`${base} ${isSensitive ? "font-mono pr-10" : ""}`}
          />
        )}
        {isSensitive && !isMultiline && onToggleReveal && (
          <button
            type="button" onClick={onToggleReveal}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-slate-400 leading-relaxed">{hint}</p>}
    </div>
  );
}

// ─── Icon helper ──────────────────────────────────────────────────────────────

function getIconEmoji(icon: string): string {
  const map: Record<string, string> = {
    terminal: "⌨️", database: "🗄️", zap: "⚡", cloud: "☁️", shield: "🛡️",
    server: "🖥️", "file-badge": "📜", lock: "🔐", mail: "📧", box: "🐳",
    "key-round": "🔑",
  };
  return map[icon] ?? "🔒";
}
