import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import Layout from "@/components/Layout";
import { Bell, CheckCheck } from "lucide-react";

const TYPE_COLORS = {
  meeting_created: "bg-[var(--hh-amber)]",
  meeting_finalized: "bg-[var(--hh-blue)] text-white",
  recording_available: "bg-black text-[var(--hh-amber)]",
};

export default function Notifications() {
  const [items, setItems] = useState([]);

  const load = async () => {
    const { data } = await api.get("/notifications");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read`);
    load();
  };
  const markAll = async () => {
    await api.post("/notifications/read-all");
    load();
  };

  return (
    <Layout>
      <div className="flex justify-between items-end mb-6">
        <div>
          <div className="mono-label">[ inbox ]</div>
          <h1 className="font-display text-4xl font-black mt-1">Notifications · {items.length}</h1>
        </div>
        <button data-testid="mark-all-read" onClick={markAll} className="nb-border bg-white nb-press px-4 py-2 font-display font-bold uppercase text-sm flex items-center gap-2">
          <CheckCheck className="w-4 h-4"/> mark all read
        </button>
      </div>

      <div className="space-y-3" data-testid="notifications-list">
        {items.length === 0 && (
          <div className="bg-white nb-border nb-shadow p-10 text-center">
            <Bell className="w-8 h-8 mx-auto mb-3"/>
            <div className="font-display text-xl font-bold">All quiet in the hive.</div>
            <p className="text-[var(--hh-muted)] text-sm mt-2">You'll see vote and meeting updates here.</p>
          </div>
        )}
        {items.map((n) => (
          <div key={n.id} className={`nb-border nb-shadow p-4 flex justify-between items-start ${n.read ? "bg-white opacity-70" : "bg-white"}`} data-testid={`notification-${n.id}`}>
            <div className="flex gap-3 items-start">
              <span className={`mono-label nb-border px-2 py-1 ${TYPE_COLORS[n.type] || "bg-white"}`}>{n.type.replace(/_/g, " ")}</span>
              <div>
                <div className="font-display font-bold">{n.message}</div>
                <div className="font-mono text-xs text-[var(--hh-muted)] mt-1">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            </div>
            <div className="flex gap-2">
              {n.meeting_id && (
                <Link to={`/meetings/${n.meeting_id}`} className="nb-border bg-white nb-press px-3 py-1 font-display font-bold text-xs uppercase">open</Link>
              )}
              {!n.read && (
                <button data-testid={`mark-read-${n.id}`} onClick={() => markRead(n.id)} className="nb-border bg-[var(--hh-amber)] nb-press px-3 py-1 font-display font-bold text-xs uppercase">read</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
