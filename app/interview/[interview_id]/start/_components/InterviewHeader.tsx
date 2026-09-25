// interview/[interview_id]/start/_components/InterviewHeader.tsx
"use client";
import React from "react";
import { Bot, Clock, Shield } from "lucide-react";

interface InterviewHeaderProps {
  isPreCheckComplete: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestionName: string;
  showTimeWarning: boolean;
  totalDuration: number;
  elapsedSecs: number;
  activeUser: boolean;
  fmtTime: (s: number) => string;
}

export function InterviewHeader({
  isPreCheckComplete,
  currentQuestionIndex,
  totalQuestions,
  currentQuestionName,
  showTimeWarning,
  totalDuration,
  elapsedSecs,
  activeUser,
  fmtTime,
}: InterviewHeaderProps): React.ReactElement {
  return (
    <header
      className="header-anim relative z-20 h-16 shrink-0 flex items-center justify-between px-6 md:px-10"
      style={{
        borderBottom: "1px solid rgba(255,255,255,.06)",
        background: "rgba(2,8,23,.7)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 rounded-xl blur-md" style={{ background: "rgba(37,99,235,.5)" }} />
          <div
            className="relative w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
              border: "1px solid rgba(96,165,250,.3)",
            }}
          >
            <Bot style={{ width: 18, height: 18, color: "#fff" }} />
          </div>
        </div>
        <div>
          <span
            className="font-bold text-white text-sm tracking-wide"
            style={{ fontFamily: "'Syne',sans-serif", letterSpacing: ".08em" }}
          >
            AI<span style={{ color: "#60a5fa" }}>RECRUITER</span>
          </span>
          <div className="text-[9px] text-slate-500 uppercase tracking-widest -mt-0.5">
            Powered by Vapi
          </div>
        </div>
      </div>

      {/* Question Progress */}
      {isPreCheckComplete && (
        <div className="hidden md:flex items-center gap-3">
          <div className="text-right">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest block">
              Question {currentQuestionIndex + 1}/{totalQuestions}
            </span>
            <span className="text-[11px] text-blue-400 font-bold truncate max-w-[200px] block">
              {currentQuestionName}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalQuestions }).map((_, i: number) => (
              <div
                key={i}
                className="rounded-full transition-all duration-500"
                style={{
                  // ✅ Bolder, bigger dots with glow
                  height: i < currentQuestionIndex + 1 ? 8 : 6,
                  width: i < currentQuestionIndex + 1 ? 28 : 22,
                  background: i < currentQuestionIndex + 1
                    ? "linear-gradient(90deg,#3b82f6,#60a5fa)"
                    : "rgba(255,255,255,.12)",
                  boxShadow: i < currentQuestionIndex + 1
                    ? "0 0 10px rgba(96,165,250,.7), 0 0 20px rgba(59,130,246,.3)"
                    : "none",
                  border: i < currentQuestionIndex + 1
                    ? "1px solid rgba(96,165,250,.4)"
                    : "1px solid rgba(255,255,255,.06)",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Right Side Badges */}
      <div className="flex items-center gap-3">
        {showTimeWarning && (
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full animate-pulse"
            style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)" }}
          >
            <Clock style={{ width: 12, height: 12, color: "#fbbf24" }} />
            <span className="text-[10px] text-amber-400 font-bold">
              {Math.floor((totalDuration - elapsedSecs) / 60)}:
              {(totalDuration - elapsedSecs) % 60 < 10 ? "0" : ""}
              {(totalDuration - elapsedSecs) % 60} left
            </span>
          </div>
        )}

        {activeUser && (
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)" }}
          >
            <Clock style={{ width: 12, height: 12, color: "#4ade80" }} />
            <span className="text-[11px] font-mono text-green-400 font-bold">
              {fmtTime(elapsedSecs)}
            </span>
          </div>
        )}

        <div
          className="badge-live flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)" }}
        >
          <div className="live-dot flex items-center gap-[3px]">
            <span /><span /><span />
          </div>
          <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Live</span>
        </div>

        <div
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}
        >
          <Shield style={{ width: 12, height: 12, color: "#64748b" }} />
          <span className="text-[10px] text-slate-400 uppercase tracking-widest">Secure</span>
        </div>
      </div>
    </header>
  );
}