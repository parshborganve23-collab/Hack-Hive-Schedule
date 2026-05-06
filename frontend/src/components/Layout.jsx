import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, CalendarDays, Bell, BarChart3, Plus, LogOut, Hexagon } from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, testid: "nav-calendar" },
  { to: "/notifications", label: "Inbox", icon: Bell, testid: "nav-notifications" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, testid: "nav-analytics" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="bg-white nb-border border-l-0 border-r-0 border-t-0 sticky top-0 z-40" data-testid="app-topbar">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 group" data-testid="brand-link">
            <div className="w-9 h-9 bg-[var(--hh-amber)] nb-border flex items-center justify-center">
              <Hexagon className="w-5 h-5" strokeWidth={3} />
            </div>
            <div className="leading-tight">
              <div className="font-display font-bold text-lg">HackHive</div>
              <div className="mono-label text-[var(--hh-muted)]">Schedule</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon, testid }) => (
              <NavLink
                key={to}
                to={to}
                data-testid={testid}
                className={({ isActive }) =>
                  `px-3 py-2 nb-border font-display font-semibold text-sm flex items-center gap-2 ${
                    isActive ? "bg-[var(--hh-amber)]" : "bg-white hover:bg-[var(--hh-surface-alt)]"
                  }`
                }
              >
                <Icon className="w-4 h-4" strokeWidth={2.5} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              data-testid="new-meeting-btn"
              onClick={() => navigate("/meetings/new")}
              className="bg-[var(--hh-blue)] text-white nb-border nb-shadow nb-press px-4 py-2 font-display font-bold text-sm uppercase flex items-center gap-2"
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
              New Meeting
            </button>
            <div className="hidden sm:flex items-center gap-2 nb-border bg-white px-3 py-2">
              <div className="w-7 h-7 bg-black text-[var(--hh-amber)] flex items-center justify-center font-display font-bold text-sm">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="leading-tight">
                <div className="text-xs font-bold" data-testid="user-name">{user?.name}</div>
                <div className="mono-label text-[var(--hh-muted)]">{user?.role}</div>
              </div>
            </div>
            <button
              data-testid="logout-btn"
              onClick={async () => { await logout(); navigate("/login"); }}
              className="nb-border bg-white nb-press p-2"
              title="Logout"
            >
              <LogOut className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden border-t-2 border-black overflow-x-auto">
          <div className="flex">
            {navItems.map(({ to, label, icon: Icon, testid }) => (
              <NavLink
                key={to}
                to={to}
                data-testid={`${testid}-mobile`}
                className={({ isActive }) =>
                  `flex-1 px-3 py-2 font-display font-semibold text-xs flex items-center gap-1 justify-center ${
                    isActive ? "bg-[var(--hh-amber)]" : "bg-white"
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-8 hex-bg">
        {children}
      </main>

      <footer className="border-t-2 border-black bg-white py-4 mt-8">
        <div className="max-w-[1400px] mx-auto px-6 flex justify-between items-center">
          <div className="mono-label">© HackHive Schedule</div>
          <div className="mono-label text-[var(--hh-muted)]">build with chaos · ship with order</div>
        </div>
      </footer>
    </div>
  );
}
