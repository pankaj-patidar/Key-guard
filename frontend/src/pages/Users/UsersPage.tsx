import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Users, Trash2, Mail, Search, Filter, X,
  ChevronLeft, ChevronRight, ShieldCheck,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { initials, formatDate } from "@/lib/utils";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

const PAGE_SIZE = 20;
const ROLES = ["admin", "pm", "devops", "developer", "viewer"] as const;

const ROLE_LABELS: Record<string, string> = {
  admin:     "Admin",
  pm:        "PM",
  devops:    "DevOps",
  developer: "Developer",
  viewer:    "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  admin:     "bg-rose-100 text-rose-700",
  pm:        "bg-violet-100 text-violet-700",
  devops:    "bg-amber-100 text-amber-700",
  developer: "bg-indigo-100 text-indigo-700",
  viewer:    "bg-slate-100 text-slate-600",
};

function useUsersList(page: number, search: string, role: string) {
  return useQuery({
    queryKey: ["users", page, search, role],
    queryFn: () =>
      api.get("/users/", {
        params: {
          skip: (page - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
          ...(search ? { search } : {}),
          ...(role ? { role } : {}),
        },
      }).then(r => r.data),
    placeholderData: (prev) => prev,
  });
}

function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: any) => api.post("/users/", d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); toast.success("User created"); },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Failed to create user"),
  });
}

function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); toast.success("User deleted"); },
    onError: () => toast.error("Failed to delete user"),
  });
}

export default function UsersPage() {
  const [page, setPage]           = useState(1);
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch]       = useState("");
  const [role, setRole]           = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm] = useState({ email: "", full_name: "", password: "", role: "developer" });

  const { data, isLoading, isFetching } = useUsersList(page, search, role);
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();

  const users      = data?.items ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = search || role;

  const handleSearch = (val: string) => {
    setRawSearch(val);
    clearTimeout((window as any).__userSearchTimer);
    (window as any).__userSearchTimer = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 350);
  };

  const handleRole = (val: string) => { setRole(val); setPage(1); };

  const clearFilters = () => {
    setRawSearch(""); setSearch(""); setRole(""); setPage(1);
  };

  const handleCreate = () => {
    createUser.mutate(form);
    setShowForm(false);
    setForm({ email: "", full_name: "", password: "", role: "developer" });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <Users size={18} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {!isLoading && <><span className="font-medium text-slate-700">{total}</span> users</>}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white
                     hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-56">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={rawSearch}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                       placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2
                       focus:ring-indigo-100 transition-all shadow-sm"
          />
          {rawSearch && (
            <button onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={role}
            onChange={e => handleRole(e.target.value)}
            className="pl-8 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                       focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                       transition-all shadow-sm appearance-none cursor-pointer"
          >
            <option value="">All roles</option>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>

        {hasFilters && (
          <button onClick={clearFilters}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white
                       text-sm text-slate-600 hover:border-rose-200 hover:text-rose-600 transition-all shadow-sm">
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className={`bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-opacity ${isFetching && !isLoading ? "opacity-70" : ""}`}>
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[45%]" />
            <col className="w-[20%]" />
            <col className="w-[25%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left">
              {["Member", "Role", "Joined", "Actions"].map(h => (
                <th key={h} className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={4} className="px-5 py-4">
                    <div className="h-10 rounded-xl bg-slate-50 animate-pulse" />
                  </td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-20 text-center">
                  <Users size={36} className="mx-auto text-indigo-200 mb-3" />
                  <p className="text-sm font-medium text-slate-500">No users found</p>
                  {hasFilters && (
                    <button onClick={clearFilters} className="mt-2 text-xs text-indigo-500 hover:underline">
                      Clear filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              users.map((u: any) => (
                <motion.tr
                  key={u.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500
                                      flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0">
                        {initials(u.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{u.full_name}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                          <Mail size={10} className="flex-shrink-0" />{u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role] ?? "bg-slate-100 text-slate-600"}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">{formatDate(u.created_at)}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => setDeleteTarget(u)}
                      className="text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-medium text-slate-700">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</span>
            {" "}of <span className="font-medium text-slate-700">{total}</span> users
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white
                         text-slate-600 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40
                         disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronLeft size={15} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`e-${i}`} className="flex h-9 w-9 items-center justify-center text-slate-400 text-sm">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-all ${
                      page === p
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 shadow-sm"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white
                         text-slate-600 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40
                         disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4 border border-slate-200"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <ShieldCheck size={16} className="text-indigo-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">Add Team Member</h2>
            </div>

            {[
              { label: "Full Name", key: "full_name", type: "text",     placeholder: "Jane Smith" },
              { label: "Email",     key: "email",     type: "email",    placeholder: "jane@company.com" },
              { label: "Password",  key: "password",  type: "password", placeholder: "••••••••" },
            ].map(f => (
              <div key={f.key} className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">{f.label}</label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800
                             placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none
                             focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800
                           focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
              >
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600
                           hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createUser.isPending}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white
                           hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                Create User
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete User"
          message={`Remove "${deleteTarget.full_name}" from the team? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => { deleteUser.mutate(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
