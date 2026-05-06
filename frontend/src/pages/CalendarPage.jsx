import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import Layout from "@/components/Layout";
import { Calendar as CalendarIcon, Download } from "lucide-react";

function ymd(d) { return d.toISOString().slice(0, 10); }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }

export default function CalendarPage() {
  const [meetings, setMeetings] = useState([]);
  const [cursor, setCursor] = useState(new Date());

  useEffect(() => {
    api.get("/meetings").then(({ data }) => setMeetings(data));
  }, []);

  const monthStart = startOfMonth(cursor);
  const offset = monthStart.getDay();
  const total = daysInMonth(cursor);
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));

  const meetingsByDay = {};
  for (const m of meetings) {
    const slot = m.final_slot || m.slots?.[0];
    if (!slot) continue;
    const key = ymd(new Date(slot.start));
    meetingsByDay[key] = meetingsByDay[key] || [];
    meetingsByDay[key].push(m);
  }

  return (
    <Layout>
      <div className="flex justify-between items-end mb-6">
        <div>
          <div className="mono-label">[ calendar ]</div>
          <h1 className="font-display text-4xl font-black mt-1">{cursor.toLocaleString([], { month: "long", year: "numeric" })}</h1>
        </div>
        <div className="flex gap-2">
          <button data-testid="cal-prev" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="nb-border bg-white nb-press px-3 py-2 font-display font-bold uppercase text-sm">◀ prev</button>
          <button data-testid="cal-today" onClick={() => setCursor(new Date())} className="nb-border bg-[var(--hh-amber)] nb-shadow nb-press px-3 py-2 font-display font-bold uppercase text-sm">today</button>
          <button data-testid="cal-next" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="nb-border bg-white nb-press px-3 py-2 font-display font-bold uppercase text-sm">next ▶</button>
        </div>
      </div>

      <div className="bg-white nb-border nb-shadow overflow-hidden">
        <div className="grid grid-cols-7 border-b-2 border-black">
          {["sun","mon","tue","wed","thu","fri","sat"].map((d) => (
            <div key={d} className="mono-label p-3 border-r-2 last:border-r-0 border-black">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7" data-testid="calendar-grid">
          {cells.map((c, i) => {
            const items = c ? meetingsByDay[ymd(c)] || [] : [];
            const isToday = c && ymd(c) === ymd(new Date());
            return (
              <div key={i} className={`min-h-[110px] p-2 border-r-2 border-b-2 last:border-r-0 border-black ${c ? "" : "bg-[var(--hh-surface-alt)]"}`}>
                {c && (
                  <>
                    <div className={`mono-label inline-block ${isToday ? "bg-black text-[var(--hh-amber)] px-1.5" : ""}`}>{c.getDate()}</div>
                    <div className="space-y-1 mt-1">
                      {items.slice(0, 3).map((m) => (
                        <Link
                          key={m.id} to={`/meetings/${m.id}`}
                          data-testid={`cal-meeting-${m.id}`}
                          className={`block nb-border text-xs font-mono px-1.5 py-1 truncate ${m.final_slot ? "bg-[var(--hh-amber)]" : "bg-white"}`}
                        >{m.title}</Link>
                      ))}
                      {items.length > 3 && <div className="mono-label text-[var(--hh-muted)]">+{items.length - 3} more</div>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <div className="mono-label">[ upcoming ]</div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
          {meetings.filter((m) => m.final_slot && new Date(m.final_slot.start) > new Date()).slice(0, 9).map((m) => (
            <Link key={m.id} to={`/meetings/${m.id}`} className="bg-white nb-border nb-shadow nb-press p-4 block">
              <CalendarIcon className="w-4 h-4 mb-2"/>
              <div className="font-display font-bold">{m.title}</div>
              <div className="font-mono text-xs text-[var(--hh-muted)] mt-1">
                {new Date(m.final_slot.start).toLocaleString()}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
