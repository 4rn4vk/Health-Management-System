import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  ActivityIcon,
  HomeIcon,
  LogOutIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { to: "/providers", label: "Providers", icon: UsersIcon },
  { to: "/claims", label: "Claims", icon: ActivityIcon },
  { to: "/upload", label: "Upload CSV", icon: UploadIcon, adminOnly: true },
];

export function AppShell() {
  const { role, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Federal Health IT
          </p>
          <h1 className="text-lg font-bold text-white mt-0.5">HCMS Portal</h1>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems
            .filter((item) => !item.adminOnly || role === "admin")
            .map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname.startsWith(to)
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
        </nav>
        <div className="px-3 py-4 border-t border-slate-700">
          <div className="flex items-center gap-2 px-3 mb-2">
            <span className="text-xs text-slate-400 uppercase font-semibold">{role}</span>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOutIcon className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-slate-50">
        {/* Demo banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 text-xs text-amber-800">
          <span className="font-semibold shrink-0">Demo environment</span>
          <span className="text-amber-600">·</span>
          <span>Portfolio project — AWS S3, CloudWatch &amp; Secrets Manager are stubbed out. No real patient data is stored.</span>
        </div>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
