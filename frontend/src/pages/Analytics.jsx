import { useEffect, useState } from "react";
import api from "@/lib/api";
import Layout from "@/components/Layout";

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    Promise.all([api.get("/dashboard/stats"), api.get("/meetings")]).then(([s, m]) => {
      setStats(s.data); setMeetings(m.data);
    });
  }, []);

  if (!stats) return <Layout><div className="font-mono text-sm">Loading...</div></Layout>;

  const totalAtt = stats.attendance.attended + stats.attendance.missed;
  const attendedPct = totalAtt ? Math.round((stats.attendance.attended / totalAtt) * 100) : 0;
  const totalVotes = meetings.reduce((s, m) => s + (m.total_votes || 0), 0);

  // Top meetings by votes
  const topByVotes = [...meetings].sort((a, b) => b.total_votes - a.total_votes).slice(0, 6);
  const maxVotes = Math.max(1, ...topByVotes.map((m) => m.total_votes));

  return (
    <Layout>
      <div className="mb-6">
        <div className="mono-label">[ analytics ]</div>
        <h1 className="font-display text-4xl font-black mt-1">Hive Telemetry</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-8">
        <div className="bg-white nb-border nb-shadow p-6">
          <div className="mono-label">total votes cast</div>
          <div className="font-display text-6xl font-black mt-2">{totalVotes}</div>
        </div>
        <div className="bg-[var(--hh-amber)] nb-border nb-shadow p-6">
          <div className="mono-label">active polls</div>
          <div className="font-display text-6xl font-black mt-2">{stats.active_polls}</div>
        </div>
        <div className="bg-[var(--hh-blue)] text-white nb-border nb-shadow p-6">
          <div className="mono-label">attendance rate</div>
          <div className="font-display text-6xl font-black mt-2">{attendedPct}%</div>
          <div className="mono-label mt-1 opacity-80">{stats.attendance.attended} attended · {stats.attendance.missed} missed</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white nb-border nb-shadow p-6">
          <div className="mono-label mb-3">[ top meetings · by votes ]</div>
          <div className="space-y-3" data-testid="top-meetings-chart">
            {topByVotes.map((m) => (
              <div key={m.id}>
                <div className="flex justify-between items-end">
                  <span className="font-display font-bold truncate">{m.title}</span>
                  <span className="font-mono text-xs">{m.total_votes}</span>
                </div>
                <div className="h-6 nb-border bg-[var(--hh-surface-alt)] mt-1 overflow-hidden">
                  <div className="h-full bg-black" style={{ width: `${(m.total_votes / maxVotes) * 100}%` }} />
                </div>
              </div>
            ))}
            {topByVotes.length === 0 && <div className="font-mono text-sm text-[var(--hh-muted)]">No data yet.</div>}
          </div>
        </div>

        <div className="bg-white nb-border nb-shadow p-6">
          <div className="mono-label mb-3">[ status breakdown ]</div>
          <div className="space-y-3">
            {[
              { k: "voting", l: "voting", c: "bg-[var(--hh-amber)]" },
              { k: "finalized", l: "finalized", c: "bg-[var(--hh-blue)]" },
              { k: "completed", l: "completed", c: "bg-black" },
            ].map((row) => {
              const v = meetings.filter((m) => m.status === row.k).length;
              return (
                <div key={row.k}>
                  <div className="flex justify-between items-end">
                    <span className="font-display font-bold uppercase">{row.l}</span>
                    <span className="font-mono text-xs">{v}</span>
                  </div>
                  <div className="h-6 nb-border bg-[var(--hh-surface-alt)] mt-1 overflow-hidden">
                    <div className={`h-full ${row.c}`} style={{ width: `${(v / Math.max(1, meetings.length)) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
