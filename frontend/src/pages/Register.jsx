import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { Hexagon, ArrowRight } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await register(form);
      nav("/dashboard");
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-8 hex-bg order-2 lg:order-1">
        <form onSubmit={submit} className="w-full max-w-md bg-white nb-border nb-shadow-lg p-8" data-testid="register-form">
          <div className="mono-label">[ join the swarm ]</div>
          <h2 className="font-display text-3xl font-black mt-2 mb-6">Create account</h2>

          <label className="mono-label">Full name</label>
          <input
            data-testid="register-name-input"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required minLength={2}
            className="w-full nb-border bg-white p-3 mt-1 mb-4 focus:outline-none focus:nb-shadow-blue"
          />

          <label className="mono-label">Email</label>
          <input
            data-testid="register-email-input"
            type="email" value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
            className="w-full nb-border bg-white p-3 mt-1 mb-4 focus:outline-none focus:nb-shadow-blue"
          />

          <label className="mono-label">Password</label>
          <input
            data-testid="register-password-input"
            type="password" value={form.password} minLength={6}
            onChange={(e) => update("password", e.target.value)}
            required
            className="w-full nb-border bg-white p-3 mt-1 mb-4 focus:outline-none focus:nb-shadow-blue"
          />

          <label className="mono-label">Role</label>
          <div className="grid grid-cols-2 gap-2 mt-1 mb-4">
            {[
              { v: "admin", l: "Host / Admin" },
              { v: "participant", l: "Participant" },
            ].map((r) => (
              <button
                type="button"
                key={r.v}
                data-testid={`register-role-${r.v}`}
                onClick={() => update("role", r.v)}
                className={`nb-border p-3 font-display font-bold uppercase text-sm ${form.role === r.v ? "bg-[var(--hh-amber)] nb-shadow" : "bg-white"}`}
              >{r.l}</button>
            ))}
          </div>

          {error && (
            <div className="nb-border bg-[var(--hh-error)] text-white p-3 mb-4 font-mono text-xs" data-testid="register-error">{error}</div>
          )}

          <button
            data-testid="register-submit-btn"
            disabled={loading}
            className="w-full bg-[var(--hh-amber)] nb-border nb-shadow nb-press p-3 font-display font-bold uppercase flex items-center justify-center gap-2"
          >
            {loading ? "Creating..." : <>Create account <ArrowRight className="w-4 h-4" strokeWidth={3}/></>}
          </button>
          <div className="mt-6 text-sm">
            Already in?{" "}
            <Link to="/login" data-testid="register-go-login" className="font-bold underline">Sign in</Link>
          </div>
        </form>
      </div>

      <div className="hidden lg:flex bg-[var(--hh-blue)] text-white p-12 flex-col justify-between order-1 lg:order-2 border-l-2 border-black">
        <Link to="/" className="flex items-center gap-2" data-testid="register-brand">
          <div className="w-9 h-9 bg-[var(--hh-amber)] text-black nb-border flex items-center justify-center">
            <Hexagon className="w-5 h-5" strokeWidth={3} />
          </div>
          <div className="font-display font-bold text-lg">HackHive</div>
        </Link>
        <div>
          <div className="mono-label mb-2 text-[var(--hh-amber)]">[ swarm intelligence ]</div>
          <h1 className="font-display text-5xl font-black leading-[1]">
            Build a hive<br/>around great<br/>meetings.
          </h1>
          <p className="mt-6 max-w-md text-white/80">
            HackHive Schedule turns scheduling chaos into majority-vote precision —
            then ships your crew a Jitsi link and a calendar invite.
          </p>
        </div>
      </div>
    </div>
  );
}
