// interview/[interview_id]/start/_components/InterviewControls.tsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import AlertConfirmation from "./AlertConfirmation";
import { PhoneOff, Loader2, Mic, MicOff, Activity } from "lucide-react";
// import TimerComponent from "./TimerComponent";

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
  isInterviewCompleted?: boolean; // 👈 ADD
  currentQuestionIndex: number;
  totalQuestions: number;
  progressPercentage: number;
  hasQuestionBeenAsked: boolean;
}

// ─── Constants ───
const BAR_COUNT: number = 18;

// ─── Inline Waveform ───
function InlineWaveform({ volume = 0, active = false }: InlineWaveformProps): React.ReactElement {
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(0.15));

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
    <div className="flex items-end gap-0.5" style={{ height: 28 }}>
      {bars.map((h: number, i: number) => (
        <div
          key={i}
          className="rounded-full flex-1 transition-all"
          style={{
            height: `${Math.round(h * 100)}%`,
            maxWidth: 5,
            background: active
              ? `rgba(37,99,235,${0.4 + h * 0.6})`
              : "rgba(148,163,184,.2)",
            transition: "height 80ms ease",
          }}
        />
      ))}
    </div>
  );
}

// ─── Progress Ring ───
function ProgressRing({ progress, size = 56, stroke = 4 }: ProgressRingProps): React.ReactElement {
  const r: number = (size - stroke) / 2;
  const circ: number = 2 * Math.PI * r;
  const off: number = circ - (progress / 100) * circ;

  const color: string =
    progress >= 80 ? "#10b981" :
      progress >= 50 ? "#3b82f6" :
        "#6366f1";

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e2e8f0"
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
        }}
      />
    </svg>
  );
}

// ─── Main Component ───
const InterviewControls: React.FC<InterviewControlsProps> = ({
  loading,
  activeUser,
  onStop,
  volume,
  currentQuestionIndex,
  totalQuestions,
  hasQuestionBeenAsked = false,
  isInterviewCompleted = false, // 👈 AD
  progressPercentage,
}) => {


  // 👇 1-based display number; when completed, show the final question
  const progress = isInterviewCompleted ? 100 : progressPercentage;
  const displayQuestionNumber = isInterviewCompleted
    ? totalQuestions
    : hasQuestionBeenAsked
      ? Math.min(currentQuestionIndex + 1, totalQuestions)
      : 0;

  return (
    <div
      className="w-full flex items-center justify-between gap-3 md:gap-5"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* ══ CENTRE — STATUS BAR ══ */}
      <div className="flex-1 flex items-center gap-4 md:gap-6 px-5 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">        {/* Progress ring */}
        {/* Progress ring */}
        <div className="relative flex items-center justify-center shrink-0">
          <ProgressRing progress={progress} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-[10px] font-bold"
              style={{
                color: progress >= 80 ? "#10b981" : progress >= 50 ? "#3b82f6" : "#6366f1",
                fontFamily: "'DM Mono',monospace",
              }}
            >
              {progress}%
            </span>
          </div>
        </div>
        {/* Question count */}
        <div className="hidden sm:flex flex-col gap-0.5">
          <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">
            Question
          </span>
          <div className="flex items-baseline gap-1">
            <span
              className="text-xl font-black text-slate-800 leading-none"
              style={{ fontFamily: "'Syne',sans-serif" }}
            >
              {displayQuestionNumber}   {/* 👈 CHANGED */}
            </span>
            <span className="text-xs text-slate-400">/ {totalQuestions}</span>
          </div>
        </div>
        {/* Divider */}
        <div className="hidden md:block w-px self-stretch bg-slate-200" />

        {/* Waveform + status */}
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <InlineWaveform volume={volume} active={activeUser} />
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${activeUser ? "bg-green-500 animate-pulse" : "bg-slate-300"
                }`}
            />
            <span
              className={`text-[9px] uppercase tracking-widest font-bold truncate ${activeUser ? "text-green-600" : "text-slate-400"
                }`}
            >
              {activeUser ? "Live" : "Standby"}
            </span>
            {activeUser ? (
              <Mic className="w-3 h-3 text-green-500 shrink-0" />
            ) : (
              <MicOff className="w-3 h-3 text-slate-400 shrink-0" />
            )}
          </div>
        </div>

        <Activity className="hidden lg:block w-4 h-4 text-slate-300 shrink-0" />
      </div>

      {/* ══ RIGHT — END BUTTON ══ */}
      <div className="shrink-0">
        {!loading ? (
          <AlertConfirmation stopInterview={onStop}>
            <button
              className="group relative flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-white transition-all active:scale-95 hover:scale-105 shadow-lg shadow-red-200"
              style={{
                background: "linear-gradient(135deg,#dc2626,#ef4444)",
              }}
            >
              <div
                className="relative w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(0,0,0,.2)" }}
              >
                <PhoneOff className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="hidden sm:flex flex-col leading-none">
                <span className="text-[9px] text-red-100 uppercase tracking-widest">
                  End
                </span>
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
          <div className="w-16 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewControls;