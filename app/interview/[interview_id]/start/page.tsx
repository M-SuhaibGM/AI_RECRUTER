"use client";
import React, { useContext, useEffect, useRef, useState, useMemo, useCallback } from "react";
import { InterviewDataContext, InterviewInfo } from "@/context/InterviewDataContext";
import Vapi from "@vapi-ai/web";
import { toast } from "sonner";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import InterviewInterface from "./_components/InterviewInterface";
import InterviewControls from "./_components/InterviewControls";
import { PreInterviewCheck } from "./_components/PreInterviewCheck";
import { Bot, Clock, Shield } from "lucide-react";
import { STYLES } from "@/services/Constants";
import { useAntiCheat } from "@/hooks/useAntiCheat";

// ─── Type Definitions ───
interface Question {
  question: string;
  answer?: string;
  type?: string;
}

interface UserConfig {
  language: string;
  voiceId: string;
  voiceProvider: string;
}

interface VapiMessage {
  conversation?: any;
  [key: string]: any;
}

interface VapiError {
  error?: {
    type?: string;
    msg?: string;
  };
  errorMsg?: string;
  type?: string;
}

interface ConversationMessage {
  role: string;
  content?: string;
  message?: string;
}

// ─── Constants ───
const VALID_VOICES: string[] = [
  "Clara", "Godfrey", "Layla", "Sid", "Gustavo", "Elliot", "Kylie", "Rohan",
  "Lily", "Savannah", "Hana", "Neha", "Cole", "Harry", "Paige", "Spencer",
  "Nico", "Kai", "Emma", "Sagar", "Neil", "Naina", "Leah", "Tara", "Jess",
  "Leo", "Dan", "Mia", "Zac", "Zoe",
];

