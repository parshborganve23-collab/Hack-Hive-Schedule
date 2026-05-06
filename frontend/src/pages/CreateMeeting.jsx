import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import Layout from "@/components/Layout";
import { Plus, Trash2, Sparkles } from "lucide-react";

function toLocalISO(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultSlots() {
  const now = new Date();
  now.setHours(now.getHours() + 24, 0, 0, 0);
  const make = (hour) => {
    const s = new Date(now); s.setHours(hour, 0, 0, 0);
    const e = new Date(s); e.setHours(hour + 1);
    return { start: toLocalISO(s), end: toLocalISO(e) };
  };
  return [make(10), make(14), make(18)];
}

export default function CreateMeeting() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    deadline: toLocalISO(new Date(Date.now() + 12 * 3600 * 1000)),
    participant_limit: 100,
    meeting_type: "group",
    invitees: "",
  });
  const [slots, setSlots] = useState(defaultSlots());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setSlot = (i, k, v) => setSlots((arr) => arr.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)));
  const addSlot = () => setSlots((arr) => [...arr, { start: arr.at(-1)?.end || toLocalISO(new Date()), end: toLocalISO(new Date(Date.now() + 3600 * 1000)) }]);
  const removeSlot = (i) => setSlots((arr) => arr.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        slots: slots.map((s) => ({ start: new Date(s.start).toISOString(), end: new Date(s.end).toISOString() })),
        deadline: new Date(form.deadline).toISOString(),
        participant_limit: Number(form.participant_limit),
        meeting_type: form.meeting_type,
        invitees: form.invitees.split(",").map((e) => e.trim()).filter(Boolean),
      };
      const { data } = await api.post("/meetings", payload);
      nav(`/meetings/${data.id}`);
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <div className="mono-label">[ new meeting ]</div>
        <h1 className="font-display text-4xl font-black mt-1">Drop your slots</h1>
        <p className="text-[var(--hh-muted)] mt-2 max-w-2xl">Add 2+ time options. Once you save, we'll generate a public poll link, a Jitsi room, and notify invitees.</p>
      </div>

      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6" data-testid="create-meeting-form">
        <div className="lg:col-span-2 bg-white nb-border nb-shadow p-6 space-y-4">
          <div>
            <label className="mono-label">Meeting title</label>
            <input
              data-testid="meeting-title-input"
              required value={form.title} onChange={(e) => update("title", e.target.value)}
              placeholder="Sprint planning · Week 23"
              className="w-full nb-border bg-white p-3 mt-1 focus:outline-none focus:nb-shadow-blue"
            />
          </div>
          <div>
            <label className="mono-label">Description</label>
            <textarea
              data-testid="meeting-description-input"
              rows={3} value={form.description} onChange={(e) => update("description", e.target.value)}
              placeholder="Agenda, links, what to bring..."
              className="w-full nb-border bg-white p-3 mt-1 focus:outline-none focus:nb-shadow-blue"
            />
          </div>

          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="mono-label">Time slots ({slots.length})</label>
              <button type="button" onClick={addSlot} data-testid="add-slot-btn" className="bg-white nb-border nb-press px-3 py-1.5 font-display font-bold text-xs uppercase flex items-center gap-1">
                <Plus className="w-3 h-3" strokeWidth={3}/> add slot
              </button>
            </div>
            <div className="space-y-2">
              {slots.map((s, i) => (
                <div key={i} className="nb-border bg-[var(--hh-surface-alt)] p-3 grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_auto] gap-2 items-center" data-testid={`slot-row-${i}`}>
                  <div className="mono-label w-12">#{String(i + 1).padStart(2, "0")}</div>
                  <input
                    data-testid={`slot-${i}-start`}
                    type="datetime-local" value={s.start} required
                    onChange={(e) => setSlot(i, "start", e.target.value)}
                    className="nb-border bg-white p-2 focus:outline-none"
                  />
                  <input
                    data-testid={`slot-${i}-end`}
                    type="datetime-local" value={s.end} required
                    onChange={(e) => setSlot(i, "end", e.target.value)}
                    className="nb-border bg-white p-2 focus:outline-none"
                  />
                  <button
                    type="button" onClick={() => removeSlot(i)}
                    data-testid={`remove-slot-${i}`}
                    disabled={slots.length <= 1}
                    className="nb-border bg-white p-2 nb-press disabled:opacity-40"
                  ><Trash2 className="w-4 h-4"/></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white nb-border nb-shadow p-6 space-y-3">
            <div>
              <label className="mono-label">Voting deadline</label>
              <input
                data-testid="meeting-deadline-input"
                type="datetime-local" required value={form.deadline}
                onChange={(e) => update("deadline", e.target.value)}
                className="w-full nb-border bg-white p-3 mt-1 focus:outline-none"
              />
            </div>
            <div>
              <label className="mono-label">Participant limit</label>
              <input
                data-testid="meeting-limit-input"
                type="number" min={1} max={1000} value={form.participant_limit}
                onChange={(e) => update("participant_limit", e.target.value)}
                className="w-full nb-border bg-white p-3 mt-1 focus:outline-none"
              />
            </div>
            <div>
              <label className="mono-label">Meeting type</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {["group", "private"].map((t) => (
                  <button
                    key={t} type="button"
                    data-testid={`type-${t}`}
                    onClick={() => update("meeting_type", t)}
                    className={`nb-border p-3 font-display font-bold uppercase text-sm ${form.meeting_type === t ? "bg-[var(--hh-amber)] nb-shadow" : "bg-white"}`}
                  >{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="mono-label">Invitee emails (comma separated)</label>
              <textarea
                data-testid="meeting-invitees-input"
                rows={3} value={form.invitees}
                onChange={(e) => update("invitees", e.target.value)}
                placeholder="alex@hive.dev, jordan@hive.dev"
                className="w-full nb-border bg-white p-3 mt-1 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="nb-border bg-[var(--hh-error)] text-white p-3 font-mono text-xs" data-testid="create-error">{error}</div>
          )}

          <button
            type="submit" disabled={loading}
            data-testid="create-meeting-submit-btn"
            className="w-full bg-[var(--hh-amber)] nb-border nb-shadow nb-press p-4 font-display font-bold uppercase flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" strokeWidth={3}/> {loading ? "Creating..." : "Create meeting"}
          </button>
        </div>
      </form>
    </Layout>
  );
}
