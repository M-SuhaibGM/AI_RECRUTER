"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, CheckCircle2, AlertCircle, RefreshCw, Loader2, Volume2 } from "lucide-react";

// ─── Type Definitions ───
type MicStatus = "idle" | "requesting" | "active" | "denied" | "ready";

interface MicTestProps {
  onMicReady?: () => void;
}

// ─── Constants ───
const BAR_COUNT: number = 28;

// ─── Helper Functions ───
function getBarColor(height: number): string {
  if (height > 0.7) return "#f87171"; // red — too loud
  if (height > 0.35) return "#34d399"; // green — good
  return "#60a5fa"; // blue — quiet
}

function getStatusIcon(status: MicStatus, volume: number): React.ReactElement {
  switch (status) {
    case "requesting":
      return <Loader2 className="w-7 h-7 text-white animate-spin" />;
    case "denied":
      return <AlertCircle className="w-7 h-7 text-red-200" />;
    case "ready":
      return <CheckCircle2 className="w-7 h-7 text-emerald-200" />;
    case "active":
      return volume > 0.35 ? (
        <Volume2 className="w-7 h-7 text-white" />
      ) : (
        <Mic className="w-7 h-7 text-white" />
      );
    default:
      return <Mic className="w-7 h-7 text-white" />;
  }
}

function getStatusTitle(status: MicStatus, peakDetected: boolean): string {
  switch (status) {
    case "idle": return "Microphone Check";
    case "requesting": return "Requesting Access…";
    case "active": return peakDetected ? "✓ Signal Detected" : "Speak to test…";
    case "denied": return "Microphone Blocked";
    case "ready": return "All Set — Starting!";
  }
}

function getStatusDescription(status: MicStatus): string {
  switch (status) {
    case "idle": return "We'll verify your mic before starting the interview.";
    case "requesting": return "Allow microphone access in your browser prompt.";
    case "active": return "Say anything — watch the bars react to your voice.";
    case "denied": return "Click the lock icon in your address bar and allow microphone.";
    case "ready": return "Launching your interview session…";
  }
}

