import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { useLogin } from "@/hooks/useAuth";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const { mutate: login, isPending } = useLogin();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email, password });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Welcome back</h2>
        <p className="text-sm text-slate-500 mt-1">Sign in to your Key Guard account</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500">Email</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full rounded-xl border border-indigo-100 bg-white pl-10 pr-4 py-2.5
                         text-sm text-slate-800 placeholder:text-slate-400
                         focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200
                         transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500">Password</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl border border-indigo-100 bg-white pl-10 pr-10 py-2.5
                         text-sm text-slate-800 placeholder:text-slate-400
                         focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200
                         transition-all shadow-sm"
            />
            <button
              type="button"
              onClick={() => setShowPw(p => !p)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 rounded-xl
                     bg-gradient-to-r from-indigo-600 to-violet-600
                     py-2.5 text-sm font-semibold text-white
                     hover:from-indigo-500 hover:to-violet-500
                     disabled:opacity-60 disabled:cursor-not-allowed
                     shadow-lg shadow-indigo-500/20
                     transition-all duration-200 mt-2"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : (
            <><span>Sign In</span><ArrowRight size={14} /></>
          )}
        </button>
      </form>
    </div>
  );
}
