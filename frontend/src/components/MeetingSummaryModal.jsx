import { useEffect, useState } from "react";
import api from "@/lib/api";
import { X, Trophy, Users, CheckCircle2, XCircle, Clock, Activity, Sparkles, Video, Film, Download } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = {
  attended: "#00C853",
  missed: "#FF3333",
  pending: "#9CA3AF",
};

export default function MeetingSummaryModal({ meetingId, onClose }) {
  const [s, setS] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/meetings/${meetingId}/summary`)
      .then((r) => setS(r.data))
      .catch((e) => setError(e.response?.data?.detail || e.message));
  }, [meetingId]);

  const downloadText = () => {
    if (!s) return;
    const lines = [
      `MEETING SUMMARY — ${s.title}`,
      `=${"=".repeat(50)}`,
      `Status: ${s.status}`,
      `Final slot: ${s.final_slot_label}`,
      `Duration: ${s.duration_minutes} min`,
      `Votes: ${s.total_votes}`,
      `Attended: ${s.attended} / ${s.total_invited} (${s.attendance_rate}%)`,
      `Missed: ${s.missed}`,
      `Engagement score: ${s.engagement_score}/100`,
      `Meeting link: ${s.meeting_link || "—"}`,
      `Recording link: ${s.recording_link || "—"}`,
      ``,
      `NARRATIVE`,
      s.narrative,
      ``,
      `MISSED USERS`,
      ...(s.missed_users.length ? s.missed_users : ["(none)"]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${s.title}-summary.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-auto" data-testid="meeting-summary-modal">
      <div className="relative w-full max-w-3xl bg-white nb-border nb-shadow-lg p-6 sm:p-8 my-8">
        <button onClick={onClose} data-testid="summary-close" className="absolute top-3 right-3 nb-border bg-white p-1.5 nb-press" aria-label="close">
          <X className="w-4 h-4"/>
        </button>

        <div className="flex items-start gap-3 mb-6">
          <div className="w-11 h-11 bg-[var(--hh-blue)] text-white nb-border flex items-center justify-center">
            <Sparkles className="w-6 h-6" strokeWidth={2.5}/>
          </div>
          <div>
            <div className="mono-label text-[var(--hh-blue)]">[ ai meeting summary ]</div>
            <h3 className="font-display text-2xl sm:text-3xl font-black leading-tight">{s?.title || "Loading..."}</h3>
            {s && <div className="mono-label mt-1 text-[var(--hh-muted)]">status: {s.status} · duration: {s.duration_minutes} min</div>}
          </div>
        </div>

        {error && <div className="nb-border bg-[var(--hh-error)] text-white p-3 font-mono text-xs">{error}</div>}

        {s && (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5" data-testid="summary-stats">
              {[
                { label: "Votes", value: s.total_votes, icon: Users, bg: "bg-white" },
                { label: "Attended", value: s.attended, icon: CheckCircle2, bg: "bg-[var(--hh-success)] text-white" },
                { label: "Missed", value: s.missed, icon: XCircle, bg: "bg-[var(--hh-error)] text-white" },
                { label: "Attendance", value: `${s.attendance_rate}%`, icon: Activity, bg: "bg-[var(--hh-amber)]" },
              ].map(({ label, value, icon: Icon, bg }) => (
                <div key={label} className={`nb-border nb-shadow p-4 ${bg}`}>
                  <Icon className="w-4 h-4" strokeWidth={2.5}/>
                  <div className="mono-label mt-2 opacity-80">{label}</div>
                  <div className="font-display text-3xl font-black mt-1">{value}</div>
                </div>
              ))}
            </div>

            {/* Donut + narrative */}
            <div className="grid lg:grid-cols-5 gap-5 mb-5">
              <div className="lg:col-span-2 bg-white nb-border nb-shadow p-4">
                <div className="mono-label mb-2">[ attendance mix ]</div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Attended", value: s.attended },
                          { name: "Missed", value: s.missed },
                          { name: "Pending", value: Math.max(0, s.total_invited - s.attended - s.missed) },
                        ]}
                        innerRadius={48}
                        outerRadius={80}
                        paddingAngle={2}
                        strokeWidth={2}
                        stroke="#0A0A0A"
                        dataKey="value"
                      >
                        <Cell fill={COLORS.attended}/>
                        <Cell fill={COLORS.missed}/>
                        <Cell fill={COLORS.pending}/>
                      </Pie>
                      <Tooltip contentStyle={{ border: "2px solid #0A0A0A", borderRadius: 0, fontFamily: "IBM Plex Mono" }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-3 justify-center flex-wrap mt-2 text-xs font-mono">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 nb-border" style={{ background: COLORS.attended }}/>attended</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 nb-border" style={{ background: COLORS.missed }}/>missed</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 nb-border" style={{ background: COLORS.pending }}/>pending</span>
                </div>
              </div>

              <div className="lg:col-span-3 space-y-3">
                <div className="bg-white nb-border nb-shadow p-4">
                  <div className="mono-label mb-2">[ engagement score ]</div>
                  <div className="flex items-end gap-3">
                    <div className="font-display text-5xl font-black">{s.engagement_score}<span className="text-2xl">/100</span></div>
                  </div>
                  <div className="h-3 nb-border bg-[var(--hh-surface-alt)] mt-2 overflow-hidden">
                    <div className="h-full bg-[var(--hh-blue)] transition-all duration-700" style={{ width: `${s.engagement_score}%` }}/>
                  </div>
                </div>

                <div className="nb-border bg-[var(--hh-amber)] p-4 flex items-center gap-3">
                  <Trophy className="w-5 h-5" strokeWidth={2.5}/>
                  <div>
                    <div className="mono-label">final slot</div>
                    <div className="font-display font-bold">{s.final_slot_label}</div>
                  </div>
                </div>

                <div className="bg-white nb-border p-4">
                  <div className="mono-label mb-1">[ narrative ]</div>
                  <p className="text-sm leading-relaxed">{s.narrative}</p>
                </div>
              </div>
            </div>

            {/* Missed list */}
            {s.missed_users.length > 0 && (
              <div className="bg-white nb-border nb-shadow p-4 mb-5">
                <div className="mono-label mb-2">[ missed users · {s.missed_users.length} ]</div>
                <div className="flex flex-wrap gap-2">
                  {s.missed_users.map((u, i) => (
                    <span key={i} className="nb-border bg-[var(--hh-error)] text-white px-2 py-1 font-mono text-xs">{u}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {s.meeting_link && (
                <a href={s.meeting_link} target="_blank" rel="noreferrer" data-testid="summary-jitsi-link" className="nb-border bg-[var(--hh-amber)] nb-shadow nb-press px-4 py-2 font-display font-bold uppercase text-sm flex items-center gap-2">
                  <Video className="w-4 h-4" strokeWidth={2.5}/> Join room
                </a>
              )}
              {s.recording_link && (
                <a href={s.recording_link} target="_blank" rel="noreferrer" data-testid="summary-recording-link" className="nb-border bg-black text-[var(--hh-amber)] nb-shadow nb-press px-4 py-2 font-display font-bold uppercase text-sm flex items-center gap-2">
                  <Film className="w-4 h-4" strokeWidth={2.5}/> Watch recording
                </a>
              )}
              <button onClick={downloadText} data-testid="summary-download-btn" className="nb-border bg-white nb-press px-4 py-2 font-display font-bold uppercase text-sm flex items-center gap-2">
                <Download className="w-4 h-4" strokeWidth={2.5}/> Download .txt
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
