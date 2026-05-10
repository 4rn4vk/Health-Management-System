import { useCallback, useEffect, useRef, useState } from "react";
import { providersApi } from "@/api";
import type { Provider, Specialty } from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

export function ProvidersPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [providers, setProviders] = useState<Provider[]>([]);
  const [total, setTotal] = useState(0);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Specialty dropdown
  const [specOpen, setSpecOpen] = useState(false);
  const specRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (specRef.current && !specRef.current.contains(e.target as Node)) {
        setSpecOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Provider detail panel
  const [selected, setSelected] = useState<Provider | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await providersApi.list({
        search: search || undefined,
        state: state || undefined,
        specialty_ids: selectedSpecialties,
        page,
        page_size: pageSize,
      });
      setProviders(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [search, state, selectedSpecialties, page]);

  useEffect(() => {
    providersApi.listSpecialties().then(setSpecialties);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, state, selectedSpecialties]);

  useEffect(() => {
    load();
  }, [load]);

  const openPanel = (p: Provider) => {
    setSelected(p);
    setPanelOpen(true);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">Provider Directory</h2>
        {isAdmin && (
          <button
            onClick={() => { setSelected(null); setPanelOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md shrink-0"
          >
            + Add Provider
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border rounded-xl p-4 shadow-sm">
        <input
          type="text"
          placeholder="Search name, org, NPI…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-[200px]"
        />
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All States</option>
          {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Specialty multi-select dropdown */}
        <div ref={specRef} className="relative">
          <button
            type="button"
            onClick={() => setSpecOpen((o) => !o)}
            className="border rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2 bg-white min-w-[160px]"
          >
            <span className="flex-1 text-left text-slate-700">
              {selectedSpecialties.length === 0
                ? "All Specialties"
                : `${selectedSpecialties.length} selected`}
            </span>
            <svg className={cn("w-4 h-4 text-slate-400 transition-transform", specOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {specOpen && (
            <div className="absolute z-20 mt-1 left-0 bg-white border rounded-lg shadow-lg py-1 min-w-[200px] max-h-64 overflow-y-auto">
              {selectedSpecialties.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSpecialties([])}
                  className="w-full text-left px-3 py-1.5 text-xs text-blue-600 hover:bg-slate-50 border-b"
                >
                  Clear selection
                </button>
              )}
              {specialties.map((sp) => {
                const checked = selectedSpecialties.includes(sp.id);
                return (
                  <label
                    key={sp.id}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedSpecialties((prev) =>
                          checked ? prev.filter((id) => id !== sp.id) : [...prev, sp.id]
                        )
                      }
                      className="accent-blue-600"
                    />
                    {sp.name}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="relative bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent z-10 md:hidden" />
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500 tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">NPI</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Organization</th>
              <th className="px-4 py-3 text-left">State</th>
              <th className="px-4 py-3 text-left">Specialties</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">Loading…</td></tr>
            ) : providers.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">No providers found.</td></tr>
            ) : (
              providers.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => openPanel(p)}
                >
                  <td className="px-4 py-3 font-mono text-xs">{p.npi}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.organization ?? "—"}</td>
                  <td className="px-4 py-3">{p.state ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.specialties.slice(0, 3).map((sp) => (
                        <span key={sp.id} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                          {sp.name}
                        </span>
                      ))}
                      {p.specialties.length > 3 && (
                        <span className="text-xs text-slate-400">+{p.specialties.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      p.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                    )}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-3 border-t text-sm text-slate-600">
            <span>{total} total providers</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 border rounded-md disabled:opacity-40 hover:bg-slate-50"
              >
                Previous
              </button>
              <span className="px-2 py-1">Page {page} of {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 border rounded-md disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over panel */}
      {panelOpen && (
        <ProviderPanel
          provider={selected}
          specialties={specialties}
          isAdmin={isAdmin}
          onClose={() => { setPanelOpen(false); load(); }}
        />
      )}
    </div>
  );
}

// ── ProviderPanel ──────────────────────────────────────────────────────────────
function ProviderPanel({
  provider,
  specialties,
  isAdmin,
  onClose,
}: {
  provider: Provider | null;
  specialties: Specialty[];
  isAdmin: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    npi: provider?.npi ?? "",
    full_name: provider?.full_name ?? "",
    organization: provider?.organization ?? "",
    state: provider?.state ?? "",
    city: provider?.city ?? "",
    zip_code: provider?.zip_code ?? "",
    phone: provider?.phone ?? "",
    email: provider?.email ?? "",
    is_active: provider?.is_active ?? true,
    specialty_ids: provider?.specialties.map((s) => s.id) ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docs, setDocs] = useState<{ filename: string; presigned_url: string }[]>([]);

  useEffect(() => {
    if (provider) {
      providersApi.listDocuments(provider.id).then(setDocs).catch(() => {});
    }
  }, [provider]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (provider) {
        await providersApi.update(provider.id, { ...form });
      } else {
        await providersApi.create({ ...form, npi: form.npi });
      }
      if (docFile && provider) {
        await providersApi.uploadDocument(provider.id, docFile);
      }
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!provider || !confirm("Delete this provider?")) return;
    await providersApi.delete(provider.id);
    onClose();
  };

  const field = (
    label: string,
    key: keyof typeof form,
    type = "text",
    disabled = false
  ) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        disabled={disabled || !isAdmin}
        value={String(form[key])}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full border rounded-md px-3 py-1.5 text-sm disabled:bg-slate-50"
      />
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 h-full w-full sm:w-[460px] bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-slate-800">
            {provider ? "Provider Details" : "New Provider"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            ×
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {field("NPI *", "npi", "text", !!provider)}
          {field("Full Name *", "full_name")}
          {field("Organization", "organization")}
          <div className="grid grid-cols-2 gap-3">
            {field("City", "city")}
            {field("State (2-letter)", "state")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("ZIP Code", "zip_code")}
            {field("Phone", "phone")}
          </div>
          {field("Email", "email", "email")}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Specialties</label>
            <select
              multiple
              disabled={!isAdmin}
              value={form.specialty_ids.map(String)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  specialty_ids: Array.from(e.target.selectedOptions, (o) => Number(o.value)),
                }))
              }
              className="w-full border rounded-md px-3 py-1.5 text-sm h-24"
            >
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              <label htmlFor="is_active" className="text-sm text-slate-700">Active</label>
            </div>
          )}

          {/* Document upload */}
          {provider && (
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">Documents</p>
              {docs.length > 0 ? (
                <ul className="space-y-1 mb-3">
                  {docs.map((d) => (
                    <li key={d.presigned_url}>
                      <a
                        href={d.presigned_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {d.filename}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 mb-2">No documents uploaded.</p>
              )}
              {isAdmin && (
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.csv"
                  onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                  className="text-sm"
                />
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {isAdmin && (
          <div className="px-6 py-4 border-t flex gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-md disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {provider && (
              <button
                onClick={del}
                className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
