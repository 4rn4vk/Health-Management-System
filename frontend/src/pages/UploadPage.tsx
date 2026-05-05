import { useCallback, useEffect, useRef, useState } from "react";
import { uploadsApi } from "@/api";
import type { ClaimBatch } from "@/api/types";
import { cn, formatDate } from "@/lib/utils";

const BATCH_STATUS_COLORS: Record<string, string> = {
  processing: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
};

export function UploadPage() {
  const [batches, setBatches] = useState<ClaimBatch[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadBatches = useCallback(async () => {
    const data = await uploadsApi.listBatches();
    setBatches(data);
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Poll processing batches every 3 seconds
  useEffect(() => {
    const hasProcessing = batches.some((b) => b.status === "processing");
    if (hasProcessing && !pollingRef.current) {
      pollingRef.current = setInterval(loadBatches, 3000);
    } else if (!hasProcessing && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [batches, loadBatches]);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are accepted.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be under 10MB.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      await uploadsApi.uploadCsv(file);
      await loadBatches();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-xl font-bold text-slate-800">Upload Claims CSV</h2>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
          dragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {uploading ? (
          <p className="text-slate-500">Uploading…</p>
        ) : (
          <>
            <p className="text-slate-600 font-medium">Drop a CSV file here, or click to browse</p>
            <p className="text-xs text-slate-400 mt-1">Max 10MB · .csv only</p>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Required CSV columns hint */}
      <div className="bg-slate-50 border rounded-lg p-4 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700 text-sm mb-2">Required CSV columns</p>
        <p><code className="bg-white border px-1 rounded">claim_number</code> · <code className="bg-white border px-1 rounded">provider_npi</code> · <code className="bg-white border px-1 rounded">claim_type</code> (professional/institutional/dental)</p>
        <p><code className="bg-white border px-1 rounded">service_date</code> (YYYY-MM-DD) · <code className="bg-white border px-1 rounded">billed_amount</code></p>
        <p>Optional: <code className="bg-white border px-1 rounded">status</code> · <code className="bg-white border px-1 rounded">approved_amount</code> · <code className="bg-white border px-1 rounded">patient_id</code> · <code className="bg-white border px-1 rounded">diagnosis_code</code> · <code className="bg-white border px-1 rounded">procedure_code</code> · <code className="bg-white border px-1 rounded">notes</code></p>
      </div>

      {/* Batch history */}
      {batches.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Upload History</h3>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500 tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Filename</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Rows</th>
                  <th className="px-4 py-3 text-center">Imported</th>
                  <th className="px-4 py-3 text-center">Errors</th>
                  <th className="px-4 py-3 text-left">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{b.filename}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full capitalize", BATCH_STATUS_COLORS[b.status])}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{b.total_rows}</td>
                    <td className="px-4 py-3 text-center">{b.imported_rows}</td>
                    <td className="px-4 py-3 text-center">
                      {b.error_count > 0 ? (
                        <span className="text-red-600 font-medium" title={b.error_detail ?? ""}>
                          {b.error_count}
                        </span>
                      ) : "0"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