// ─── Main Component ───
function StartInterview(): React.ReactElement {
  const { interviewInfo } = useContext(InterviewDataContext);
  const { interview_id } = useParams<{ interview_id: string }>();
  const router = useRouter();

  /* ───────────────────────── REFS ───────────────────────── */
  const vapiRef = useRef<any>(null);
  const currentQuestionIndexRef = useRef<number>(0);
  const progressPercentageRef = useRef<number>(0);
  const conversationRef = useRef<string | null>(null);
  const feedbackCalledRef = useRef<boolean>(false);
  const isCallActiveRef = useRef<boolean>(false);
  const initStartedRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const hasGreetedRef = useRef<boolean>(false);
  const tabSwitchCountRef = useRef<number>(0);
  const switchTimestampsRef = useRef<string[]>([]);

  /* ───────────────────────── STATE ───────────────────────── */
  const [activeUser, setActiveUser] = useState<boolean>(false);
  const [conversation, setConversation] = useState<string | undefined>();
  const [hasInterviewStarted, setHasInterviewStarted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [startTimer, setStartTimer] = useState<boolean>(false);
  const [resetTimer, setResetTimer] = useState<boolean>(false);
  const [config, setConfig] = useState<UserConfig>({
    language: "en-US",
    voiceId: "Elliot",
    voiceProvider: "vapi",
  });
  const [isConfigLoaded, setIsConfigLoaded] = useState<boolean>(false);
  const [isPreCheckComplete, setIsPreCheckComplete] = useState<boolean>(false); // ✅ NEW - replaces isMicChecked
  const [volume, setVolume] = useState<number>(0);
  const [elapsedSecs, setElapsedSecs] = useState<number>(0);
  const { tabSwitchCount, switchTimestamps } = useAntiCheat(activeUser, "", 0);
  const totalQuestions: number = interviewInfo?.interviewData?.questions?.length || 5;


  /* ───────────────────────── Keep Anti-Cheat Refs Synced ───────────────────────── */
  useEffect(() => {
    tabSwitchCountRef.current = tabSwitchCount;
    switchTimestampsRef.current = switchTimestamps;
  }, [tabSwitchCount, switchTimestamps]);

  /* ───────────────────────── Track mount/unmount ───────────────────────── */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /* ───────────────────────── Elapsed timer (header) ───────────────────────── */
  useEffect(() => {
    if (activeUser) {
      timerRef.current = setInterval(() => {
        if (isMountedRef.current) setElapsedSecs((s: number) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeUser]);

  const fmtTime = (s: number): string =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  /* ───────────────────────── Fetch user config ───────────────────────── */
  useEffect(() => {
    axios.get("/api/user-config")
      .then((res: any) => {
        if (res.data && isMountedRef.current) {
          setConfig({
            language: res.data.language || "en-US",
            voiceId: VALID_VOICES.includes(res.data.voiceId) ? res.data.voiceId : "Elliot",
            voiceProvider: "vapi",
          });
        }
      })
      .catch(() => { })
      .finally(() => {
        if (isMountedRef.current) setIsConfigLoaded(true);
      });
  }, []);

  /* ───────────────────────── Question index — SIMPLE & RELIABLE ───────────────────────── */
  const currentQuestionIndex: number = useMemo(() => {
    if (!conversation) return 0;
    try {
      const logs: ConversationMessage[] = JSON.parse(conversation);

      // ✅ Count substantial user responses (candidate answers)
      // Each substantial response = 1 question answered
      let responseCount = 0;
      let lastUserContent = "";

      for (const msg of logs) {
        if (msg.role === "user") {
          const content = (msg.content || msg.message || "").trim();

          // Count as a real response if:
          // 1. It's longer than 30 characters
          // 2. It's not just "yes", "no", "repeat", etc.
          const isRealResponse = content.length > 30 &&
            !["yes", "no", "repeat", "ok", "okay", "sure", "yeah", "ready", "repeat the question", "can you repeat"].includes(content.toLowerCase());

          if (isRealResponse && content !== lastUserContent) {
            responseCount++;
            lastUserContent = content;
          }
        }
      }

      return Math.min(responseCount, totalQuestions);
    } catch {
      return 0;
    }
  }, [conversation, totalQuestions]);

  // ✅ NEW STATES for interview features
  const [transcript, setTranscript] = useState<string>("");
  const [aiIsSpeaking, setAiIsSpeaking] = useState<boolean>(false);
  const [candidateIsThinking, setCandidateIsThinking] = useState<boolean>(false);
  const [showTimeWarning, setShowTimeWarning] = useState<boolean>(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ✅ More accurate question name
  const questionNames = interviewInfo?.interviewData?.questions?.map((q: Question) => {
    const words = q.question?.split(" ") || [];
    return words.slice(0, 4).join(" ") + (words.length > 4 ? "..." : "");
  }) || [];

  const currentQuestionName = questionNames[currentQuestionIndex] ||
    `Question ${Math.min(currentQuestionIndex + 1, totalQuestions)}`;
  const totalDuration = parseInt(String(interviewInfo?.interviewData?.duration || "0")) * 60;

  const progressPercentage: number = useMemo(() => {
    if (totalQuestions === 0) return 0;

    // ✅ Count both questions asked AND questions answered
    // Progress = questions completed (answered) / total questions
    const completedQuestions = currentQuestionIndex;

    // ✅ Add partial progress if currently on a question
    // If candidate is speaking (answering), consider it 50% of current question
    let partialProgress = 0;
    if (activeUser && !aiIsSpeaking) {
      partialProgress = 0.5; // Candidate is answering = half progress on current question
    }

    const totalProgress = ((completedQuestions + partialProgress) / totalQuestions) * 100;
    return Math.round(Math.min(totalProgress, 100));
  }, [currentQuestionIndex, totalQuestions, activeUser, aiIsSpeaking]);

  /* ───────────────────────── Keep refs in sync ───────────────────────── */
  useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
    progressPercentageRef.current = progressPercentage;
  }, [currentQuestionIndex, progressPercentage]);

  useEffect(() => {
    conversationRef.current = conversation || null;
  }, [conversation]);

  // ✅ Time Warning
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

  /* ───────────────────────── GenerateFeedback ───────────────────────── */
  const GenerateFeedback = useCallback(async (
    reason: string,
    progress: number,
    conv: string | null,
    tabCount: number,
    timestamps: string[]
  ): Promise<void> => {
    if (feedbackCalledRef.current) return;
    feedbackCalledRef.current = true;

    if (isMountedRef.current) setLoading(true);

    try {
      const aiRes = await axios.post("/api/ai-feedback", { conversation: conv });
      if (aiRes.data?.error) throw new Error(aiRes.data.error);

      const parsed = typeof aiRes.data === "string"
        ? JSON.parse(aiRes.data.replace(/```json|```/gi, "").trim())
        : aiRes.data;

      await axios.post("/api/interview-feedback", {
        userName: interviewInfo?.userName,
        userEmail: interviewInfo?.userEmail,
        interviewId: interview_id,
        feedback: parsed,
        exitReason: reason,
        progressAtExit: progress,
        completionStatus: progress === 100 ? "Success" : "Incomplete",
        tabSwitches: tabCount,
        securityFlags: {
          timestamps: timestamps,
          browser: typeof navigator !== "undefined" ? navigator.userAgent : "",
          platform: typeof navigator !== "undefined" ? navigator.platform : "",
        },
      });

      if (isMountedRef.current) {
        router.replace(`/interview/${interview_id}/completed`);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        toast.error("Feedback error — redirecting…");
        setTimeout(() => {
          if (isMountedRef.current) {
            router.replace(`/interview/${interview_id}/completed`);
          }
        }, 2000);
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [interviewInfo, interview_id, router]);
  const startCall = useCallback((vapiInstance: any): void => {
    const langMap: Record<string, string> = { "en-US": "en-US", "hi-IN": "hi", "ur-PK": "multi" };
    const sysLang: Record<string, string> = {
      "en-US": "English",
      "hi-IN": "Hindi (हिंदी). Always respond in Hindi script.",
      "ur-PK": "Urdu (اردو). Always respond in Urdu script.",
    };

    const ql: string = interviewInfo?.interviewData?.questions
      ?.map((q: Question, i: number) => `${i + 1}. ${q.question}`)
      .join("\n") || "";

    // ✅ Get question names for progress display
    const questionNames = interviewInfo?.interviewData?.questions?.map((q: Question) => q.question) || [];

    let welcome: string = `Hi ${interviewInfo?.userName}! Ready to start?`;
    if (config.language.startsWith("hi"))
      welcome = `नमस्ते ${interviewInfo?.userName}! क्या आप साक्षात्कार शुरू करने के लिए तैयार हैं?`;
    if (config.language.startsWith("ur"))
      welcome = `اسلام و علیکم ${interviewInfo?.userName}! کیا آپ انٹرویو کے لیے تیار ہیں؟`;

    vapiInstance.start({
      name: "AI Recruiter",
      firstMessage: welcome,
      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: langMap[config.language] || "en-US",
      },
      voice: {
        provider: "vapi",
        voiceId: VALID_VOICES.includes(config.voiceId) ? config.voiceId : "Elliot",
      },
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: `You are an AI recruiter. Conduct the interview in ${sysLang[config.language] || "English"}.

INTERVIEW QUESTIONS (ask one by one):
${ql}

CRITICAL RULES - FOLLOW STRICTLY:

1. ASKING QUESTIONS:
   - Ask ONE question at a time.
   - After asking a question, STOP TALKING COMPLETELY.
   - Give the candidate time to think and respond.

2. SILENCE HANDLING (MOST IMPORTANT):
   - Do NOT interrupt the candidate while they are speaking.
   - Wait for the candidate to finish their answer naturally.
   - If the candidate is silent for AT LEAST 5-7 seconds, assume they have finished answering.
   - After 5-7 seconds of silence, say "Thank you for your answer. Shall we move to the next question?"
   - Wait for the candidate to say "yes", "sure", "okay", or similar confirmation.
   - If they don't confirm, ask "Would you like me to repeat the question or shall we continue?"

3. REPEATING QUESTIONS:
   - If the candidate says "repeat", "can you repeat", "repeat the question", or similar:
     - Apologize briefly and repeat the EXACT same question word for word.
     - Then wait for their answer again.

4. CANDIDATE SPEAKING:
   - NEVER interrupt or talk over the candidate.
   - If the candidate pauses briefly (1-3 seconds), WAIT - they might be thinking.
   - Only consider silence of 5+ seconds as "finished answering".

5. ENDING THE INTERVIEW:
   - After the LAST question is answered, say:
     "Thank you for completing the interview! Your responses have been recorded. Have a great day!"
   - End the conversation.

6. GENERAL BEHAVIOR:
   - Be professional, friendly, and encouraging.
   - Do NOT rush the candidate.
   - Do NOT ask multiple questions at once.
   - Do NOT provide feedback or scores during the interview.
   - Keep your responses concise and focused on the interview.`,
        }],
      },
    });
  }, [interviewInfo, config]);


  // ✅ Repeat question handler - Alternative approach
  const handleRepeatQuestion = useCallback((): void => {
    if (vapiRef.current && isCallActiveRef.current) {
      try {
        // Option 1: Add message to conversation
        vapiRef.current.send({
          type: "add-message",
          message: {
            role: "user",
            content: "repeat the question",
          },
        });

        // Option 2: If Vapi has a direct say method
        // vapiRef.current.say("Can you please repeat the last question?");

        toast.success("Repeating question...");
      } catch (err) {
        toast.error("Failed to repeat question.");
      }
    }
  }, []);
  /* ───────────────────────── Vapi setup ───────────────────────── */
  // ─── Enhanced Vapi setup ───
  useEffect(() => {
    if (!interviewInfo || hasInterviewStarted || !isPreCheckComplete || !isConfigLoaded) return;
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY as string);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      isCallActiveRef.current = true;
      if (isMountedRef.current) setActiveUser(true);
    });

    // ✅ Track AI speaking
    vapi.on("speech-start", () => {
      if (!hasGreetedRef.current) {
        hasGreetedRef.current = true;
        toast.success("Interview started!");
      }
      if (isMountedRef.current) {
        setStartTimer(false);
        setAiIsSpeaking(true);
        setCandidateIsThinking(false);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      }
    });

    // ✅ Track candidate thinking (silence detection)
    vapi.on("speech-end", () => {
      if (isMountedRef.current) {
        setStartTimer(true);
        setResetTimer(true);
        setAiIsSpeaking(false);

        // Start silence timer - if no speech for 5 seconds, show thinking indicator
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) setCandidateIsThinking(true);
        }, 5000);

        setTimeout(() => {
          if (isMountedRef.current) setResetTimer(false);
        }, 50);
      }
    });

    vapi.on("volume-level", (l: number) => {
      if (isMountedRef.current) {
        setVolume(l);
        // Reset thinking indicator when candidate speaks
        if (l > 0.02) {
          setCandidateIsThinking(false);
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        }
      }
    });

    // ✅ Track transcript messages
    vapi.on("message", (msg: VapiMessage) => {
      if (msg?.conversation) {
        const c: string = JSON.stringify(msg.conversation);
        conversationRef.current = c;
        if (isMountedRef.current) setConversation(c);

        // Extract last AI message for transcript
        try {
          const conv = typeof msg.conversation === "string"
            ? JSON.parse(msg.conversation)
            : msg.conversation;
          if (Array.isArray(conv)) {
            const lastMsg = conv[conv.length - 1];
            if (lastMsg?.role === "assistant" || lastMsg?.role === "bot") {
              const text = lastMsg.content || lastMsg.message || "";
              if (isMountedRef.current) setTranscript(text);
            }
          }
        } catch { }
      }
    });

    vapi.on("call-end", () => {
      isCallActiveRef.current = false;
      if (isMountedRef.current) {
        setActiveUser(false);
        setAiIsSpeaking(false);
        setCandidateIsThinking(false);
      }

      const latestIndex: number = currentQuestionIndexRef.current;
      const latestProgress: number = progressPercentageRef.current;
      const latestConv: string | null = conversationRef.current;
      const latestTabCount: number = tabSwitchCountRef.current;
      const latestTimestamps: string[] = switchTimestampsRef.current;

      const reason: string = latestIndex >= totalQuestions
        ? "Interview Completed Normally"
        : "User Ended Early";

      GenerateFeedback(reason, latestProgress, latestConv, latestTabCount, latestTimestamps);
    });

    vapi.on("error", (err: VapiError) => {
      const isNormalEnd: boolean =
        err?.error?.type === "ejected" ||
        err?.error?.msg === "Meeting has ended" ||
        err?.errorMsg === "Meeting has ended" ||
        err?.error?.type === "no-room";

      if (isNormalEnd) return;
      if (err?.type === "daily-error" && !isCallActiveRef.current) return;

      if (isMountedRef.current) {
        toast.error("Connection error — check your internet.");
        router.replace(`/interview/${interview_id}/completed`);
      }
    });

    if (interviewInfo?.interviewData?.questions?.length) {
      startCall(vapi);
      if (isMountedRef.current) setHasInterviewStarted(true);
    }

    return () => {
      vapi.removeAllListeners();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (isCallActiveRef.current) {
        try { vapi.stop(); } catch { }
        isCallActiveRef.current = false;
      }
    };
  }, [interviewInfo, isPreCheckComplete,interview_id,router, isConfigLoaded, hasInterviewStarted, totalQuestions, startCall, GenerateFeedback]);
  /* ─────────────────────────── RENDER ─────────────────────── */
  return (
    <>
      <style>{STYLES}</style>

      <div
        className="h-screen w-screen overflow-hidden flex flex-col relative"
        style={{ background: "#020817", fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* ══ ANIMATED BACKGROUND ══ */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div
            className="orb-1 absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(37,99,235,.18) 0%, transparent 70%)", filter: "blur(60px)" }}
          />
          <div
            className="orb-2 absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,.14) 0%, transparent 70%)", filter: "blur(80px)" }}
          />
          <div
            className="orb-3 absolute top-[30%] right-[20%] w-[30%] h-[30%] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(6,182,212,.1) 0%, transparent 70%)", filter: "blur(50px)" }}
          />
          <div
            className="grid-pulse absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(148,163,184,.5) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          {[...Array(6)].map((_, i: number) => (
            <div
              key={i}
              className="absolute left-0 right-0 h-px"
              style={{ top: `${15 + i * 14}%`, background: "rgba(255,255,255,.02)" }}
            />
          ))}
        </div>

        {/* ══ HEADER ══ */}
        <header
          className="header-anim relative z-20 h-16 shrink-0 flex items-center justify-between px-6 md:px-10"
          style={{ borderBottom: "1px solid rgba(255,255,255,.06)", background: "rgba(2,8,23,.7)", backdropFilter: "blur(20px)" }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl blur-md" style={{ background: "rgba(37,99,235,.5)" }} />
              <div className="relative w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", border: "1px solid rgba(96,165,250,.3)" }}>
                <Bot style={{ width: 18, height: 18, color: "#fff" }} />
              </div>
            </div>
            <div>
              <span className="font-bold text-white text-sm tracking-wide" style={{ fontFamily: "'Syne',sans-serif", letterSpacing: ".08em" }}>
                AI<span style={{ color: "#60a5fa" }}>RECRUITER</span>
              </span>
              <div className="text-[9px] text-slate-500 uppercase tracking-widest -mt-0.5">Powered by Vapi</div>
            </div>
          </div>

          {/* ✅ Question Progress with Names */}
          {isPreCheckComplete && (
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest block">Question {currentQuestionIndex}/{totalQuestions}</span>
                <span className="text-[11px] text-blue-400 font-bold truncate max-w-[200px] block">
                  {currentQuestionName}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalQuestions }).map((_, i: number) => (
                  <div key={i} className="h-1.5 w-6 rounded-full transition-all duration-500"
                    style={{
                      background: i < currentQuestionIndex
                        ? "linear-gradient(90deg,#3b82f6,#60a5fa)"
                        : "rgba(255,255,255,.08)",
                    }} />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* ✅ Time Warning */}
            {showTimeWarning && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full animate-pulse"
                style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)" }}>
                <Clock style={{ width: 12, height: 12, color: "#fbbf24" }} />
                <span className="text-[10px] text-amber-400 font-bold">
                  {Math.floor((totalDuration - elapsedSecs) / 60)}:{(totalDuration - elapsedSecs) % 60 < 10 ? '0' : ''}{(totalDuration - elapsedSecs) % 60} left
                </span>
              </div>
            )}

            {activeUser && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)" }}>
                <Clock style={{ width: 12, height: 12, color: "#4ade80" }} />
                <span className="text-[11px] font-mono text-green-400 font-bold">{fmtTime(elapsedSecs)}</span>
              </div>
            )}
            <div className="badge-live flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)" }}>
              <div className="live-dot flex items-center gap-[3px]"><span /><span /><span /></div>
              <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Live</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
              <Shield style={{ width: 12, height: 12, color: "#64748b" }} />
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">Secure</span>
            </div>
          </div>
        </header>

        {/* ══ MAIN ══ */}
        <main className="main-anim flex-1 relative z-10 flex flex-col items-center justify-center px-4 md:px-16 overflow-hidden">
          {!isPreCheckComplete ? (
            /* ✅ Pre-Interview Check (Mic + Camera + Tips + Sample Question) */
            <PreInterviewCheck
              interviewData={interviewInfo?.interviewData}
              onAllReady={() => setIsPreCheckComplete(true)}
            />
          ) : (
            /* ✅ Interview Interface */
            <div className="w-full max-w-5xl h-full flex flex-col justify-center py-6">
              <div className="mb-6 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-widest">
                  <span>Session Progress</span>
                  <span className="text-blue-400 font-bold">{progressPercentage}%</span>
                </div>
                <div className="h-px w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.06)" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progressPercentage}%`,
                      background: "linear-gradient(90deg,#1d4ed8,#60a5fa,#38bdf8)",
                      boxShadow: "0 0 12px rgba(96,165,250,.6)",
                    }}
                  />
                </div>
              </div>
              <InterviewInterface
                interviewInfo={interviewInfo}
                currentQuestionIndex={currentQuestionIndex}
                totalQuestions={totalQuestions}
                activeUser={activeUser}
                aiIsSpeaking={aiIsSpeaking}
                candidateIsThinking={candidateIsThinking}
                transcript={transcript}
                currentQuestionName={currentQuestionName}
                onRepeatQuestion={handleRepeatQuestion}
              />
            </div>
          )}
        </main>

        {/* ══ FOOTER ══ */}
        {isPreCheckComplete && (
          <footer className="footer-anim relative z-20 shrink-0 px-6 md:px-16 py-4"
            style={{ borderTop: "1px solid rgba(255,255,255,.06)", background: "rgba(2,8,23,.8)", backdropFilter: "blur(24px)" }}>
            {activeUser && (
              <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
                <div className="h-full transition-all duration-75"
                  style={{
                    width: `${Math.min(100, volume * 400)}%`,
                    background: "linear-gradient(90deg,#3b82f6,#60a5fa,#38bdf8)",
                    boxShadow: "0 0 8px rgba(96,165,250,.8)",
                  }}
                />
              </div>
            )}
            <InterviewControls
              loading={loading}
              activeUser={activeUser}
              onStop={() => {
                if (vapiRef.current && isCallActiveRef.current) {
                  try { vapiRef.current.stop(); } catch { }
                }
              }}
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