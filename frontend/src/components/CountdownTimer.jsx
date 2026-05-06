import { useEffect, useRef, useState } from "react";
import { Hourglass, Zap } from "lucide-react";

/**
 * CountdownTimer — live countdown to a target ISO datetime.
 *
 * Props:
 *   target: ISO date string (deadline)
 *   onComplete?: callback fired exactly once when deadline reaches 0
 *   compact?: small inline pill (default false = full card)
 *   label?: title text (default "Voting ends in")
 */
export default function CountdownTimer({ target, onComplete, compact = false, label = "Voting ends in" }) {
  const [now, setNow] = useState(Date.now());
  const firedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const deadline = new Date(target).getTime();
  const remaining = Math.max(0, deadline - now);
  const done = remaining === 0;

  useEffect(() => {
    if (done && !firedRef.current) {
      firedRef.current = true;
      onComplete?.();
    }
  }, [done, onComplete]);

  const totalSec = Math.floor(remaining / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");

  // Color tiers
  let bg = "bg-white", fg = "", ring = "", urgency = "calm";
  if (done) { bg = "bg-black"; fg = "text-[var(--hh-amber)]"; urgency = "done"; }
  else if (remaining < 5 * 60 * 1000) { bg = "bg-[var(--hh-error)]"; fg = "text-white"; ring = "animate-pulse"; urgency = "critical"; }
  else if (remaining < 60 * 60 * 1000) { bg = "bg-[var(--hh-amber)]"; urgency = "warning"; }

  if (compact) {
    return (
      <span
        data-testid="countdown-compact"
        className={`mono-label nb-border px-2 py-1 inline-flex items-center gap-1 ${bg} ${fg} ${ring}`}
        title={`Deadline: ${new Date(target).toLocaleString()}`}
      >
        <Hourglass className="w-3 h-3"/>
        {done ? "deadline passed" :
          days > 0 ? `${days}d ${pad(hours)}h ${pad(mins)}m` :
          `${pad(hours)}:${pad(mins)}:${pad(secs)}`}
      </span>
    );
  }

  return (
    <div className={`relative nb-border nb-shadow p-4 ${bg} ${fg} ${ring}`} data-testid="countdown-timer">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {urgency === "critical" ? <Zap className="w-4 h-4" strokeWidth={3}/> : <Hourglass className="w-4 h-4" strokeWidth={2.5}/>}
          <div className="mono-label">{done ? "deadline passed" : label}</div>
        </div>
        {urgency === "critical" && !done && (
          <span className="mono-label flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-white animate-ping inline-block"/>
            urgent
          </span>
        )}
      </div>

      <div className="font-display font-black tracking-tight mt-2 flex items-baseline gap-1 text-3xl sm:text-4xl">
        {done ? (
          <span data-testid="countdown-done">00 : 00 : 00</span>
        ) : (
          <>
            {days > 0 && <span>{pad(days)}<span className="text-base mx-1 opacity-70">d</span></span>}
            <span data-testid="countdown-hours">{pad(hours)}</span>
            <span className="opacity-60 mx-1">:</span>
            <span data-testid="countdown-minutes">{pad(mins)}</span>
            <span className="opacity-60 mx-1">:</span>
            <span data-testid="countdown-seconds" className={urgency === "critical" ? "blink" : ""}>{pad(secs)}</span>
          </>
        )}
      </div>

      {/* progress bar — fills toward zero */}
      <div className="h-2 nb-border bg-white mt-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            urgency === "critical" ? "bg-white" :
            urgency === "warning" ? "bg-black" :
            urgency === "done" ? "bg-[var(--hh-amber)]" : "bg-[var(--hh-blue)]"
          }`}
          style={{
            // shows fraction REMAINING out of 24h window; visual only
            width: `${Math.min(100, (remaining / (24 * 3600 * 1000)) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
