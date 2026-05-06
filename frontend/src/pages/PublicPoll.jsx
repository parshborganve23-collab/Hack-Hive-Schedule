import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import CountdownTimer from "@/components/CountdownTimer";
import { Hexagon, Trophy } from "lucide-react";

function fmt(slot) {
  const s = new Date(slot.start);
  const e = new Date(slot.end);
  return `${s.toLocaleString([], { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} → ${e.toLocaleString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function PublicPoll() {
  const { token } = useParams();
  const { user, ready } = useAuth();
  const nav = useNavigate();
  const [m, setM] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get(`/meetings/poll/${token}`);
      setM(data);
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    }
  };
  useEffect(() => { load(); }, [token]); // eslint-disable-line

  const vote = async (slotId) => {
    if (!user) { nav(`/login?next=/poll/${token}`); return; }
    try {
      const { data } = await api.post(`/meetings/${m.id}/vote`, { slot_id: slotId });
      setM(data);
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    }
  };

  const onDeadlineReached = async () => {
    try {
      await api.post("/meetings/auto-finalize");
      const { data } = await api.get(`/meetings/poll/${token}`);
      setM(data);
    } catch {}
  };

  if (!ready) return <div className="min-h-screen flex items-center justify-center hex-bg"><div className="mono-label">loading...</div></div>;
  if (error) return <div className="min-h-screen p-8 hex-bg"><div className="nb-border bg-[var(--hh-error)] text-white p-4 font-mono">{error}</div></div>;
  if (!m) return <div className="min-h-screen flex items-center justify-center hex-bg"><div className="mono-label">loading poll...</div></div>;

  const maxVotes = Math.max(1, ...Object.values(m.vote_tally));
  const deadlinePassed = new Date(m.deadline) < new Date();

  return (
    <div className="min-h-screen hex-bg">
      <header className="border-b-2 border-black bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--hh-amber)] nb-border flex items-center justify-center"><Hexagon className="w-4 h-4" strokeWidth={3}/></div>
            <div className="font-display font-bold">HackHive</div>
          </Link>
          {user ? (
            <Link to="/dashboard" className="nb-border bg-white nb-press px-3 py-1 mono-label">dashboard</Link>
          ) : (
            <Link to={`/login?next=/poll/${token}`} className="nb-border bg-[var(--hh-amber)] nb-shadow nb-press px-3 py-1 mono-label" data-testid="poll-login-cta">sign in to vote</Link>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white nb-border nb-shadow-lg p-8">
          <div className="mono-label">[ public poll · {m.status} ]</div>
          <h1 className="font-display text-3xl sm:text-5xl font-black mt-2" data-testid="poll-title">{m.title}</h1>
          {m.description && <p className="text-[var(--hh-muted)] mt-3">{m.description}</p>}

          {m.status === "voting" && (
            <div className="mt-4">
              <CountdownTimer target={m.deadline} onComplete={onDeadlineReached}/>
            </div>
          )}

          {m.final_slot && (
            <div className="mt-5 nb-border bg-[var(--hh-amber)] p-4 flex items-center gap-3">
              <Trophy className="w-6 h-6" strokeWidth={2.5}/>
              <div>
                <div className="mono-label">finalized</div>
                <div className="font-display text-xl font-bold">{fmt(m.final_slot)}</div>
              </div>
            </div>
          )}

          <div className="space-y-3 mt-6" data-testid="poll-slots">
            {m.slots.map((s) => {
              const count = m.vote_tally[s.id] || 0;
              const isMine = m.user_vote === s.id;
              const isWinner = m.final_slot?.id === s.id;
              return (
                <button
                  key={s.id}
                  data-testid={`poll-vote-${s.id}`}
                  onClick={() => vote(s.id)}
                  disabled={m.status !== "voting" || deadlinePassed}
                  className={`w-full nb-border p-4 text-left ${
                    isWinner ? "bg-[var(--hh-amber)]" : isMine ? "bg-[var(--hh-blue)] text-white" : "bg-white"
                  } ${m.status === "voting" && !deadlinePassed ? "nb-press cursor-pointer" : ""}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-display font-bold text-lg">{fmt(s)}</div>
                    <div className="font-mono text-sm">{count} votes</div>
                  </div>
                  <div className="h-2 nb-border mt-2 bg-white overflow-hidden">
                    <div className="h-full bg-black" style={{ width: `${(count / maxVotes) * 100}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
