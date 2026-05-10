import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  ActivityIcon,
  HomeIcon,
  LogOutIcon,
  MenuIcon,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col",
          "transition-transform duration-200 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
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
                onClick={() => setSidebarOpen(false)}
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
      <main className="flex-1 overflow-auto bg-slate-50 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 text-white shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-300 hover:text-white p-1 -ml-1"
            aria-label="Open navigation"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <span className="font-bold text-sm">HCMS Portal</span>
        </div>

        {/* Demo banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 md:px-6 py-2 flex items-center gap-2 text-xs text-amber-800 shrink-0">
          <span className="font-semibold shrink-0">Demo environment</span>
          <span className="text-amber-600 hidden sm:inline">·</span>
          <span className="hidden sm:inline">Portfolio project — AWS S3, CloudWatch &amp; Secrets Manager are stubbed out. No real patient data is stored.</span>
        </div>

        <div className="p-4 md:p-6 overflow-auto flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
