const ROLE_STYLES: Record<string, string> = {
  admin:     "bg-rose-500/15    text-rose-400    border-rose-500/20",
  pm:        "bg-violet-500/15  text-violet-400  border-violet-500/20",
  devops:    "bg-amber-500/15   text-amber-400   border-amber-500/20",
  developer: "bg-indigo-500/15  text-indigo-400  border-indigo-500/20",
  viewer:    "bg-indigo-50       text-slate-400    border-slate-200",
};

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${ROLE_STYLES[role] ?? ROLE_STYLES.viewer}`}>
      {role}
    </span>
  );
}
