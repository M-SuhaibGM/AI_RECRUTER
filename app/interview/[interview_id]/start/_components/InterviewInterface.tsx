// interview/[interview_id]/start/_components/InterviewInterface.tsx
"use client";
import React, { useEffect, useState, useRef } from "react";
import { Brain, Zap, RefreshCw, MessageSquare, Mic, MicOff, Bot, User, ArrowRight } from "lucide-react";

// ─── Type Definitions ───
interface ChatMessage {
  role: "ai" | "user";
  text: string;
  timestamp: number;
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
  aiIsSpeaking?: boolean;
  candidateIsThinking?: boolean;
  transcript?: string;
  conversation?: string;
  currentQuestionName?: string;
  isLastQuestion?: boolean; // 👈 ADD THIS

  canAdvance?: boolean;

  onRepeatQuestion?: () => void;
  onNextQuestion?: () => void;
}
// ═══════════════════════════════════════════════════════════════
// 🎯 RADIAL BARS (Google Assistant style - circular bars)
// ═══════════════════════════════════════════════════════════════
interface RadialBarsProps {
  isSpeaking: boolean;
  isThinking: boolean;
  volume?: number;
}

function RadialBars({ isSpeaking, isThinking, volume = 0 }: RadialBarsProps): React.ReactElement {
  const [barHeights, setBarHeights] = useState<number[]>(Array(48).fill(0.15));
  const animRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const animate = () => {
      const time = Date.now() / 1000;
      const intensity = isSpeaking ? Math.max(0.5, volume * 2.5) : isThinking ? 0.35 : 0.15;

      setBarHeights((prev) =>
        prev.map((_, i) => {
          const angle = (i / 48) * Math.PI * 2;
          // Multi-frequency wave for organic feel
          const wave1 = Math.sin(angle * 3 + time * 2.5) * 0.5 + 0.5;
          const wave2 = Math.sin(angle * 5 - time * 1.8) * 0.3 + 0.5;
          const wave3 = Math.cos(angle * 7 + time * 3.2) * 0.2 + 0.5;

          const combined = (wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2) * intensity;
          return Math.max(0.15, Math.min(1, combined));
        })
      );

      phaseRef.current += 0.02;
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isSpeaking, isThinking, volume]);

  const SIZE = 320;
  const CENTER = SIZE / 2;
  const INNER_RADIUS = 70;
  const MAX_BAR_LENGTH = 55;

  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      {/* Radial bars container */}
      <div className="absolute inset-0 flex items-center justify-center">
        {barHeights.map((height, i) => {
          const angle = (i / barHeights.length) * 360;
          const barLength = 8 + height * MAX_BAR_LENGTH;
          const distance = INNER_RADIUS + barLength / 2;

          // Color based on state
          const color = isSpeaking
            ? `rgba(59, 130, 246, ${0.5 + height * 0.5})`
            : isThinking
              ? `rgba(99, 102, 241, ${0.4 + height * 0.4})`
              : `rgba(148, 163, 184, ${0.3 + height * 0.3})`;

          return (
            <div
              key={i}
              className="absolute rounded-full transition-all"
              style={{
                width: 3,
                height: barLength,
                background: color,
                transform: `rotate(${angle}deg) translateY(-${distance}px)`,
                transformOrigin: "center center",
                top: "50%",
                left: "50%",
                marginLeft: -1.5,
                marginTop: -barLength / 2,
                transition: "height 0.1s ease, background 0.2s ease",
              }}
            />
          );
        })}
      </div>

      {/* Center AI icon */}
      <div
        className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${isSpeaking
          ? "bg-linear-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-400/50"
          : isThinking
            ? "bg-linear-to-br from-indigo-500 to-indigo-700 shadow-lg shadow-indigo-400/50"
            : "bg-linear-to-br from-slate-300 to-slate-400 shadow-md"
          }`}
      >
        <Brain className="w-8 h-8 text-white" />
        {isSpeaking && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
            <Zap className="w-2.5 h-2.5 text-white" />
          </div>
        )}
        {isThinking && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center animate-pulse">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Thinking Dots ───
function ThinkingDots(): React.ReactElement {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i: number) => (
        <div
          key={i}
          className="thinking-dot w-1.5 h-1.5 rounded-full bg-indigo-400"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───
const InterviewInterface: React.FC<InterviewInterfaceProps> = ({
  interviewInfo,
  currentQuestionIndex,
  totalQuestions,
  activeUser,
  aiIsSpeaking = false,
  isLastQuestion = false, // 👈 ADD THIS
  candidateIsThinking = false,
  transcript = "",
  conversation = "",
  currentQuestionName = "",
  canAdvance = false,
  onRepeatQuestion,
  onNextQuestion,
}) => {
  const [aiStatus, setAiStatus] = useState<"standby" | "speaking" | "thinking">("standby");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastTranscriptRef = useRef<string>("");

  // ─── Update AI status ───
  useEffect(() => {
    if (!activeUser) {
      setAiStatus("standby");
      return;
    }
    if (aiIsSpeaking) setAiStatus("speaking");
    else if (candidateIsThinking) setAiStatus("thinking");
    else setAiStatus("thinking");
  }, [activeUser, aiIsSpeaking, candidateIsThinking]);

  // ─── Parse conversation into chat messages ───
  // ─── Parse conversation into chat messages (with merging) ───
  useEffect(() => {
    if (!conversation) return;
    try {
      const logs = typeof conversation === "string" ? JSON.parse(conversation) : conversation;
      if (!Array.isArray(logs)) return;

      // ✅ Merge consecutive same-role messages into single bubbles
      const merged: ChatMessage[] = [];
      for (const msg of logs) {
        const role = msg.role === "user" ? "user" : "ai";
        const text = (msg.content || msg.message || "").trim();
        if (!text) continue;

        const last = merged[merged.length - 1];
        // If the last message has the same role, merge it
        if (last && last.role === role) {
          // Only merge if the gap is short (same turn, split by transcriber)
          last.text = `${last.text} ${text}`;
        } else {
          merged.push({
            role: role as "ai" | "user",
            text,
            timestamp: Date.now() + merged.length,
          });
        }
      }

      setMessages(merged);
    } catch {
      // ignore
    }
  }, [conversation]);

  // ─── Fallback: if no conversation array, use transcript ───
  useEffect(() => {
    if (!transcript || transcript === lastTranscriptRef.current) return;
    if (messages.length > 0) return; // prefer full conversation

    lastTranscriptRef.current = transcript;
    setMessages((prev) => [
      ...prev,
      { role: "ai", text: transcript, timestamp: Date.now() },
    ]);
  }, [transcript, messages.length]);

  // ─── Auto-scroll chat ───
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isSpeaking = aiStatus === "speaking";
  const isThinking = aiStatus === "thinking";
  const isStandby = aiStatus === "standby";

  const getStatusLabel = (): string => {
    if (isSpeaking) return "AI Speaking";
    if (isThinking) return candidateIsThinking ? "Waiting for you..." : "Processing...";
    if (isStandby) return "Waiting to start...";
    return "";
  };

  const getStatusColor = (): string => {
    if (isSpeaking) return "text-blue-600 bg-blue-50 border-blue-200";
    if (isThinking) return "text-indigo-600 bg-indigo-50 border-indigo-200";
    return "text-slate-500 bg-slate-50 border-slate-200";
  };

  return (
    <div className="w-full h-full flex gap-4">

      {/* ═══════════════════════════════════════════════════════════
          LEFT SIDE — Animated AI + Status + Controls
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top: Current Question Info */}
        <div className="shrink-0 mb-3">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">
            <span>Current Question</span>
            <span className="text-blue-600">
              {totalQuestions > 0 ? currentQuestionIndex + 1 : 0} / {totalQuestions}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-700 line-clamp-2">
            {currentQuestionName || "Getting ready..."}
          </p>
        </div>

        {/* Center: Radial Animation */}
        <div className="flex-1 flex items-center justify-center min-h-0 relative">
          <RadialBars
            isSpeaking={isSpeaking}
            isThinking={isThinking}
            volume={0}
          />
        </div>

        {/* Bottom: Status + Repeat Button (LEFT aligned) */}
        <div className="shrink-0 flex items-center gap-3 mt-3">

          {/* Status badge */}
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${getStatusColor()}`}
          >
            {isSpeaking && (
              <div className="flex items-end gap-0.5 h-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-0.5 rounded-full bg-blue-500"
                    style={{
                      height: "100%",
                      animation: `waveform 0.8s ease-in-out ${i * 0.1}s infinite`,
                    }}
                  />
                ))}
              </div>
            )}
            {isThinking && <ThinkingDots />}
            {isStandby && <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {getStatusLabel()}
            </span>
          </div>

          {/* Repeat button */}
          {/* Repeat + Next buttons */}
          {activeUser && (
            <div className="flex items-center gap-2">
              {onRepeatQuestion && (
                <button
                  onClick={onRepeatQuestion}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Repeat
                </button>
              )}

              {onNextQuestion && (
                <button
                  onClick={onNextQuestion}
                  // ✅ FIX: If it's the last question, we allow the click even if canAdvance is false
                  // because the user might be clicking to finalize.
                  disabled={!canAdvance && !isLastQuestion}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95 text-white shadow-md ${(canAdvance || isLastQuestion)
                      ? "bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-blue-200"
                      : "bg-slate-300 cursor-not-allowed shadow-none"
                    }`}
                >
                  {/* ✅ FIX: Use isLastQuestion to determine text */}
                  {isLastQuestion ? "Finish Interview" : "Next Question"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          {/* Mic indicator */}
          <div className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
            {activeUser ? (
              <Mic className="w-3 h-3 text-green-500" />
            ) : (
              <MicOff className="w-3 h-3 text-slate-400" />
            )}
            <span className="text-[10px] text-slate-500 font-medium">
              {interviewInfo?.userName || "Candidate"}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          RIGHT SIDE — Chat-Style Transcript
          ═══════════════════════════════════════════════════════════ */}
      <div
        className="w-85 lg:w-95 shrink-0 flex flex-col rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden"
        style={{ maxHeight: "100%" }}
      >
        {/* Chat header */}
        <div className="shrink-0 px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800">Live Transcript</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-widest">
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </p>
          </div>
          {isSpeaking && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 border border-blue-100">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[9px] font-bold text-blue-600 uppercase">Live</span>
            </div>
          )}
        </div>

        {/* Chat messages — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">No messages yet</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Conversation will appear here
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === "ai"
                      ? "bg-linear-to-br from-blue-500 to-blue-700"
                      : "bg-linear-to-br from-slate-500 to-slate-700"
                      }`}
                  >
                    {msg.role === "ai" ? (
                      <Bot className="w-3 h-3 text-white" />
                    ) : (
                      <User className="w-3 h-3 text-white" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-[12px] leading-relaxed ${msg.role === "ai"
                      ? "bg-blue-50 text-slate-700 border border-blue-100 rounded-tl-sm"
                      : "bg-slate-100 text-slate-700 border border-slate-200 rounded-tr-sm"
                      }`}
                  >
                    <p className="font-bold text-[9px] uppercase tracking-wider mb-1 opacity-60">
                      {msg.role === "ai" ? "AI Recruiter" : interviewInfo?.userName || "You"}
                    </p>
                    <p className="whitespace-pre-wrap wrap-break-word">{msg.text}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {/* Chat footer — typing indicator */}
        {isSpeaking && activeUser && (
          <div className="shrink-0 px-4 py-2 border-t border-slate-100 flex items-center gap-2 bg-blue-50/30">
            <div className="w-5 h-5 rounded-full bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Bot className="w-2.5 h-2.5 text-white" />
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0s" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0.15s" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0.3s" }} />
            </div>
            <span className="text-[10px] text-blue-500 font-medium">AI is speaking...</span>
          </div>
        )}
      </div>

      {/* Global keyframes */}
      <style>{`
        @keyframes waveform {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
        @keyframes thinking-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-3px); opacity: 1; }
        }
        .thinking-dot {
          animation: thinking-bounce 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default InterviewInterface;