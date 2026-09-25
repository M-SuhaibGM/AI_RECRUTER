// interview/[interview_id]/start/page.tsx
"use client";
import React, { useContext, useEffect, useRef, useState, useMemo } from "react";
import { InterviewDataContext } from "@/context/InterviewDataContext";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { STYLES } from "@/services/Constants";
import { useAntiCheat } from "@/hooks/useAntiCheat";
import { useInterviewVapi } from "@/hooks/useInterviewVapi";
import { InterviewHeader } from "./_components/InterviewHeader";
import InterviewInterface from "./_components/InterviewInterface";
import InterviewControls from "./_components/InterviewControls";
import { PreInterviewCheck } from "./_components/PreInterviewCheck";
import { AnimatedBackground } from "./_components/AnimatedBackground";

interface Question {
  question: string;
  answer?: string;
  type?: string;
}

function StartInterview(): React.ReactElement {
  const { interviewInfo } = useContext(InterviewDataContext);
  const { interview_id } = useParams<{ interview_id: string }>();
  const router = useRouter();

  /* ─── Local State ─── */
  const [isConfigLoaded, setIsConfigLoaded] = useState<boolean>(false);
  const [isPreCheckComplete, setIsPreCheckComplete] = useState<boolean>(false);
  const [elapsedSecs, setElapsedSecs] = useState<number>(0);
  const [showTimeWarning, setShowTimeWarning] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ─── Custom Hook: All Vapi logic ─── */
  const {
    activeUser,
    loading,
    volume,
    startTimer,
    resetTimer,
    aiIsSpeaking,
    candidateIsThinking,
    transcript,
    conversation,      // ✅ ADDED — was missing
    currentQuestionIndex,
    progressPercentage,
    totalQuestions,
    handleRepeatQuestion,
    handleStop,
    syncAntiCheatRefs,
    handleNextQuestion,   // ✅ NEW
  } = useInterviewVapi({
    interviewInfo,
    interviewId: interview_id,
    isPreCheckComplete,
    isConfigLoaded,
  });

  /* ─── Anti-Cheat ─── */
  const { tabSwitchCount, switchTimestamps } = useAntiCheat(activeUser, "", 0);

  useEffect(() => {
    syncAntiCheatRefs(tabSwitchCount, switchTimestamps);
  }, [tabSwitchCount, switchTimestamps, syncAntiCheatRefs]);

  /* ─── Mark config as loaded when user-config fetched ─── */
  useEffect(() => {
    const timer = setTimeout(() => setIsConfigLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  /* ─── Elapsed Timer ─── */
  useEffect(() => {
    if (activeUser) {
      timerRef.current = setInterval(() => setElapsedSecs((s) => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeUser]);

  /* ─── Derived Values ─── */
  const currentQuestionName = useMemo(() => {
    const names = interviewInfo?.interviewData?.questions?.map((q: Question) => {
      const words = q.question?.split(" ") || [];
      return words.slice(0, 4).join(" ") + (words.length > 4 ? "..." : "");
    }) || [];
    return names[currentQuestionIndex] || `Question ${Math.min(currentQuestionIndex + 1, totalQuestions)}`;
  }, [interviewInfo, currentQuestionIndex, totalQuestions]);

  const totalDuration = parseInt(String(interviewInfo?.interviewData?.duration || "0")) * 60;

  const fmtTime = (s: number): string =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  /* ─── Time Warning ─── */
  useEffect(() => {
    if (activeUser && totalDuration > 0) {
      const remaining = totalDuration - elapsedSecs;
      if (remaining <= 120 && remaining > 0 && !showTimeWarning) {
        setShowTimeWarning(true);
        toast.warning("⏰ 2 minutes remaining!", {
          description: "Wrap up your current answer.",
          duration: 5000,
        });
      }
    }
  }, [elapsedSecs, activeUser, totalDuration, showTimeWarning]);

  /* ─── Mouse-out warning ─── */
  useEffect(() => {
    if (!activeUser) return;

    let lastWarnedAt = 0;
    const WARN_COOLDOWN = 10000;

    const handleMouseOut = (e: MouseEvent): void => {
      if (e.relatedTarget) return;
      if (document.hidden) return;

      const now = Date.now();
      if (now - lastWarnedAt < WARN_COOLDOWN) return;
      lastWarnedAt = now;

      toast.warning("⚠️ Please stay in the interview window", {
        description:
          "You moved your cursor outside the interview window. Please keep your mouse within the browser during the session.",
        duration: 5000,
        style: {
          background: "#fef3c7",
          color: "#92400e",
          border: "1px solid #fcd34d",
        },
      });
    };

    document.addEventListener("mouseout", handleMouseOut);
    return () => document.removeEventListener("mouseout", handleMouseOut);
  }, [activeUser]);

  /* ─── RENDER ─── */
  return (
    <>
      <style>{STYLES}</style>
      <div
        className="h-screen w-screen overflow-hidden flex flex-col relative"
        style={{ background: "#020817", fontFamily: "'DM Sans', sans-serif" }}
      >
        <AnimatedBackground />

        <InterviewHeader
          isPreCheckComplete={isPreCheckComplete}
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={totalQuestions}
          currentQuestionName={currentQuestionName}
          showTimeWarning={showTimeWarning}
          totalDuration={totalDuration}
          elapsedSecs={elapsedSecs}
          activeUser={activeUser}
          fmtTime={fmtTime}
        />

        <main className="main-anim flex-1 relative z-10 flex flex-col items-center justify-center px-4 md:px-16 overflow-hidden">
          {!isPreCheckComplete ? (
            <PreInterviewCheck
              interviewData={interviewInfo?.interviewData}
              onAllReady={() => setIsPreCheckComplete(true)}
            />
          ) : (
            <div className="w-full max-w-6xl h-full flex flex-col py-4">
              {/* Progress Bar */}
              <div className="mb-4 space-y-2 shrink-0">
                <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-widest">
                  <span>Session Progress</span>
                  <span className="text-blue-400 font-bold">{progressPercentage}%</span>
                </div>
                <div className="h-px w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.06)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progressPercentage}%`,
                      background: "linear-gradient(90deg,#1d4ed8,#60a5fa,#38bdf8)",
                      boxShadow: "0 0 12px rgba(96,165,250,.6)",
                    }}
                  />
                </div>
              </div>

              {/* ✅ Interview Interface — ONE instance, fills remaining height */}
              <div className="flex-1 min-h-0">
                <InterviewInterface
                  interviewInfo={interviewInfo}
                  currentQuestionIndex={currentQuestionIndex}
                  totalQuestions={totalQuestions}
                  activeUser={activeUser}
                  aiIsSpeaking={aiIsSpeaking}
                  candidateIsThinking={candidateIsThinking}
                  transcript={transcript}
                  conversation={conversation}
                  currentQuestionName={currentQuestionName}
                  onRepeatQuestion={handleRepeatQuestion}
                  onNextQuestion={handleNextQuestion}   // ✅ NEW
                />
              </div>
            </div>
          )}
        </main>

        {/* ═══ FOOTER — Only InterviewControls ═══ */}
        {isPreCheckComplete && (
          <footer
            className="footer-anim relative z-20 shrink-0 px-6 md:px-16 py-4"
            style={{
              borderTop: "1px solid rgba(255,255,255,.06)",
              background: "rgba(2,8,23,.8)",
              backdropFilter: "blur(24px)",
            }}
          >
            {activeUser && (
              <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
                <div
                  className="h-full transition-all duration-75"
                  style={{
                    width: `${Math.min(100, volume * 400)}%`,
                    background: "linear-gradient(90deg,#3b82f6,#60a5fa,#38bdf8)",
                    boxShadow: "0 0 8px rgba(96,165,250,.8)",
                  }}
                />
              </div>
            )}

            {/* ✅ ONLY InterviewControls — no duplicate InterviewInterface */}
            <InterviewControls
              loading={loading}
              activeUser={activeUser}
              onStop={handleStop}
              volume={volume}
              startTimer={startTimer}
              resetTimer={resetTimer}
              currentQuestionIndex={currentQuestionIndex}
              totalQuestions={totalQuestions}
            />
          </footer>
        )}
      </div>
    </>
  );
}

export default StartInterview;