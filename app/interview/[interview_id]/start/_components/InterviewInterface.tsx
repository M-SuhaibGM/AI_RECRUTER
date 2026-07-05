"use client";
import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Mic, MicOff, Brain, Zap } from "lucide-react";
import { STYLESs as STYLES } from "@/services/Constants";

// ─── Type Definitions ───
interface WaveBarsProps {
  color?: string;
}

interface InterviewInterfaceProps {
  interviewInfo: {
    userName?: string;
    userEmail?: string;
    interviewData?: any;
  } | undefined;
  currentQuestionIndex: number;
  totalQuestions: number;
  activeUser: boolean;
}

type AIStatus = "standby" | "speaking" | "thinking";

// ─── Wave Bars Component ───
function WaveBars({ color = "#60a5fa" }: WaveBarsProps): React.ReactElement {
  return (
    <div className="flex items-end gap-[3px] h-5">
      {[...Array(5)].map((_: unknown, i: number) => (
        <div
          key={i}
          className="wave-bar w-[3px] rounded-full"
          style={{ height: "100%", background: color, animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}

// ─── Thinking Dots Component ───
function ThinkingDots(): React.ReactElement {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i: number) => (
        <div key={i} className="thinking-dot w-1.5 h-1.5 rounded-full bg-blue-400" />
      ))}
    </div>
  );
}

// ─── Main InterviewInterface Component ───
const InterviewInterface: React.FC<InterviewInterfaceProps> = ({
  interviewInfo,
  currentQuestionIndex,
  totalQuestions,
  activeUser,
}) => {
  const progress: number = (currentQuestionIndex / totalQuestions) * 100;
  const [aiStatus, setAiStatus] = useState<AIStatus>("standby");
  const [tick, setTick] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulate AI status cycling when active
  useEffect(() => {
    if (!activeUser) {
      setAiStatus("standby");
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setAiStatus("speaking");
    timerRef.current = setInterval(() => setTick((t: number) => t + 1), 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeUser]);

  useEffect(() => {
    if (!activeUser) return;
    setAiStatus((prev: AIStatus) => (prev === "speaking" ? "thinking" : "speaking"));
  }, [tick, activeUser]);

  const isSpeaking: boolean = aiStatus === "speaking";
  const isThinking: boolean = aiStatus === "thinking";
  const isStandby: boolean = aiStatus === "standby";

  const userInitial: string = interviewInfo?.userName?.[0]?.toUpperCase() || "?";

  return (
    <>
      <style>{STYLES}</style>

      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* ══════════════ AI CARD ══════════════ */}
        <div
          className="card-left relative rounded-[2.5rem] overflow-hidden flex flex-col items-center justify-center py-10 px-6 min-h-[320px]"
          style={{
            background: "linear-gradient(145deg, rgba(15,23,42,.95) 0%, rgba(17,24,39,.9) 100%)",
            border: isSpeaking
              ? "1px solid rgba(96,165,250,.45)"
              : "1px solid rgba(255,255,255,.07)",
            boxShadow: isSpeaking
              ? "0 0 60px rgba(37,99,235,.2), inset 0 1px 0 rgba(255,255,255,.05)"
              : "inset 0 1px 0 rgba(255,255,255,.04)",
            transition: "border-color .5s, box-shadow .5s",
          }}
        >
          {/* Scan line — only when speaking */}
          {isSpeaking && <div className="scan-h" />}

          {/* Top label */}
          <div className="absolute top-5 left-0 right-0 flex justify-center">
            <div
              className="flex items-center gap-2 px-3 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
            >
              <Brain className="w-3 h-3 text-blue-400" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[.2em]">AI Interviewer</span>
            </div>
          </div>

          {/* Avatar + rings */}
          <div className="relative flex items-center justify-center mb-5 float-anim">
            {isSpeaking && (
              <>
                <div
                  className="ring-1-anim absolute w-44 h-44 rounded-full"
                  style={{ border: "1px solid rgba(96,165,250,.3)" }}
                />
                <div
                  className="ring-2-anim absolute w-52 h-52 rounded-full"
                  style={{ border: "1px solid rgba(96,165,250,.15)" }}
                />
              </>
            )}

            <div
              className={`relative w-32 h-32 rounded-full overflow-hidden ${isSpeaking ? "ai-glow" : ""}`}
              style={{
                border: "2px solid rgba(96,165,250,.25)",
                transition: "all .5s",
              }}
            >
              <Image src="/ai-model.jpg" fill className="object-cover" alt="AI Interviewer" />
              {isThinking && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: "rgba(2,8,23,.55)" }}
                >
                  <ThinkingDots />
                </div>
              )}
            </div>

            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
              style={{
                background: isSpeaking ? "#22c55e" : isThinking ? "#f59e0b" : "#475569",
                borderColor: "#020817",
                transition: "background .4s",
              }}
            >
              <Zap className="w-2.5 h-2.5 text-white" style={{ width: 10, height: 10 }} />
            </div>
          </div>

          <h2
            className="text-white font-bold text-lg mb-1"
            style={{ fontFamily: "'Syne',sans-serif", letterSpacing: ".02em" }}
          >
            AI Recruiter
          </h2>

          <div className="status-badge flex items-center gap-2 mt-1" key={aiStatus}>
            {isSpeaking && (
              <>
                <WaveBars />
                <span className="text-[10px] text-blue-400 font-medium">Speaking…</span>
              </>
            )}
            {isThinking && (
              <>
                <ThinkingDots />
                <span className="text-[10px] text-amber-400 font-medium ml-1">Processing…</span>
              </>
            )}
            {isStandby && (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span className="text-[10px] text-slate-500 font-medium">Standby</span>
              </>
            )}
          </div>

          <div className="absolute bottom-6 w-36 space-y-1">
            <div className="flex justify-between text-[9px] text-slate-600">
              <span>Progress</span>
              <span className="text-blue-500 font-bold">{Math.round(progress)}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.06)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg,#1d4ed8,#60a5fa)",
                  boxShadow: "0 0 8px rgba(96,165,250,.6)",
                }}
              />
            </div>
          </div>
        </div>

        {/* ══════════════ USER CARD ══════════════ */}
        <div
          className="card-right relative rounded-[2.5rem] overflow-hidden flex flex-col items-center justify-center py-10 px-6 min-h-[320px]"
          style={{
            background: "linear-gradient(145deg, rgba(15,23,42,.95) 0%, rgba(17,24,39,.9) 100%)",
            border: "1px solid rgba(255,255,255,.07)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.04)",
          }}
        >
          <div className="absolute top-5 left-0 right-0 flex justify-center">
            <div
              className="flex items-center gap-2 px-3 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
            >
              <Mic className="w-3 h-3 text-indigo-400" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[.2em]">Candidate</span>
            </div>
          </div>

          <div className="relative mb-5">
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center text-5xl font-black text-white user-glow"
              style={{
                background: "linear-gradient(135deg,#1e3a8a 0%,#4338ca 50%,#312e81 100%)",
                border: "2px solid rgba(99,102,241,.3)",
                fontFamily: "'Syne',sans-serif",
              }}
            >
              {userInitial}
            </div>

            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
              style={{ background: "#6366f1", borderColor: "#020817" }}
            >
              <Mic className="text-white" style={{ width: 10, height: 10 }} />
            </div>
          </div>

          <h2
            className="text-white font-bold text-lg mb-1"
            style={{ fontFamily: "'Syne',sans-serif", letterSpacing: ".02em" }}
          >
            {interviewInfo?.userName || "Candidate"}
          </h2>
        </div>
      </div>
    </>
  );
};

export default InterviewInterface;