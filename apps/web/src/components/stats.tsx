export function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-3xl border border-forge-line bg-white/[0.035] p-4"><p className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold text-white">{value}</p><p className="mt-1 text-sm text-slate-400">{detail}</p></div>;
}