// ─── Main Component ───
function MicTest({ onMicReady }: MicTestProps): React.ReactElement {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [volume, setVolume] = useState<number>(0);
  const [peakDetected, setPeakDetected] = useState<boolean>(false);
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(0.05));

  // Stable refs
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const peakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef<boolean>(true);

  // ── Cleanup ──────────────────────────────────────────────────
  const stopAll = useCallback((): void => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (peakTimerRef.current) {
      clearTimeout(peakTimerRef.current);
      peakTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopAll();
    };
  }, [stopAll]);

  // ── Start Mic Test ───────────────────────────────────────────
  const startMicTest = useCallback(async (): Promise<void> => {
    stopAll();
    setStatus("requesting");
    setPeakDetected(false);
    setVolume(0);
    setBars(Array(BAR_COUNT).fill(0.05));

    try {
      const stream: MediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        return;
      }

      streamRef.current = stream;

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === "suspended") await ctx.resume();
      audioCtxRef.current = ctx;

      const analyser: AnalyserNode = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.75;
      analyserRef.current = analyser;

      const source: MediaStreamAudioSourceNode = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength: number = analyser.frequencyBinCount;
      const dataArray: Uint8Array<ArrayBuffer> = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>;

      setStatus("active");

      const tick = (): void => {
        if (!mountedRef.current || !analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        const step: number = Math.floor(bufferLength / BAR_COUNT);
        const newBars: number[] = Array.from({ length: BAR_COUNT }, (_: unknown, i: number) => {
          let sum: number = 0;
          for (let j: number = 0; j < step; j++) sum += dataArray[i * step + j];
          return Math.min(1, (sum / step) / 200);
        });

        let sum: number = 0;
        for (let i: number = 0; i < bufferLength; i++) sum += dataArray[i];
        const avg: number = sum / bufferLength / 255;

        if (mountedRef.current) {
          setBars(newBars);
          setVolume(avg);

          if (avg > 0.05) {
            setPeakDetected(true);
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);

    } catch (err: unknown) {
      console.error("[MicTest] getUserMedia error:", err);
      if (mountedRef.current) setStatus("denied");
    }
  }, [stopAll]);

  // ── Confirm & Proceed ────────────────────────────────────────
  const handleConfirm = useCallback((): void => {
    setStatus("ready");
    stopAll();
    setTimeout(() => onMicReady?.(), 600);
  }, [onMicReady, stopAll]);

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col items-center gap-6 w-full max-w-md mx-auto select-none">
      <div
        className="w-full rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #0f172a 0%, #1e293b 60%, #0f1f3d 100%)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* Top accent line */}
        <div
          className="h-px w-full"
          style={{ background: "linear-gradient(90deg, transparent, #3b82f6 40%, #60a5fa 60%, transparent)" }}
        />

        <div className="p-8 flex flex-col items-center gap-6">
          {/* ── Icon Ring ── */}
          <div className="relative flex items-center justify-center">
            {status === "active" && (
              <>
                <span
                  className="absolute w-24 h-24 rounded-full border border-blue-500/30 animate-ping"
                  style={{ animationDuration: "2s" }}
                />
                <span
                  className="absolute w-20 h-20 rounded-full border border-blue-400/20 animate-ping"
                  style={{ animationDuration: "2.5s", animationDelay: "0.3s" }}
                />
              </>
            )}
            <div
              className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background:
                  status === "denied"
                    ? "linear-gradient(135deg, #7f1d1d, #991b1b)"
                    : status === "ready"
                      ? "linear-gradient(135deg, #065f46, #047857)"
                      : "linear-gradient(135deg, #1d4ed8, #3b82f6)",
                boxShadow:
                  status === "active"
                    ? `0 0 0 ${Math.round(volume * 20)}px rgba(59,130,246,${(volume * 0.3).toFixed(2)}), 0 8px 32px rgba(59,130,246,0.4)`
                    : "0 8px 24px rgba(0,0,0,0.4)",
                transition: "box-shadow 0.05s ease, background 0.3s ease",
              }}
            >
              {getStatusIcon(status, volume)}
            </div>
          </div>

          {/* ── Title & Subtitle ── */}
          <div className="text-center space-y-1">
            <h2
              className="text-lg font-bold tracking-tight"
              style={{ color: "#f1f5f9", fontFamily: "'DM Sans', sans-serif" }}
            >
              {getStatusTitle(status, peakDetected)}
            </h2>
            <p
              className="text-xs leading-relaxed max-w-[260px]"
              style={{ color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}
            >
              {getStatusDescription(status)}
            </p>
          </div>

          {/* ── Waveform Visualiser ── */}
          <div
            className="w-full h-16 flex items-end justify-center gap-[3px] px-2 rounded-2xl py-2"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {bars.map((h: number, i: number) => (
              <div
                key={i}
                className="rounded-full flex-1 transition-all"
                style={{
                  height: `${Math.max(8, h * 100)}%`,
                  background: status === "active" ? getBarColor(h) : "rgba(255,255,255,0.08)",
                  transition: "height 0.04s ease, background 0.2s ease",
                  maxWidth: 6,
                }}
              />
            ))}
          </div>

          {/* ── Volume Meter ── */}
          <div className="w-full space-y-1">
            <div className="flex justify-between text-[10px]" style={{ color: "#475569" }}>
              <span>Input Level</span>
              <span className="font-mono">{Math.round(volume * 100)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${volume * 100}%`,
                  background: volume > 0.7 ? "#f87171" : volume > 0.35 ? "#34d399" : "#3b82f6",
                  transition: "width 0.05s ease, background 0.2s ease",
                }}
              />
            </div>
            <div className="flex justify-between text-[9px]" style={{ color: "#334155" }}>
              <span>Too quiet</span>
              <span>Good</span>
              <span>Too loud</span>
            </div>
          </div>

          {/* ── CTA Buttons ── */}
          <div className="w-full flex flex-col gap-3">
            {(status === "idle" || status === "denied") && (
              <button
                onClick={startMicTest}
                className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 hover:brightness-110"
                style={{
                  background:
                    status === "denied"
                      ? "linear-gradient(135deg, #dc2626, #ef4444)"
                      : "linear-gradient(135deg, #1d4ed8, #3b82f6)",
                  color: "#fff",
                  boxShadow: "0 4px 20px rgba(59,130,246,0.3)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {status === "denied" ? (
                  <>
                    <RefreshCw className="w-4 h-4" /> Try Again
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" /> Test Microphone
                  </>
                )}
              </button>
            )}

            {status === "active" && (
              <>
                <button
                  onClick={handleConfirm}
                  disabled={!peakDetected}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
                  style={{
                    background: peakDetected
                      ? "linear-gradient(135deg, #065f46, #10b981)"
                      : "rgba(255,255,255,0.06)",
                    color: "#fff",
                    boxShadow: peakDetected ? "0 4px 20px rgba(16,185,129,0.3)" : "none",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {peakDetected ? "Mic Works — Start Interview" : "Speak to enable this button"}
                </button>

                <button
                  onClick={startMicTest}
                  className="w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 hover:text-white"
                  style={{ color: "#475569", fontFamily: "'DM Sans', sans-serif" }}
                >
                  <RefreshCw className="w-3 h-3" /> Restart test
                </button>
              </>
            )}

            {status === "ready" && (
              <div
                className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #065f46, #10b981)",
                  color: "#fff",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <Loader2 className="w-4 h-4 animate-spin" /> Launching…
              </div>
            )}
          </div>

          {/* ── Tips ── */}
          {status === "active" && !peakDetected && (
            <p className="text-[10px] text-center animate-pulse" style={{ color: "#3b82f6" }}>
              🎙️ Say &ldquo;Hello&rdquo; or count to three to verify your mic
            </p>
          )}
          {status === "active" && peakDetected && (
            <p className="text-[10px] text-center flex items-center gap-1" style={{ color: "#10b981" }}>
              <CheckCircle2 className="w-3 h-3" /> Your microphone is working perfectly
            </p>
          )}
        </div>

        {/* Bottom accent line */}
        <div
          className="h-px w-full"
          style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.3) 50%, transparent)" }}
        />
      </div>
    </div>
  );
}

export default MicTest;