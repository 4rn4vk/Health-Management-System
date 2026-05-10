import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { claimsApi } from "@/api";
import type { ClaimMetrics } from "@/api/types";
import { formatCurrency } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#10b981",
  denied: "#ef4444",
  paid: "#3b82f6",
};

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const [metrics, setMetrics] = useState<ClaimMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    claimsApi
      .metrics()
      .then(setMetrics)
      .catch(() => setError("Failed to load metrics."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500 py-12 text-center">Loading metrics…</div>;
  if (error || !metrics)
    return <div className="text-red-500 py-12 text-center">{error ?? "No data."}</div>;

  const total = Object.values(metrics.status_breakdown).reduce((a, b) => a + b, 0);
  const pieData = Object.entries(metrics.status_breakdown).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">Dashboard</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Claims" value={total.toLocaleString()} />
        <MetricCard
          label="Approved"
          value={`${metrics.status_breakdown["approved"] ?? 0}`}
        />
        <MetricCard
          label="Avg Processing"
          value={
            metrics.avg_processing_days != null
              ? `${metrics.avg_processing_days.toFixed(1)} days`
              : "—"
          }
        />
        <MetricCard
          label="Monthly Billed (latest)"
          value={
            metrics.monthly_billed.length
              ? formatCurrency(
                  metrics.monthly_billed[metrics.monthly_billed.length - 1].total_billed
                )
              : "—"
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Claim Status Pie */}
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Claims by Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Cost Line */}
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Monthly Billed vs Approved</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={metrics.monthly_billed}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Legend />
              <Line
                type="monotone"
                dataKey="total_billed"
                name="Billed"
                stroke="#3b82f6"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="total_approved"
                name="Approved"
                stroke="#10b981"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Provider Volume Bar */}
        <div className="bg-white rounded-xl border p-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Claims Volume by Provider (Top 10)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={metrics.provider_volume} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="provider_name"
                width={160}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar dataKey="claim_count" name="Claims" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
