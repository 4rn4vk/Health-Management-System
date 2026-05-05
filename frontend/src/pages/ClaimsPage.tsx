import { useCallback, useEffect, useState } from "react";
import { claimsApi } from "@/api";
import type { Claim, ClaimFilter, ClaimStatus, ClaimType } from "@/api/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const STATUS_COLORS: Record<ClaimStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-green-50 text-green-700",
  denied: "bg-red-50 text-red-700",
  paid: "bg-blue-50 text-blue-700",
};

export function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<ClaimFilter>({ page: 1, page_size: 25 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await claimsApi.list(filters);
      setClaims(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const setFilter = <K extends keyof ClaimFilter>(key: K, value: ClaimFilter[K]) => {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  };

  const totalPages = Math.ceil(total / (filters.page_size ?? 25));
  const page = filters.page ?? 1;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800">Claims</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border rounded-xl p-4 shadow-sm">
        <select
          value={filters.status ?? ""}
          onChange={(e) => setFilter("status", (e.target.value as ClaimStatus) || undefined)}
          className="border rounded-md px-3 py-1.5 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
          <option value="paid">Paid</option>
        </select>
        <select
          value={filters.claim_type ?? ""}
          onChange={(e) => setFilter("claim_type", (e.target.value as ClaimType) || undefined)}
          className="border rounded-md px-3 py-1.5 text-sm"
        >
          <option value="">All Types</option>
          <option value="professional">Professional</option>
          <option value="institutional">Institutional</option>
          <option value="dental">Dental</option>
        </select>
        <input
          type="date"
          value={filters.service_date_from ?? ""}
          onChange={(e) => setFilter("service_date_from", e.target.value || undefined)}
          className="border rounded-md px-3 py-1.5 text-sm"
          placeholder="From date"
        />
        <input
          type="date"
          value={filters.service_date_to ?? ""}
          onChange={(e) => setFilter("service_date_to", e.target.value || undefined)}
          className="border rounded-md px-3 py-1.5 text-sm"
        />
        <button
          onClick={() => setFilters({ page: 1, page_size: 25 })}
          className="text-sm text-slate-500 hover:text-slate-800 underline"
        >
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500 tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Claim #</th>
              <th className="px-4 py-3 text-left">Provider ID</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Service Date</th>
              <th className="px-4 py-3 text-right">Billed</th>
              <th className="px-4 py-3 text-right">Approved</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400">Loading…</td></tr>
            ) : claims.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400">No claims found.</td></tr>
            ) : (
              claims.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{c.claim_number}</td>
                  <td className="px-4 py-3 text-slate-600">{c.provider_id}</td>
                  <td className="px-4 py-3 capitalize">{c.claim_type}</td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full capitalize", STATUS_COLORS[c.status])}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatDate(c.service_date)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(c.billed_amount)}</td>
                  <td className="px-4 py-3 text-right">
                    {c.approved_amount != null ? formatCurrency(c.approved_amount) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-slate-600">
            <span>{total} total claims</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))} className="px-3 py-1 border rounded-md disabled:opacity-40">Previous</button>
              <span className="px-2 py-1">Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))} className="px-3 py-1 border rounded-md disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
