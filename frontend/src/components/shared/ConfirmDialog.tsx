import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface Props {
  title:        string;
  message:      string;
  confirmLabel: string;
  danger?:      boolean;
  onConfirm:    () => void;
  onCancel:     () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 w-full max-w-sm glass rounded-2xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${danger ? "bg-rose-500/15" : "bg-amber-500/15"}`}>
            <AlertTriangle size={18} className={danger ? "text-rose-400" : "text-amber-400"} />
          </div>
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-500 hover:border-slate-300 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-slate-800 transition-colors
              ${danger ? "bg-rose-600 hover:bg-rose-500" : "bg-amber-600 hover:bg-amber-500"}`}>
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
