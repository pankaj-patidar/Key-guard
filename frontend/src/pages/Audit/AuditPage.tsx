import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScrollText, Eye, Copy, Download, Trash2, Plus, RefreshCw,
  Search, Filter, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, initials } from "@/lib/utils";

const PAGE_SIZE = 20;

const ACTIONS = [
  "REVEAL_FIELD", "REVEAL_ALL", "COPY", "EXPORT_FILE",
  "CREATE", "UPDATE", "DELETE", "USE_SNIPPETS",
];

const ACTION_META: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  REVEAL_FIELD: { icon: Eye,       color: "text-amber-600",   bg: "bg-amber-50",   label: "Revealed field"    },
  REVEAL_ALL:   { icon: Eye,       color: "text-orange-600",  bg: "bg-orange-50",  label: "Revealed all"      },
  COPY:         { icon: Copy,      color: "text-blue-600",    bg: "bg-blue-50",    label: "Copied"            },
  EXPORT_FILE:  { icon: Download,  color: "text-teal-600",    bg: "bg-teal-50",    label: "Exported file"     },
  CREATE:       { icon: Plus,      color: "text-emerald-600", bg: "bg-emerald-50", label: "Created"           },
  UPDATE:       { icon: RefreshCw, color: "text-indigo-600",  bg: "bg-indigo-50",  label: "Updated"           },
  DELETE:       { icon: Trash2,    color: "text-rose-600",    bg: "bg-rose-50",    label: "Deleted"           },
  USE_SNIPPETS: { icon: Copy,      color: "text-violet-600",  bg: "bg-violet-50",  label: "Generated snippets"},
};

function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  const timer = useCallback(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  useState(timer);
  return debounced;
}

export default function AuditPage() {
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState("");
  const [action, setAction]     = useState("");
  const [rawSearch, setRawSearch] = useState("");

  // simple debounce
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const handleSearchChange = (val: string) => {
    setRawSearch(val);
    clearTimeout((window as any).__auditSearchTimer);
    (window as any).__auditSearchTimer = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 350);
  };

  const handleActionChange = (val: string) => {
    setAction(val);
    setPage(1);
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["audit", page, debouncedSearch, action],
    queryFn: () =>
      api.get("/audit/", {
        params: {
          skip: (page - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(action ? { action } : {}),
        },
      }).then(r => r.data),
    placeholderData: (prev) => prev,
    refetchInterval: 30_000,
  });

  const logs       = data?.items ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = debouncedSearch || action;

  const clearFilters = () => {
    setRawSearch("");
    setDebouncedSearch("");
    setAction("");
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
          <ScrollText size={18} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
          <p className="text-sm text-slate-500">
            All credential access events
            {!isLoading && <> · <span className="font-medium text-slate-700">{total}</span> records</>}
          </p>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-56">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={rawSearch}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by user or detail…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                       placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2
                       focus:ring-indigo-100 transition-all shadow-sm"
          />
          {rawSearch && (
            <button onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Action filter */}
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={action}
            onChange={e => handleActionChange(e.target.value)}
            className="pl-8 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
                       focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                       transition-all shadow-sm appearance-none cursor-pointer"
          >
            <option value="">All actions</option>
            {ACTIONS.map(a => (
              <option key={a} value={a}>{ACTION_META[a]?.label ?? a}</option>
            ))}
          </select>
        </div>

        {/* Clear filters */}
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
        {/* Table header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-8">Type</span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Event</span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">IP</span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Time</span>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-50 animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center">
            <ScrollText size={36} className="mx-auto text-indigo-200 mb-3" />
            <p className="text-sm font-medium text-slate-500">No audit events found</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-2 text-xs text-indigo-500 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${page}-${debouncedSearch}-${action}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="divide-y divide-slate-50"
            >
              {logs.map((log: any) => {
                const meta = ACTION_META[log.action] ?? { icon: Eye, color: "text-slate-500", bg: "bg-slate-50", label: log.action };
                const Icon = meta.icon;
                return (
                  <div key={log.id}
                    className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    {/* Action icon */}
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                      <Icon size={14} className={meta.color} />
                    </div>

                    {/* Event description */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600 text-[10px] font-bold shrink-0">
                        {initials(log.user?.full_name ?? "?")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700 truncate">
                          <span className="font-semibold text-slate-900">{log.user?.full_name ?? "Unknown"}</span>
                          {" "}
                          <span className={`${meta.color} font-medium`}>{meta.label.toLowerCase()}</span>
                          {log.detail && <span className="text-slate-400"> · {log.detail}</span>}
                        </p>
                        <p className="text-[11px] text-slate-400">{log.user?.email}</p>
                      </div>
                    </div>

                    {/* IP */}
                    <span className="text-[11px] font-mono text-slate-400 shrink-0">
                      {log.ip_address ?? "—"}
                    </span>

                    {/* Timestamp */}
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-500">{formatDate(log.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-700">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</span> of{" "}
            <span className="font-medium text-slate-700">{total}</span> results
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
                  <span key={`ellipsis-${i}`} className="flex h-9 w-9 items-center justify-center text-slate-400 text-sm">…</span>
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
    </div>
  );
}
