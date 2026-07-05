"use client";
import React, { useContext, useEffect, useRef, useState, useMemo, useCallback } from "react";
import { InterviewDataContext, InterviewInfo } from "@/context/InterviewDataContext";
import Vapi from "@vapi-ai/web";
import { toast } from "sonner";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import InterviewInterface from "./_components/InterviewInterface";
import InterviewControls from "./_components/InterviewControls";
import MicTest from "./_components/MicTest";
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
  const [isMicChecked, setIsMicChecked] = useState<boolean>(false);
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

  /* ───────────────────────── Question index — deduped ───────────────────────── */
  const currentQuestionIndex: number = useMemo(() => {
    if (!conversation) return 0;
    try {
      const logs: ConversationMessage[] = JSON.parse(conversation);
      const assistantTurns: number = logs.reduce((count: number, msg: ConversationMessage, i: number) => {
        const isAssistant: boolean = msg.role === "assistant" || msg.role === "bot";
        const prevWasAssistant: boolean = i > 0 && (logs[i - 1].role === "assistant" || logs[i - 1].role === "bot");
        const isSubstantial: boolean = (msg.content || msg.message || "").length > 15;
        if (isAssistant && !prevWasAssistant && isSubstantial) return count + 1;
        return count;
      }, 0);
      return Math.min(assistantTurns, totalQuestions);
    } catch {
      return 0;
    }
  }, [conversation, totalQuestions]);

  const progressPercentage: number = useMemo(() =>
    Math.round((currentQuestionIndex / totalQuestions) * 100),
    [currentQuestionIndex, totalQuestions]
  );

  /* ───────────────────────── Keep refs in sync ───────────────────────── */
  useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
    progressPercentageRef.current = progressPercentage;
  }, [currentQuestionIndex, progressPercentage]);

  useEffect(() => {
    conversationRef.current = conversation || null;
  }, [conversation]);

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

  /* ───────────────────────── startCall ───────────────────────── */
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
          content: `You are an AI recruiter. Conduct the interview in ${sysLang[config.language] || "English"}. Ask these questions one by one:\n${ql}\nAsk one question, then stay completely silent and wait for the candidate to fully respond. Do not interrupt or move to the next question until the candidate has clearly finished their answer.`,
        }],
      },
    });
  }, [interviewInfo, config]);

  /* ───────────────────────── Vapi setup ───────────────────────── */
  useEffect(() => {
    if (!interviewInfo || hasInterviewStarted || !isMicChecked || !isConfigLoaded) return;
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY as string);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      isCallActiveRef.current = true;
      if (isMountedRef.current) setActiveUser(true);
    });

    vapi.on("speech-start", () => {
      if (!hasGreetedRef.current) {
        hasGreetedRef.current = true;
        toast.success("Interview started!");
      }
      if (isMountedRef.current) setStartTimer(false);
    });

    vapi.on("speech-end", () => {
      if (isMountedRef.current) {
        setStartTimer(true);
        setResetTimer(true);
        setTimeout(() => {
          if (isMountedRef.current) setResetTimer(false);
        }, 50);
      }
    });

    vapi.on("volume-level", (l: number) => {
      if (isMountedRef.current) setVolume(l);
    });

    vapi.on("message", (msg: VapiMessage) => {
      if (msg?.conversation) {
        const c: string = JSON.stringify(msg.conversation);
        conversationRef.current = c;
        if (isMountedRef.current) setConversation(c);
      }
    });

    vapi.on("call-end", () => {
      isCallActiveRef.current = false;
      if (isMountedRef.current) setActiveUser(false);

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
      }
    });

    if (interviewInfo?.interviewData?.questions?.length) {
      startCall(vapi);
      if (isMountedRef.current) setHasInterviewStarted(true);
    }

    return () => {
      vapi.removeAllListeners();
      if (isCallActiveRef.current) {
        try { vapi.stop(); } catch { }
        isCallActiveRef.current = false;
      }
    };
  }, [interviewInfo, isMicChecked, isConfigLoaded, hasInterviewStarted, totalQuestions, startCall, GenerateFeedback]);

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
              <div
                className="relative w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", border: "1px solid rgba(96,165,250,.3)" }}
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

          {isMicChecked && (
            <div className="hidden md:flex items-center gap-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">Question</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalQuestions }).map((_, i: number) => (
                  <div
                    key={i}
                    className="h-1.5 w-6 rounded-full transition-all duration-500"
                    style={{
                      background: i < currentQuestionIndex
                        ? "linear-gradient(90deg,#3b82f6,#60a5fa)"
                        : "rgba(255,255,255,.08)",
                    }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-slate-400">{currentQuestionIndex}/{totalQuestions}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            {activeUser && (
              <div
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)" }}
              >
                <Clock style={{ width: 12, height: 12, color: "#4ade80" }} />
                <span className="text-[11px] font-mono text-green-400 font-bold">{fmtTime(elapsedSecs)}</span>
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

        {/* ══ MAIN ══ */}
        <main className="main-anim flex-1 relative z-10 flex flex-col items-center justify-center px-4 md:px-16 overflow-hidden">
          {!isMicChecked ? (
            <div className="relative w-full max-w-md">
              <div
                className="absolute inset-0 rounded-3xl blur-2xl -z-10"
                style={{ background: "rgba(37,99,235,.15)", transform: "scale(1.1)" }}
              />
              <div
                className="scan-wrap rounded-3xl overflow-hidden"
                style={{ border: "1px solid rgba(255,255,255,.08)", background: "rgba(2,8,23,.6)", backdropFilter: "blur(30px)" }}
              >
                <MicTest onMicReady={() => setIsMicChecked(true)} />
              </div>
            </div>
          ) : (
            <div className="w-full max-w-5xl h-full flex flex-col justify-center py-6">
              <div className="mb-6 space-y-2">
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
              <InterviewInterface
                interviewInfo={interviewInfo}
                currentQuestionIndex={currentQuestionIndex}
                totalQuestions={totalQuestions}
                activeUser={activeUser}
              />
            </div>
          )}
        </main>

        {/* ══ FOOTER ══ */}
        {isMicChecked && (
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