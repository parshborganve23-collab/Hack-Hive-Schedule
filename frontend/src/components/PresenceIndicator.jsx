import { useEffect, useRef, useState } from "react";
import { detectFace, loadFaceApi } from "@/lib/faceapi";
import { Eye, EyeOff, Camera, Loader2 } from "lucide-react";

/**
 * PresenceIndicator — small floating/card widget that continuously checks
 * webcam for a human face and reports presence.
 *
 * Props:
 *   onStatusChange?(detected: boolean): fires when status transitions
 *   intervalMs?: polling rate, default 3500
 *   compact?: small pill style (default card)
 *   label?: optional label string
 */
export default function PresenceIndicator({ onStatusChange, intervalMs = 3500, compact = false, label = "Presence" }) {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState(null); // null | true | false
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const lastRef = useRef(null);

  const stop = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => () => stop(), []);

  const start = async () => {
    setError(""); setLoading(true);
    try {
      await loadFaceApi();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 320, height: 240 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setEnabled(true);
      // initial detection + polling
      const tick = async () => {
        if (!videoRef.current) return;
        try {
          const dets = await detectFace(videoRef.current);
          const present = dets.length > 0;
          if (lastRef.current !== present) {
            lastRef.current = present;
            setStatus(present);
            onStatusChange?.(present);
          }
        } catch { /* ignore transient failures */ }
      };
      await tick();
      timerRef.current = setInterval(tick, intervalMs);
    } catch (e) {
      setError("Camera access denied or unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    if (enabled) { stop(); setEnabled(false); setStatus(null); lastRef.current = null; }
    else start();
  };

  if (compact) {
    return (
      <button
        data-testid="presence-indicator-compact"
        onClick={toggle}
        className={`nb-border nb-press px-3 py-1.5 font-display font-bold text-xs uppercase flex items-center gap-2 ${
          status === true ? "bg-[var(--hh-success)] text-white" : status === false ? "bg-[var(--hh-error)] text-white" : "bg-white"
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${status === true ? "bg-white animate-pulse" : status === false ? "bg-white" : "bg-black"}`}/>
        {loading ? "starting..." : status === true ? "face detected" : status === false ? "no face" : "start presence"}
        <video ref={videoRef} className="hidden" muted playsInline/>
      </button>
    );
  }

  return (
    <div className="bg-white nb-border nb-shadow p-4" data-testid="presence-indicator">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mono-label">[ live presence ]</div>
          <div className="font-display font-bold text-lg mt-1">{label}</div>
        </div>
        <button
          data-testid="presence-toggle"
          onClick={toggle}
          className={`nb-border nb-press px-3 py-1.5 font-display font-bold text-xs uppercase flex items-center gap-1 ${enabled ? "bg-[var(--hh-error)] text-white" : "bg-[var(--hh-amber)]"}`}
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin"/> : enabled ? <EyeOff className="w-3 h-3"/> : <Eye className="w-3 h-3"/>}
          {enabled ? "stop" : "start"}
        </button>
      </div>

      {/* Video preview */}
      <div className="relative aspect-video bg-black nb-border overflow-hidden mt-3">
        {enabled ? (
          <>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline/>
            {/* Scanning overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-0 right-0 h-[2px] bg-[var(--hh-amber)] shadow-[0_0_8px_2px_rgba(255,176,0,0.8)] presence-scan-line"/>
              {status === true && (
                <div className="absolute inset-0 border-4 border-[var(--hh-success)] animate-pulse"/>
              )}
              {status === false && (
                <div className="absolute inset-0 border-4 border-[var(--hh-error)]"/>
              )}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">
            <div className="text-center">
              <Camera className="w-8 h-8 mx-auto opacity-40"/>
              <div className="mono-label mt-2 opacity-60">camera off</div>
            </div>
          </div>
        )}
      </div>

      {/* Status card */}
      <div className={`nb-border mt-3 p-3 flex items-center gap-3 ${
        status === true ? "bg-[var(--hh-success)] text-white"
        : status === false ? "bg-[var(--hh-error)] text-white"
        : "bg-[var(--hh-surface-alt)]"
      }`}>
        <div className={`w-3 h-3 rounded-full ${status === true ? "bg-white animate-pulse" : status === false ? "bg-white" : "bg-black"}`}/>
        <div className="font-mono text-sm" data-testid="presence-status">
          {status === null && "awaiting start..."}
          {status === true && "🟢 Face Detected · marked present"}
          {status === false && "🔴 No Face Detected · inactive"}
        </div>
      </div>

      {error && <div className="nb-border bg-[var(--hh-error)] text-white p-2 mt-2 font-mono text-xs">{error}</div>}

      <style>{`
        @keyframes presence-scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .presence-scan-line { animation: presence-scan 2.2s linear infinite; top: 0; }
      `}</style>
    </div>
  );
}
