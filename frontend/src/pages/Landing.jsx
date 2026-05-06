import { Link } from "react-router-dom";
import { Hexagon, ArrowRight, Vote, Calendar, Users, Bell, Video, Trophy } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--hh-bg)]">
      {/* Top */}
      <nav className="border-b-2 border-black bg-white">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[var(--hh-amber)] nb-border flex items-center justify-center">
              <Hexagon className="w-5 h-5" strokeWidth={3} />
            </div>
            <div className="leading-tight">
              <div className="font-display font-bold text-lg">HackHive</div>
              <div className="mono-label text-[var(--hh-muted)]">Schedule</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/login" data-testid="landing-login" className="nb-border bg-white nb-press px-4 py-2 font-display font-bold text-sm uppercase">Login</Link>
            <Link to="/register" data-testid="landing-register" className="nb-border bg-[var(--hh-amber)] nb-shadow nb-press px-4 py-2 font-display font-bold text-sm uppercase">Sign Up</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden border-b-2 border-black">
        <div className="hex-bg absolute inset-0 opacity-50" />
        <div className="relative max-w-[1400px] mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8">
            <div className="inline-block nb-border bg-white px-3 py-1 mb-6">
              <span className="mono-label">v1.0 · hackathon edition</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-[0.95]">
              Schedule meetings<br/>
              like a <span className="bg-[var(--hh-amber)] nb-border px-3 inline-block -rotate-1">hive mind</span>.
            </h1>
            <p className="mt-8 max-w-2xl text-lg text-[var(--hh-muted)] font-medium">
              Drop multiple time slots. Let your crew vote. We tally majority, lock the slot,
              ship a Jitsi link, and chase the no-shows with replay links. Zero spreadsheet drama.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" data-testid="hero-cta-primary" className="bg-[var(--hh-amber)] nb-border nb-shadow nb-press px-6 py-3 font-display font-bold uppercase flex items-center gap-2">
                Start scheduling <ArrowRight className="w-4 h-4" strokeWidth={3}/>
              </Link>
              <Link to="/login" data-testid="hero-cta-secondary" className="bg-white nb-border nb-shadow nb-press px-6 py-3 font-display font-bold uppercase">
                I have an account
              </Link>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-white nb-border nb-shadow-lg p-5 -rotate-2">
              <div className="mono-label mb-3">live poll · sprint sync</div>
              {[
                { t: "Tue 10:00 AM", v: 8, w: false },
                { t: "Tue 4:00 PM", v: 14, w: true },
                { t: "Wed 9:00 AM", v: 5, w: false },
              ].map((s, i) => (
                <div key={i} className={`nb-border mb-2 p-3 ${s.w ? "bg-[var(--hh-amber)]" : "bg-white"}`}>
                  <div className="flex justify-between items-center">
                    <div className="font-display font-bold">{s.t}</div>
                    <div className="font-mono text-xs">{s.v} votes</div>
                  </div>
                  <div className="h-2 nb-border mt-2 overflow-hidden bg-white">
                    <div className="h-full bg-black" style={{ width: `${(s.v / 14) * 100}%` }} />
                  </div>
                </div>
              ))}
              <div className="mono-label mt-3 text-[var(--hh-blue)]">winner → tue 4:00 pm</div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="border-b-2 border-black bg-black text-[var(--hh-amber)] py-3 overflow-hidden">
        <div className="marquee flex gap-12 whitespace-nowrap font-display text-2xl font-black uppercase">
          {Array(2).fill(0).map((_, k) => (
            <div key={k} className="flex gap-12 shrink-0">
              <span>★ Vote your slot</span>
              <span>★ Auto finalize</span>
              <span>★ Jitsi rooms</span>
              <span>★ ICS export</span>
              <span>★ Attendance tracking</span>
              <span>★ Replay for no-shows</span>
              <span>★ Hex grid analytics</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features bento */}
      <section className="max-w-[1400px] mx-auto px-6 py-16">
        <div className="mono-label mb-3">[ how it works ]</div>
        <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight mb-12 max-w-3xl">
          Six moves. Zero scheduling chaos.
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { i: Vote, t: "01 / Cast votes", d: "Each invitee picks one preferred slot. One person, one vote — duplicates rejected at the door." },
            { i: Trophy, t: "02 / Majority wins", d: "We auto-tally. Highest count locks. Or hit Finalize manually whenever you're ready." },
            { i: Video, t: "03 / Jitsi auto-room", d: "Meeting link generated on creation. Same room for everyone. No accounts needed." },
            { i: Calendar, t: "04 / Calendar export", d: "Download .ics or pop into Google Calendar with one click." },
            { i: Users, t: "05 / Attendance log", d: "Mark who showed. The system tags missed users automatically." },
            { i: Bell, t: "06 / Replay for absent", d: "Drop a recording link, missed users get a notification with the replay." },
          ].map(({ i: Icon, t, d }, k) => (
            <div key={k} className="bg-white nb-border nb-shadow p-6 hover:translate-x-1 hover:translate-y-1 hover:nb-shadow transition-transform">
              <div className="w-10 h-10 bg-[var(--hh-amber)] nb-border flex items-center justify-center mb-4">
                <Icon className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div className="font-display font-bold text-xl mb-2">{t}</div>
              <div className="text-sm text-[var(--hh-muted)] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t-2 border-black bg-[var(--hh-amber)]">
        <div className="max-w-[1400px] mx-auto px-6 py-16 grid lg:grid-cols-2 gap-8 items-center">
          <h3 className="font-display text-3xl sm:text-5xl font-black leading-[1]">
            Ready to schedule like a swarm?
          </h3>
          <div className="flex flex-wrap gap-4">
            <Link to="/register" data-testid="cta-register" className="bg-black text-[var(--hh-amber)] nb-border nb-shadow nb-press px-6 py-4 font-display font-bold uppercase">Create free account</Link>
            <Link to="/login" data-testid="cta-login" className="bg-white nb-border nb-shadow nb-press px-6 py-4 font-display font-bold uppercase">Sign in</Link>
          </div>
        </div>
      </section>

      <footer className="border-t-2 border-black bg-white py-6">
        <div className="max-w-[1400px] mx-auto px-6 flex justify-between items-center">
          <div className="mono-label">© HackHive Schedule</div>
          <div className="mono-label text-[var(--hh-muted)]">made for hackers</div>
        </div>
      </footer>
    </div>
  );
}
