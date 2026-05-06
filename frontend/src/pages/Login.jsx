import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { Hexagon, ArrowRight } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@hackhive.dev");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(email, password);
      nav("/dashboard");
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex bg-[var(--hh-amber)] border-r-2 border-black p-12 flex-col justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="login-brand">
          <div className="w-9 h-9 bg-black text-[var(--hh-amber)] nb-border flex items-center justify-center">
            <Hexagon className="w-5 h-5" strokeWidth={3} />
          </div>
          <div className="font-display font-bold text-lg">HackHive</div>
        </Link>
        <div>
          <div className="mono-label mb-2">[ welcome back ]</div>
          <h1 className="font-display text-5xl font-black leading-[1] mb-6">
            Pick a slot.<br/>Lock it in.<br/>Ship the room.
          </h1>
          <div className="bg-white nb-border nb-shadow p-4 inline-block -rotate-1">
            <div className="mono-label">demo creds</div>
            <div className="font-mono text-sm mt-1">admin@hackhive.dev</div>
            <div className="font-mono text-sm">admin123</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 hex-bg">
        <form onSubmit={submit} className="w-full max-w-md bg-white nb-border nb-shadow-lg p-8" data-testid="login-form">
          <div className="mono-label">[ 01 / sign in ]</div>
          <h2 className="font-display text-3xl font-black mt-2 mb-6">Login to your hive</h2>

          <label className="mono-label">Email</label>
          <input
            data-testid="login-email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full nb-border bg-white p-3 mt-1 mb-4 focus:outline-none focus:nb-shadow-blue"
          />

          <label className="mono-label">Password</label>
          <input
            data-testid="login-password-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full nb-border bg-white p-3 mt-1 mb-4 focus:outline-none focus:nb-shadow-blue"
          />

          {error && (
            <div className="nb-border bg-[var(--hh-error)] text-white p-3 mb-4 font-mono text-xs" data-testid="login-error">
              {error}
            </div>
          )}

          <button
            data-testid="login-submit-btn"
            disabled={loading}
            className="w-full bg-[var(--hh-amber)] nb-border nb-shadow nb-press p-3 font-display font-bold uppercase flex items-center justify-center gap-2"
          >
            {loading ? "Signing in..." : <>Sign in <ArrowRight className="w-4 h-4" strokeWidth={3}/></>}
          </button>

          <div className="mt-6 text-sm">
            New here?{" "}
            <Link to="/register" data-testid="login-go-register" className="font-bold underline">Create an account</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
