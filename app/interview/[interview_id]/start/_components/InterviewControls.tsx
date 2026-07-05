"use client";
import React, { useState, useEffect, useRef } from "react";
import AlertConfirmation from "./AlertConfirmation";
import { PhoneOff, Loader2, Mic, MicOff, Activity } from "lucide-react";
import TimerComponent from "./TimerComponent";
import { STYLEScontrols as STYLES } from "@/services/Constants";

// ─── Type Definitions ───
interface InlineWaveformProps {
  volume?: number;
  active?: boolean;
}

interface ProgressRingProps {
  progress: number;
  size?: number;
  stroke?: number;
}

interface InterviewControlsProps {
  loading: boolean;
  activeUser: boolean;
  onStop: () => void;
  volume: number;
  startTimer: boolean;
  resetTimer: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
}

// ─── Constants ───
const BAR_COUNT: number = 18;

// ─── Inline Waveform Component ───
function InlineWaveform({ volume = 0, active = false }: InlineWaveformProps): React.ReactElement {
  const barsRef = useRef<number[]>(Array(BAR_COUNT).fill(0.15));
  const [bars, setBars] = useState<number[]>(barsRef.current);

  useEffect(() => {
    if (!active) {
      setBars(Array(BAR_COUNT).fill(0.15));
      return;
    }
    const id: ReturnType<typeof setInterval> = setInterval(() => {
      setBars(Array.from({ length: BAR_COUNT }, (_: unknown, i: number) => {
        const base: number = volume * 1.2;
        const noise: number = Math.random() * 0.4;
        const shape: number = Math.sin((i / BAR_COUNT) * Math.PI);
        return Math.min(1, Math.max(0.08, base * shape + noise * 0.3));
      }));
    }, 80);
    return () => clearInterval(id);
  }, [active, volume]);

  return (
    <div className="flex items-end gap-[2px]" style={{ height: 28 }}>
      {bars.map((h: number, i: number) => (
        <div
          key={i}
          className="wbar rounded-full flex-1 transition-all"
          style={{
            height: `${Math.round(h * 100)}%`,
            maxWidth: 5,
            background: active
              ? `rgba(96,165,250,${0.4 + h * 0.6})`
              : "rgba(255,255,255,.1)",
            transition: "height 80ms ease",
          }}
        />
      ))}
    </div>
  );
}

// ─── Progress Ring Component ───
function ProgressRing({ progress, size = 56, stroke = 4 }: ProgressRingProps): React.ReactElement {
  const r: number = (size - stroke) / 2;
  const circ: number = 2 * Math.PI * r;
  const off: number = circ - (progress / 100) * circ;

  const color: string =
    progress >= 80 ? "#34d399" :
    progress >= 50 ? "#60a5fa" :
    "#818cf8";

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,.07)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={off}
        strokeLinecap="round"
        style={{
          transition: "stroke-dashoffset 1s ease, stroke .5s ease",
          filter: `drop-shadow(0 0 4px ${color}88)`,
        }}
      />
    </svg>
  );
}

// ─── Main InterviewControls Component ───
const InterviewControls: React.FC<InterviewControlsProps> = ({
  loading,
  activeUser,
  onStop,
  volume,
  startTimer,
  resetTimer,
  currentQuestionIndex,
  totalQuestions,
}) => {
  const progress: number = Math.round((currentQuestionIndex / totalQuestions) * 100);

  return (
    <>
      <style>{STYLES}</style>

      <div
        className="controls-in h-full flex items-center justify-between gap-3 md:gap-5"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* ══ LEFT — TIMER ══ */}
        <div
          className="shrink-0 flex flex-col items-center justify-center px-4 py-2.5 rounded-2xl"
          style={{
            background: "rgba(255,255,255,.04)",
            border: "1px solid rgba(255,255,255,.07)",
            minWidth: 90,
          }}
        >
          <span className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Response</span>
          <span
            className="font-mono text-base font-bold text-blue-300"
            style={{ fontFamily: "'DM Mono',monospace", letterSpacing: ".04em" }}
          >
            <TimerComponent startTimer={startTimer} resetTimer={resetTimer} />
          </span>
        </div>

        {/* ══ CENTRE — STATUS BAR ══ */}
        <div
          className="flex-1 flex items-center gap-4 md:gap-6 px-5 py-2.5 rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,.03)",
            border: "1px solid rgba(255,255,255,.06)",
          }}
        >
          {/* Progress ring + label */}
          <div className="relative flex items-center justify-center shrink-0">
            <ProgressRing progress={progress} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-[10px] font-bold"
                style={{
                  color: progress >= 80 ? "#34d399" : progress >= 50 ? "#60a5fa" : "#818cf8",
                  fontFamily: "'DM Mono',monospace",
                }}
              >
                {progress}%
              </span>
            </div>
          </div>

          {/* Question text */}
          <div className="hidden sm:flex flex-col gap-0.5">
            <span className="text-[9px] uppercase tracking-widest text-slate-500">Question</span>
            <div className="flex items-baseline gap-1">
              <span
                className="text-xl font-black text-white leading-none"
                style={{ fontFamily: "'Syne',sans-serif" }}
              >
                {currentQuestionIndex}
              </span>
              <span className="text-xs text-slate-600">/ {totalQuestions}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px self-stretch" style={{ background: "rgba(255,255,255,.06)" }} />

          {/* Waveform + status */}
          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            <InlineWaveform volume={volume} active={activeUser} />
            <div className="flex items-center gap-2">
              <div className="relative shrink-0" style={{ width: 7, height: 7 }}>
                <div
                  className={`ping-dot w-full h-full rounded-full ${activeUser ? "bg-green-400" : "bg-slate-600"}`}
                  style={{ position: "relative" }}
                />
              </div>
              <span
                className="text-[9px] uppercase tracking-widest truncate"
                style={{ color: activeUser ? "#4ade80" : "#64748b" }}
              >
                {activeUser ? "AI Speaking" : "Listening…"}
              </span>
              {activeUser ? (
                <Mic className="w-3 h-3 text-green-400 shrink-0" />
              ) : (
                <MicOff className="w-3 h-3 text-slate-600 shrink-0" />
              )}
            </div>
          </div>

          <Activity className="hidden lg:block w-4 h-4 text-slate-700 shrink-0" />
        </div>

        {/* ══ RIGHT — END BUTTON ══ */}
        <div className="shrink-0">
          {!loading ? (
            <AlertConfirmation stopInterview={onStop}>
              <button
                className="end-btn-idle group relative flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-white transition-all active:scale-95 hover:scale-105"
                style={{
                  background: "linear-gradient(135deg,#7f1d1d,#ef4444)",
                  border: "1px solid rgba(239,68,68,.35)",
                }}
              >
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "linear-gradient(135deg,rgba(255,255,255,.08),transparent)" }}
                />
                <div
                  className="relative w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,.25)" }}
                >
                  <PhoneOff className="w-3.5 h-3.5 text-red-200" />
                </div>
                <div className="hidden sm:flex flex-col leading-none">
                  <span className="text-[9px] text-red-300 uppercase tracking-widest">End</span>
                  <span
                    className="text-xs font-black tracking-tight"
                    style={{ fontFamily: "'Syne',sans-serif" }}
                  >
                    Session
                  </span>
                </div>
              </button>
            </AlertConfirmation>
          ) : (
            <div
              className="w-16 h-12 flex items-center justify-center rounded-2xl"
              style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
            >
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default InterviewControls;