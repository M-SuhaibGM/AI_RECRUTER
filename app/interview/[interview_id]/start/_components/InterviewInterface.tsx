"use client";
import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Mic, MicOff, Brain, Zap, RefreshCw, MessageSquare, Camera, CameraOff } from "lucide-react";
import { STYLESs as STYLES } from "@/services/Constants";

// ─── Type Definitions ───
interface WaveBarsProps { color?: string; }
interface InterviewInterfaceProps {
  interviewInfo: { userName?: string; userEmail?: string; interviewData?: any; } | undefined;
  currentQuestionIndex: number;
  totalQuestions: number;
  activeUser: boolean;
  aiIsSpeaking?: boolean;
  candidateIsThinking?: boolean;
  transcript?: string;
  currentQuestionName?: string;
  onRepeatQuestion?: () => void;
}
type AIStatus = "standby" | "speaking" | "thinking";

// ─── Wave Bars Component ───
function WaveBars({ color = "#60a5fa" }: WaveBarsProps): React.ReactElement {
  return (
    <div className="flex items-end gap-[3px] h-5">
      {[...Array(5)].map((_: unknown, i: number) => (
        <div key={i} className="wave-bar w-[3px] rounded-full"
          style={{ height: "100%", background: color, animationDelay: `${i * 0.1}s` }} />
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
  aiIsSpeaking = false,
  candidateIsThinking = false,
  transcript = "",
  currentQuestionName = "",
  onRepeatQuestion,
}) => {
  const progress: number = totalQuestions > 0 ? (currentQuestionIndex / totalQuestions) * 100 : 0;
  const [aiStatus, setAiStatus] = useState<AIStatus>("standby");
  const [tick, setTick] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // ✅ Start camera
  useEffect(() => {
    if (activeUser && !cameraStream) {
      navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
      }).then((stream: MediaStream) => {
        setCameraStream(stream);
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.play().catch(() => { });
        }
      }).catch(() => { });
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      }
    };
  }, [activeUser]);

  // AI status simulation
  useEffect(() => {
    if (!activeUser) { setAiStatus("standby"); if (timerRef.current) clearInterval(timerRef.current); return; }
    setAiStatus("speaking");
    timerRef.current = setInterval(() => setTick((t: number) => t + 1), 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeUser]);

  useEffect(() => {
    if (!activeUser) return;
    if (aiIsSpeaking) setAiStatus("speaking");
    else if (candidateIsThinking) setAiStatus("thinking");
    else setAiStatus((prev: AIStatus) => (prev === "speaking" ? "thinking" : "speaking"));
  }, [tick, activeUser, aiIsSpeaking, candidateIsThinking]);

  const isSpeaking = aiStatus === "speaking";
  const isThinking = aiStatus === "thinking";
  const isStandby = aiStatus === "standby";
  const userInitial = interviewInfo?.userName?.[0]?.toUpperCase() || "?";

  return (
    <>
      <style>{STYLES}</style>
      <div className="space-y-4 w-full" style={{ fontFamily: "'DM Sans', sans-serif" }}>

        {/* Live Transcript */}
        {transcript && activeUser && (
          <div className="w-full px-4 py-3 rounded-2xl flex items-start gap-3"
            style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(96,165,250,0.2)" }}>
            <MessageSquare className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-blue-400 uppercase tracking-widest mb-1">AI Says:</p>
              <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">{transcript}</p>
            </div>
          </div>
        )}

        {/* Question Name Badge */}
        {currentQuestionName && activeUser && (
          <div className="flex items-center justify-center">
            <span className="text-xs text-slate-400 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
              📋 <span className="font-bold text-white">{currentQuestionName}</span>
              <span className="text-slate-500 ml-2">({currentQuestionIndex}/{totalQuestions})</span>
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">

          {/* ══════════════ AI CARD ══════════════ */}
          <div className="card-left relative rounded-[2.5rem] overflow-hidden flex flex-col items-center justify-center py-10 px-6 min-h-[320px]"
            style={{
              background: "linear-gradient(145deg, rgba(15,23,42,.95) 0%, rgba(17,24,39,.9) 100%)",
              border: isSpeaking ? "1px solid rgba(96,165,250,.45)" : "1px solid rgba(255,255,255,.07)",
              boxShadow: isSpeaking ? "0 0 60px rgba(37,99,235,.2), inset 0 1px 0 rgba(255,255,255,.05)" : "inset 0 1px 0 rgba(255,255,255,.04)",
              transition: "border-color .5s, box-shadow .5s",
            }}>
            {isSpeaking && <div className="scan-h" />}
            <div className="absolute top-5 left-0 right-0 flex justify-center z-10">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full"
                style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Brain className="w-3 h-3 text-blue-400" />
                <span className="text-[9px] font-bold text-white uppercase tracking-[.2em]">AI Interviewer</span>
              </div>
            </div>

            <div className="relative flex items-center justify-center mb-5 float-anim">
              {isSpeaking && (
                <>
                  <div className="ring-1-anim absolute w-44 h-44 rounded-full" style={{ border: "1px solid rgba(96,165,250,.3)" }} />
                  <div className="ring-2-anim absolute w-52 h-52 rounded-full" style={{ border: "1px solid rgba(96,165,250,.15)" }} />
                </>
              )}
              <div className={`relative w-32 h-32 rounded-full overflow-hidden ${isSpeaking ? "ai-glow" : ""}`}
                style={{ border: "2px solid rgba(96,165,250,.25)", transition: "all .5s" }}>
                <Image src="/ai-model.jpg" fill className="object-cover" alt="AI" />
                {isThinking && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(2,8,23,.55)" }}>
                    <ThinkingDots />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={{ background: isSpeaking ? "#22c55e" : isThinking ? "#f59e0b" : "#475569", borderColor: "#020817" }}>
                <Zap className="w-2.5 h-2.5 text-white" style={{ width: 10, height: 10 }} />
              </div>
            </div>

            <h2 className="text-white font-bold text-lg mb-1" style={{ fontFamily: "'Syne',sans-serif", letterSpacing: ".02em" }}>AI Recruiter</h2>

            <div className="status-badge flex items-center gap-2 mt-1" key={aiStatus}>
              {isSpeaking && <><WaveBars /><span className="text-[10px] text-blue-400 font-medium">Speaking…</span></>}
              {isThinking && <><ThinkingDots /><span className="text-[10px] text-amber-400 font-medium ml-1">{candidateIsThinking ? "You're thinking..." : "Processing…"}</span></>}
              {isStandby && <><div className="w-1.5 h-1.5 rounded-full bg-slate-600" /><span className="text-[10px] text-slate-500 font-medium">Waiting...</span></>}
            </div>

            {activeUser && onRepeatQuestion && (
              <button onClick={onRepeatQuestion}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 hover:bg-white/10"
                style={{ color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}>
                <RefreshCw className="w-3.5 h-3.5" /> Repeat Question
              </button>
            )}

            <div className="absolute bottom-6 w-36 space-y-1">
              <div className="flex justify-between text-[9px] text-slate-600"><span>Progress</span><span className="text-blue-500 font-bold">{Math.round(progress)}%</span></div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.06)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: "linear-gradient(90deg,#1d4ed8,#60a5fa)", boxShadow: "0 0 8px rgba(96,165,250,.6)" }} />
              </div>
            </div>
          </div>

          {/* ══════════════ USER CARD - FULL CAMERA VIEW ══════════════ */}
          <div className="card-right relative rounded-[2.5rem] overflow-hidden flex flex-col min-h-[320px]"
            style={{
              background: !cameraStream ? "linear-gradient(145deg, rgba(15,23,42,.95) 0%, rgba(17,24,39,.9) 100%)" : "#000",
              border: activeUser && cameraStream ? "2px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,.07)",
              boxShadow: activeUser && cameraStream ? "0 0 40px rgba(99,102,241,0.3)" : "inset 0 1px 0 rgba(255,255,255,.04)",
              transition: "all 0.5s",
            }}>

            {/* ✅ FULL CAMERA - Simplified & Guaranteed to show */}
            {activeUser && cameraStream ? (
              <>
                {/* Video element - NO overlay blocking it initially */}
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full"
                  style={{
                    objectFit: "cover",
                    transform: "scaleX(-1)",
                    zIndex: 1,
                  }}
                />

                {/* Gradient overlay - only at bottom for text */}
                <div className="absolute inset-0 z-10 pointer-events-none"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.2) 100%)" }} />

                {/* Live indicator - top right */}
                <div className="absolute top-4 right-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-widest">Live</span>
                </div>

                {/* Top label */}
                <div className="absolute top-4 left-0 right-0 flex justify-center z-30">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
                    <Camera className="w-3 h-3 text-green-400" />
                    <span className="text-[9px] font-bold text-white uppercase tracking-[.2em]">Live Camera</span>
                  </div>
                </div>

                {/* User info at bottom */}
                <div className="absolute bottom-6 left-0 right-0 z-30 flex flex-col items-center gap-2">
                  <h2 className="text-white font-bold text-xl"
                    style={{ fontFamily: "'Syne',sans-serif", letterSpacing: ".02em", textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>
                    {interviewInfo?.userName || "Candidate"}
                  </h2>

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <Mic className="w-3 h-3 text-green-400" />
                    <span className="text-[10px] text-green-400 font-medium">Live</span>
                  </div>

                  {candidateIsThinking && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full animate-pulse bg-amber-500/30 border border-amber-500/40 backdrop-blur-md">
                      <ThinkingDots />
                      <span className="text-[10px] text-amber-300 font-medium">Thinking...</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ═══ NO CAMERA - Static Avatar ═══ */
              <div className="flex-1 flex flex-col items-center justify-center py-10 px-6 relative">
                <div className="absolute top-5 left-0 right-0 flex justify-center">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full"
                    style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}>
                    <CameraOff className="w-3 h-3 text-slate-500" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[.2em]">Camera Off</span>
                  </div>
                </div>

                <div className="relative mb-5">
                  <div className="w-32 h-32 rounded-full flex items-center justify-center text-5xl font-black text-white"
                    style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#4338ca 50%,#312e81 100%)", border: "2px solid rgba(99,102,241,.3)", fontFamily: "'Syne',sans-serif" }}>
                    {userInitial}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{ background: activeUser ? "#22c55e" : "#6366f1", borderColor: "#020817" }}>
                    {activeUser ? <Mic className="text-white" style={{ width: 10, height: 10 }} /> : <MicOff className="text-white" style={{ width: 10, height: 10 }} />}
                  </div>
                </div>

                <h2 className="text-white font-bold text-lg mb-1" style={{ fontFamily: "'Syne',sans-serif", letterSpacing: ".02em" }}>
                  {interviewInfo?.userName || "Candidate"}
                </h2>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default InterviewInterface;