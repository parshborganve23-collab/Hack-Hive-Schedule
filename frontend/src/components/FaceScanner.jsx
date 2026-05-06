import { useEffect, useRef, useState } from "react";
import { detectFace, loadFaceApi } from "@/lib/faceapi";
import { Camera, Upload, ScanFace, CheckCircle2, X, RotateCcw } from "lucide-react";

/**
 * FaceScanner — demo-grade AI-style face verification modal.
 * Props:
 *   onVerified(): called when face is verified
 *   onClose(): cancel / skip (demo only)
 *   title / subtitle: customize copy
 */
export default function FaceScanner({ onVerified, onClose, title = "Face Verification", subtitle = "Quick AI scan to confirm you're human. Hackathon demo — no data stored." }) {
  const [mode, setMode] = useState("choose"); // choose | webcam | upload | scanning | success | error
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    loadFaceApi().catch((e) => setError(e.message));
    return () => stopStream();
    // eslint-disable-next-line
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startWebcam = async () => {
    setMode("webcam"); setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      setError("Camera permission denied. Try uploading a photo instead.");
      setMode("choose");
    }
  };

  const runScan = async (source) => {
    setMode("scanning"); setProgress(0); setError("");
    let t = 0;
    const id = setInterval(() => {
      t += 8; setProgress((p) => Math.min(p + 8, 92));
    }, 100);
    try {
      // Artificial minimum duration for demo feel
      const minDelay = new Promise((r) => setTimeout(r, 1400));
      const [detections] = await Promise.all([detectFace(source), minDelay]);
      clearInterval(id);
      if (detections.length === 0) {
        setError("No face detected. Try again with better lighting.");
        setMode("error");
        return;
      }
      setProgress(100);
      setMode("success");
      stopStream();
      setTimeout(() => {
        onVerified?.({ count: detections.length, score: detections[0]?.score ?? 1 });
      }, 1100);
    } catch (e) {
      clearInterval(id);
      setError(e.message || "Detection failed");
      setMode("error");
    }
  };

  const scanWebcam = async () => {
    if (!videoRef.current) return;
    await runScan(videoRef.current);
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setMode("upload");
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = async () => {
      canvasRef.current?.getContext("2d")?.drawImage(img, 0, 0, 320, 240);
      await runScan(img);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { setError("Could not read image"); setMode("error"); };
    img.src = url;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" data-testid="face-scanner-modal">
      <div className="relative w-full max-w-lg bg-white nb-border nb-shadow-lg p-6 sm:p-8">
        <button
          data-testid="face-scanner-close"
          onClick={() => { stopStream(); onClose?.(); }}
          className="absolute top-3 right-3 nb-border bg-white p-1.5 nb-press"
          aria-label="close"
        ><X className="w-4 h-4"/></button>

        <div className="flex items-start gap-3 mb-5">
          <div className="w-11 h-11 bg-[var(--hh-amber)] nb-border flex items-center justify-center">
            <ScanFace className="w-6 h-6" strokeWidth={2.5}/>
          </div>
          <div>
            <div className="mono-label">[ ai verification ]</div>
            <h3 className="font-display text-2xl font-black leading-tight">{title}</h3>
            <p className="text-xs text-[var(--hh-muted)] mt-1">{subtitle}</p>
          </div>
        </div>

        {/* STAGE: choose */}
        {mode === "choose" && (
          <div className="grid sm:grid-cols-2 gap-3" data-testid="face-scanner-choose">
            <button onClick={startWebcam} data-testid="face-scanner-webcam" className="nb-border bg-[var(--hh-amber)] nb-shadow nb-press p-5 text-left">
              <Camera className="w-6 h-6 mb-3" strokeWidth={2.5}/>
              <div className="font-display font-bold text-lg">Use webcam</div>
              <div className="text-xs mt-1">Instant scan via your camera.</div>
            </button>
            <button onClick={() => fileRef.current?.click()} data-testid="face-scanner-upload" className="nb-border bg-white nb-shadow nb-press p-5 text-left">
              <Upload className="w-6 h-6 mb-3" strokeWidth={2.5}/>
              <div className="font-display font-bold text-lg">Upload selfie</div>
              <div className="text-xs mt-1">From phone or computer.</div>
              <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden"/>
            </button>
          </div>
        )}

        {/* STAGE: webcam live preview */}
        {(mode === "webcam" || mode === "scanning") && (
          <div data-testid="face-scanner-stage">
            <div className="relative aspect-video bg-black nb-border overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {/* Scanning overlay */}
              {mode === "scanning" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Pulsing ring */}
                  <div className="absolute w-56 h-56 rounded-full border-4 border-[var(--hh-amber)] animate-ping opacity-40" />
                  <div className="absolute w-44 h-44 rounded-full border-4 border-[var(--hh-amber)]" />
                  {/* Horizontal scan line */}
                  <div className="absolute left-0 right-0 h-[3px] bg-[var(--hh-amber)] shadow-[0_0_12px_4px_rgba(255,176,0,0.8)] face-scan-line" />
                  {/* Corner brackets */}
                  {[
                    "top-6 left-6 border-t-4 border-l-4",
                    "top-6 right-6 border-t-4 border-r-4",
                    "bottom-6 left-6 border-b-4 border-l-4",
                    "bottom-6 right-6 border-b-4 border-r-4",
                  ].map((c, i) => (
                    <div key={i} className={`absolute w-10 h-10 border-[var(--hh-amber)] ${c}`}/>
                  ))}
                </div>
              )}
              {/* Corner brackets (always) */}
              {mode === "webcam" && [
                "top-3 left-3 border-t-4 border-l-4",
                "top-3 right-3 border-t-4 border-r-4",
                "bottom-3 left-3 border-b-4 border-l-4",
                "bottom-3 right-3 border-b-4 border-r-4",
              ].map((c, i) => (
                <div key={i} className={`absolute w-8 h-8 border-white ${c} opacity-70`}/>
              ))}
            </div>

            {mode === "scanning" ? (
              <div className="mt-4" data-testid="face-scanner-scanning">
                <div className="flex justify-between items-center mono-label">
                  <span className="text-[var(--hh-amber)]">⬤ scanning face...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-3 nb-border bg-[var(--hh-surface-alt)] mt-2 overflow-hidden relative">
                  <div className="h-full bg-[var(--hh-amber)] transition-all duration-150" style={{ width: `${progress}%` }} />
                  <div className="absolute inset-0 shimmer" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-[10px] font-mono">
                  {["detect_landmarks", "analyze_features", "verify_liveness"].map((s, i) => (
                    <div key={s} className={`nb-border px-2 py-1 ${progress > i * 33 ? "bg-[var(--hh-amber)]" : "bg-white"}`}>
                      {progress > i * 33 ? "✓" : "·"} {s}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <button onClick={scanWebcam} data-testid="face-scanner-start-btn" className="w-full mt-4 bg-[var(--hh-amber)] nb-border nb-shadow nb-press p-3 font-display font-bold uppercase flex items-center justify-center gap-2">
                <ScanFace className="w-5 h-5" strokeWidth={2.5}/> Start scan
              </button>
            )}
          </div>
        )}

        {/* STAGE: success */}
        {mode === "success" && (
          <div className="text-center py-6" data-testid="face-scanner-success">
            <div className="relative inline-flex items-center justify-center w-28 h-28 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-[var(--hh-success)] animate-ping opacity-60"/>
              <div className="relative w-28 h-28 rounded-full nb-border bg-[var(--hh-success)] flex items-center justify-center">
                <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5}/>
              </div>
            </div>
            <div className="mono-label text-[var(--hh-success)]">[ verified ]</div>
            <div className="font-display text-2xl font-black mt-1">Face Verified Successfully</div>
            <div className="mono-label mt-3 text-[var(--hh-muted)]">redirecting...</div>
          </div>
        )}

        {/* STAGE: upload in-progress (canvas hidden) */}
        {mode === "upload" && (
          <div className="text-center py-6" data-testid="face-scanner-upload-stage">
            <canvas ref={canvasRef} width={320} height={240} className="hidden"/>
            <div className="mono-label">analyzing upload...</div>
          </div>
        )}

        {/* STAGE: error */}
        {mode === "error" && (
          <div data-testid="face-scanner-error">
            <div className="nb-border bg-[var(--hh-error)] text-white p-4 font-mono text-sm mb-4">{error}</div>
            <button onClick={() => { setMode("choose"); setError(""); }} className="w-full bg-white nb-border nb-shadow nb-press p-3 font-display font-bold uppercase flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4"/> Try again
            </button>
          </div>
        )}

        {error && mode === "choose" && (
          <div className="mt-3 nb-border bg-[var(--hh-error)] text-white p-3 font-mono text-xs">{error}</div>
        )}

        {/* Skip option — demo only */}
        {mode === "choose" && (
          <button
            onClick={() => { stopStream(); onClose?.(); }}
            data-testid="face-scanner-skip"
            className="w-full mt-4 text-center mono-label text-[var(--hh-muted)] hover:underline"
          >skip for now (demo)</button>
        )}
      </div>

      <style>{`
        @keyframes face-scan-line {
          0% { transform: translateY(-80px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(80px); opacity: 0; }
        }
        .face-scan-line { animation: face-scan-line 1.6s ease-in-out infinite; }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
          animation: shimmer 1.2s linear infinite;
        }
      `}</style>
    </div>
  );
}
