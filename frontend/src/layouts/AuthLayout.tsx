import { Outlet, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export default function AuthLayout() {
  const { accessToken } = useAuthStore();
  if (accessToken) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute top-3/4 left-1/2 w-64 h-64 rounded-full bg-pink-300/15 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 mb-4">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-indigo-900 tracking-tight">Key Guard</h1>
          <p className="text-sm text-slate-500 mt-1">Centralized credential management</p>
        </div>

        <div className="glass rounded-2xl p-8">
          <Outlet />
        </div>
      </motion.div>
    </div>
  );
}
