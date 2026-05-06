import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Video, Download, Share2, CheckCircle2, XCircle, Clock, Lock, Film, BellRing } from "lucide-react";

function fmt(slot) {
  const s = new Date(slot.start);
  const e = new Date(slot.end);
  return `${s.toLocaleString([], { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} → ${e.toLocaleString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function MeetingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [m, setM] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recordingInput, setRecordingInput] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get(`/meetings/${id}`);
      setM(data);
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    }
  };
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  if (error) return <Layout><div className="nb-border bg-[var(--hh-error)] text-white p-4 font-mono text-sm">{error}</div></Layout>;
  if (!m) return <Layout><div className="font-mono text-sm">Loading...</div></Layout>;

  const isHost = user?.id === m.created_by;
  const maxVotes = Math.max(1, ...Object.values(m.vote_tally));
  const deadlinePassed = new Date(m.deadline) < new Date();

  const vote = async (slotId) => {
    setBusy(true); setError("");
    try {
      const { data } = await api.post(`/meetings/${id}/vote`, { slot_id: slotId });
      setM(data);
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally { setBusy(false); }
  };

  const finalize = async () => {
    setBusy(true); setError("");
    try {
      const { data } = await api.post(`/meetings/${id}/finalize`);
      setM(data);
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally { setBusy(false); }
  };

  const markAttendance = async (uid, status) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/meetings/${id}/attendance`, { user_id: uid, status });
      setM(data);
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally { setBusy(false); }
  };

  const saveRecording = async () => {
    if (!recordingInput) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/meetings/${id}/recording`, { recording_link: recordingInput });
      setM(data); setRecordingInput("");
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally { setBusy(false); }
  };

  const downloadIcs = async () => {
    const res = await api.get(`/meetings/${id}/ics`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url; a.download = `${m.title}.ics`; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = async () => {
    const res = await api.get(`/meetings/${id}/export.csv`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url; a.download = `${m.title}-export.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const sendReminder = async () => {
    setBusy(true); setError("");
    try {
      const { data } = await api.post(`/meetings/${id}/send-reminder`);
      setError(""); // clear
      alert(`Reminder sent to ${data.sent} attendee(s).`);
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally { setBusy(false); }
  };

  const shareLink = `${window.location.origin}/poll/${m.poll_token}`;
  const copyShare = async () => {
    await navigator.clipboard.writeText(shareLink);
  };

  return (
    <Layout>
      <Link to="/dashboard" className="mono-label hover:underline">← back to dashboard</Link>

      <div className="grid lg:grid-cols-3 gap-6 mt-3">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white nb-border nb-shadow p-6">
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="mono-label">[ {m.status} · {m.meeting_type} ]</div>
                <h1 className="font-display text-3xl sm:text-4xl font-black mt-1" data-testid="meeting-title">{m.title}</h1>
                {m.description && <p className="mt-3 text-[var(--hh-muted)]">{m.description}</p>}
              </div>
              {m.status === "voting" && (
                <div className="text-right">
                  <div className="mono-label">deadline</div>
                  <div className={`font-mono text-sm mt-1 ${deadlinePassed ? "text-[var(--hh-error)]" : ""}`}>
                    {new Date(m.deadline).toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {m.final_slot && (
              <div className="mt-5 nb-border bg-[var(--hh-amber)] p-4 flex items-center gap-3" data-testid="final-slot-banner">
                <Trophy className="w-6 h-6" strokeWidth={2.5}/>
                <div>
                  <div className="mono-label">finalized slot</div>
                  <div className="font-display text-xl font-bold">{fmt(m.final_slot)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Slots / Voting */}
          <div className="bg-white nb-border nb-shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-2xl font-bold">Vote on slots</h2>
              <div className="mono-label">{m.total_votes} votes total</div>
            </div>

            <div className="space-y-3" data-testid="slots-list">
              {m.slots.map((s) => {
                const count = m.vote_tally[s.id] || 0;
                const isWinner = m.final_slot?.id === s.id;
                const isMine = m.user_vote === s.id;
                return (
                  <button
                    key={s.id}
                    data-testid={`vote-slot-${s.id}`}
                    onClick={() => vote(s.id)}
                    disabled={busy || m.status !== "voting" || deadlinePassed}
                    className={`w-full nb-border p-4 text-left block disabled:cursor-not-allowed ${
                      isWinner ? "bg-[var(--hh-amber)]" : isMine ? "bg-[var(--hh-blue)] text-white" : "bg-white hover:bg-[var(--hh-surface-alt)]"
                    } ${m.status === "voting" && !deadlinePassed ? "nb-press cursor-pointer" : ""}`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-display font-bold text-lg">{fmt(s)}</div>
                      <div className="font-mono text-sm">{count} votes</div>
                    </div>
                    <div className={`h-2 nb-border mt-2 overflow-hidden ${isMine ? "bg-white" : "bg-white"}`}>
                      <div className={`h-full ${isMine ? "bg-[var(--hh-amber)]" : "bg-black"}`} style={{ width: `${(count / maxVotes) * 100}%` }} />
                    </div>
                    <div className="flex gap-2 mt-2">
                      {isMine && <span className="mono-label nb-border bg-white text-black px-2 py-0.5">your vote</span>}
                      {isWinner && <span className="mono-label nb-border bg-black text-[var(--hh-amber)] px-2 py-0.5">★ winner</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            {error && <div className="nb-border bg-[var(--hh-error)] text-white p-3 mt-4 font-mono text-xs" data-testid="vote-error">{error}</div>}
          </div>

          {/* Attendance section (host only, after finalized) */}
          {isHost && (m.status === "finalized" || m.status === "completed") && (
            <div className="bg-white nb-border nb-shadow p-6" data-testid="attendance-section">
              <h2 className="font-display text-2xl font-bold mb-4">Attendance</h2>
              <div className="space-y-2">
                {m.attendees.length === 0 && <div className="font-mono text-sm">No attendees yet.</div>}
                {m.attendees.map((a) => (
                  <div key={a.user_id} className="nb-border bg-[var(--hh-surface-alt)] p-3 flex justify-between items-center">
                    <div>
                      <div className="font-display font-bold">{a.user_name}</div>
                      <div className="font-mono text-xs text-[var(--hh-muted)]">{a.user_email}</div>
                    </div>
                    <div className="flex gap-2">
                      <span className={`mono-label nb-border px-2 py-1 ${a.status === "attended" ? "bg-[var(--hh-success)] text-white" : a.status === "missed" ? "bg-[var(--hh-error)] text-white" : "bg-white"}`}>
                        {a.status}
                      </span>
                      <button
                        data-testid={`mark-attended-${a.user_id}`}
                        onClick={() => markAttendance(a.user_id, "attended")}
                        className="nb-border bg-white nb-press p-2"
                        title="Mark attended"
                      ><CheckCircle2 className="w-4 h-4 text-[var(--hh-success)]"/></button>
                      <button
                        data-testid={`mark-missed-${a.user_id}`}
                        onClick={() => markAttendance(a.user_id, "missed")}
                        className="nb-border bg-white nb-press p-2"
                        title="Mark missed"
                      ><XCircle className="w-4 h-4 text-[var(--hh-error)]"/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white nb-border nb-shadow p-5 space-y-3">
            <div className="mono-label">[ actions ]</div>
            {isHost && m.status === "voting" && (
              <button
                data-testid="finalize-btn"
                onClick={finalize}
                disabled={busy || m.total_votes === 0}
                className="w-full bg-[var(--hh-blue)] text-white nb-border nb-shadow nb-press p-3 font-display font-bold uppercase text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Lock className="w-4 h-4" strokeWidth={3}/> Finalize now
              </button>
            )}

            {isHost && (m.status === "finalized" || m.status === "completed") && m.attendees?.length > 0 && (
              <button
                data-testid="send-reminder-btn"
                onClick={sendReminder}
                disabled={busy}
                className="w-full bg-black text-[var(--hh-amber)] nb-border nb-shadow nb-press p-3 font-display font-bold uppercase text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <BellRing className="w-4 h-4" strokeWidth={3}/> Send reminder now
              </button>
            )}

            {m.meeting_link && (
              <a
                data-testid="join-link"
                href={m.meeting_link} target="_blank" rel="noreferrer"
                className="w-full bg-[var(--hh-amber)] nb-border nb-shadow nb-press p-3 font-display font-bold uppercase text-sm flex items-center justify-center gap-2"
              >
                <Video className="w-4 h-4" strokeWidth={3}/> Join Jitsi room
              </a>
            )}

            <button
              data-testid="copy-share-link"
              onClick={copyShare}
              className="w-full bg-white nb-border nb-press p-3 font-display font-bold uppercase text-sm flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" strokeWidth={2.5}/> Copy poll link
            </button>

            <button
              data-testid="download-ics"
              onClick={downloadIcs}
              className="w-full bg-white nb-border nb-press p-3 font-display font-bold uppercase text-sm flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" strokeWidth={2.5}/> Download .ics
            </button>

            <button
              data-testid="download-csv"
              onClick={downloadCsv}
              className="w-full bg-white nb-border nb-press p-3 font-display font-bold uppercase text-sm flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" strokeWidth={2.5}/> Export votes/attendance CSV
            </button>
          </div>

          <div className="bg-white nb-border nb-shadow p-5">
            <div className="mono-label">[ share ]</div>
            <div className="font-mono text-xs break-all mt-2 nb-border bg-[var(--hh-surface-alt)] p-2" data-testid="share-link-display">{shareLink}</div>
          </div>

          {isHost && (m.status === "finalized" || m.status === "completed") && (
            <div className="bg-white nb-border nb-shadow p-5">
              <div className="mono-label mb-2">[ recording ]</div>
              {m.recording_link ? (
                <a href={m.recording_link} target="_blank" rel="noreferrer" data-testid="recording-link" className="font-mono text-xs underline break-all">{m.recording_link}</a>
              ) : (
                <div className="text-xs text-[var(--hh-muted)] mb-2">No recording yet. Drop a link below — missed users will be notified.</div>
              )}
              <input
                data-testid="recording-link-input"
                value={recordingInput}
                onChange={(e) => setRecordingInput(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full nb-border bg-white p-2 mt-2 focus:outline-none text-xs"
              />
              <button
                data-testid="save-recording-btn"
                onClick={saveRecording} disabled={busy || !recordingInput}
                className="w-full bg-black text-[var(--hh-amber)] nb-border nb-shadow nb-press p-2 mt-2 font-display font-bold uppercase text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Film className="w-3 h-3" strokeWidth={3}/> Save recording
              </button>
            </div>
          )}

          {/* Voters list */}
          <div className="bg-white nb-border nb-shadow p-5">
            <div className="mono-label mb-2">[ voters · {m.total_votes} ]</div>
            <div className="space-y-1 max-h-60 overflow-auto">
              {m.votes?.map((v) => (
                <div key={v.user_id} className="text-xs font-mono nb-border bg-[var(--hh-surface-alt)] px-2 py-1 flex justify-between">
                  <span>{v.user_name}</span>
                  <Clock className="w-3 h-3 text-[var(--hh-muted)]"/>
                </div>
              ))}
              {(!m.votes || m.votes.length === 0) && <div className="text-xs text-[var(--hh-muted)]">No votes yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
