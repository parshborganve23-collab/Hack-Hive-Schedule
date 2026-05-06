import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import Layout from "@/components/Layout";
import { CalendarClock, Vote, Trophy, CheckCircle2, ArrowUpRight, Users } from "lucide-react";

const STATUS_STYLES = {
  voting: "bg-[var(--hh-amber)]",
  finalized: "bg-[var(--hh-blue)] text-white",
  completed: "bg-black text-[var(--hh-amber)]",
};

function formatRange(slot) {
  if (!slot) return "—";
  const s = new Date(slot.start);
  const e = new Date(slot.end);
  return `${s.toLocaleString([], { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} → ${e.toLocaleString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function Dashboard() {
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      // Auto-finalize first
      await api.post("/meetings/auto-finalize").catch(() => {});
      const [m, s] = await Promise.all([api.get("/meetings"), api.get("/dashboard/stats")]);
      setMeetings(m.data);
      setStats(s.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cards = [
    { k: "total_meetings", label: "Total meetings", icon: CalendarClock, color: "bg-white" },
    { k: "active_polls", label: "Active polls", icon: Vote, color: "bg-[var(--hh-amber)]" },
    { k: "finalized_meetings", label: "Finalized", icon: Trophy, color: "bg-[var(--hh-blue)] text-white" },
    { k: "completed_meetings", label: "Completed", icon: CheckCircle2, color: "bg-black text-[var(--hh-amber)]" },
  ];

  return (
    <Layout>
      <div className="mb-8">
        <div className="mono-label">[ command center ]</div>
        <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight mt-1">Hive Dashboard</h1>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10" data-testid="dashboard-stats">
        {cards.map(({ k, label, icon: Icon, color }) => (
          <div key={k} className={`nb-border nb-shadow p-5 ${color}`} data-testid={`stat-${k}`}>
            <Icon className="w-5 h-5" strokeWidth={2.5} />
            <div className="mono-label mt-3 opacity-80">{label}</div>
            <div className="font-display text-4xl font-black mt-1">{stats?.[k] ?? "—"}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-end mb-4">
        <div>
          <div className="mono-label">[ your meetings ]</div>
          <h2 className="font-display text-2xl font-bold mt-1">All scheduled · {meetings.length}</h2>
        </div>
        <Link to="/meetings/new" data-testid="dashboard-new-meeting" className="bg-[var(--hh-amber)] nb-border nb-shadow nb-press px-4 py-2 font-display font-bold uppercase text-sm">+ New</Link>
      </div>

      {loading ? (
        <div className="font-mono text-sm">Loading...</div>
      ) : meetings.length === 0 ? (
        <div className="bg-white nb-border nb-shadow p-10 text-center">
          <div className="font-display text-2xl font-bold mb-2">No meetings yet</div>
          <p className="text-[var(--hh-muted)] mb-6">Create your first poll. Add a few slots, share the link, watch the votes roll in.</p>
          <Link to="/meetings/new" data-testid="dashboard-empty-cta" className="bg-[var(--hh-amber)] nb-border nb-shadow nb-press px-5 py-3 font-display font-bold uppercase">Create meeting</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="meetings-list">
          {meetings.map((m) => (
            <Link
              key={m.id}
              to={`/meetings/${m.id}`}
              data-testid={`meeting-card-${m.id}`}
              className="bg-white nb-border nb-shadow nb-press p-5 block"
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`mono-label nb-border px-2 py-1 ${STATUS_STYLES[m.status] || "bg-white"}`}>{m.status}</span>
                <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
              </div>
              <div className="font-display text-xl font-bold mb-1">{m.title}</div>
              <div className="text-xs text-[var(--hh-muted)] mb-3 line-clamp-2">{m.description || "No description"}</div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1"><Users className="w-3 h-3"/> {m.total_votes} votes</span>
                <span>·</span>
                <span>{m.slots.length} slots</span>
              </div>
              {m.final_slot && (
                <div className="mt-3 nb-border bg-[var(--hh-amber)] px-2 py-1 text-xs font-mono">
                  ★ {formatRange(m.final_slot)}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
