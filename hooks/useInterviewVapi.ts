// interview/[interview_id]/start/_hooks/useInterviewVapi.ts
"use client";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Vapi from "@vapi-ai/web";
import { toast } from "sonner";
import axios from "axios";
import { useRouter } from "next/navigation";

// ─── Type Definitions ───
export interface Question {
  question: string;
  answer?: string;
  type?: string;
}

export interface UserConfig {
  language: string;
  voiceId: string;
  voiceProvider: string;
}

interface VapiMessage {
  conversation?: any;
  [key: string]: any;
}

interface VapiError {
  error?: { type?: string; msg?: string };
  errorMsg?: string;
  type?: string;
}

interface ConversationMessage {
  role: string;
  content?: string;
  message?: string;
}

interface InterviewInfo {
  userName?: string;
  userEmail?: string;
  interviewData?: {
    questions?: Question[];
    duration?: string | number;
  };
}

interface UseInterviewVapiProps {
  interviewInfo: InterviewInfo | undefined;
  interviewId: string;
  isPreCheckComplete: boolean;
  isConfigLoaded: boolean;
}

// ─── Constants ───
const VALID_VOICES: string[] = [
  "Clara", "Godfrey", "Layla", "Sid", "Gustavo", "Elliot", "Kylie", "Rohan",
  "Lily", "Savannah", "Hana", "Neha", "Cole", "Harry", "Paige", "Spencer",
  "Nico", "Kai", "Emma", "Sagar", "Neil", "Naina", "Leah", "Tara", "Jess",
  "Leo", "Dan", "Mia", "Zac", "Zoe",
];

// ─── Custom Hook ───
export function useInterviewVapi({
  interviewInfo,
  interviewId,
  isPreCheckComplete,
  isConfigLoaded,
}: UseInterviewVapiProps) {
  const router = useRouter();

  /* ─── REFS ─── */
  const vapiRef = useRef<any>(null);
  const currentQuestionIndexRef = useRef<number>(0);
  const progressPercentageRef = useRef<number>(0);
  const conversationRef = useRef<string | null>(null);
  const feedbackCalledRef = useRef<boolean>(false);
  const isCallActiveRef = useRef<boolean>(false);
  const initStartedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const hasGreetedRef = useRef<boolean>(false);
  const tabSwitchCountRef = useRef<number>(0);
  const switchTimestampsRef = useRef<string[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ─── STATE ─── */
  const [activeUser, setActiveUser] = useState<boolean>(false);
  const [conversation, setConversation] = useState<string | undefined>();
  const [hasInterviewStarted, setHasInterviewStarted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [startTimer, setStartTimer] = useState<boolean>(false);
  const [resetTimer, setResetTimer] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>("");
  const [aiIsSpeaking, setAiIsSpeaking] = useState<boolean>(false);
  const [candidateIsThinking, setCandidateIsThinking] = useState<boolean>(false);
  const [config, setConfig] = useState<UserConfig>({
    language: "en-US",
    voiceId: "Elliot",
    voiceProvider: "vapi",
  });

  const totalQuestions: number = interviewInfo?.interviewData?.questions?.length || 5;

  /* ─── Sync anti-cheat refs ─── */
  const syncAntiCheatRefs = useCallback((tabCount: number, timestamps: string[]) => {
    tabSwitchCountRef.current = tabCount;
    switchTimestampsRef.current = timestamps;
  }, []);

  /* ─── Track mount/unmount ─── */
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  /* ─── Fetch user config ─── */
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
      .catch(() => {});
  }, []);

  /* ─── Question index — ACCURATE with turn merging ─── */
  const currentQuestionIndex: number = useMemo(() => {
    if (!conversation) return 0;
    try {
      const logs: ConversationMessage[] = JSON.parse(conversation);
      if (!Array.isArray(logs)) return 0;

      // ✅ STEP 1: Merge consecutive user turns into single answers
      const mergedLogs: ConversationMessage[] = [];
      for (const msg of logs) {
        const last = mergedLogs[mergedLogs.length - 1];
        if (last && last.role === "user" && msg.role === "user") {
          last.content = (last.content || "") + " " + (msg.content || msg.message || "");
        } else {
          mergedLogs.push({ ...msg });
        }
      }

      // ✅ STEP 2: Count AI responses that followed a substantial user answer
      let questionsAsked = 0;
      for (let i = 1; i < mergedLogs.length; i++) {
        const prev = mergedLogs[i - 1];
        const curr = mergedLogs[i];

        const isAI = curr.role === "assistant" || curr.role === "bot";
        const prevWasUser = prev.role === "user";
        const userAnswer = (prev.content || prev.message || "").trim();
        const isSubstantial = userAnswer.length > 15;

        if (isAI && prevWasUser && isSubstantial) {
          questionsAsked++;
        }
      }

      const hasAI = mergedLogs.some((m) => m.role === "assistant" || m.role === "bot");
      if (hasAI && questionsAsked === 0) questionsAsked = 1;

      const currentIdx = Math.max(0, Math.min(questionsAsked - 1, totalQuestions - 1));
      return currentIdx;
    } catch {
      return 0;
    }
  }, [conversation, totalQuestions]);

  /* ─── Progress percentage ─── */
  const progressPercentage: number = useMemo(() => {
    if (totalQuestions === 0) return 0;
    const completedQuestions = currentQuestionIndex;
    const partialProgress = activeUser && !aiIsSpeaking ? 0.5 : 0;
    const totalProgress = ((completedQuestions + partialProgress) / totalQuestions) * 100;
    return Math.round(Math.min(totalProgress, 100));
  }, [currentQuestionIndex, totalQuestions, activeUser, aiIsSpeaking]);

  /* ─── Keep refs in sync ─── */
  useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
    progressPercentageRef.current = progressPercentage;
  }, [currentQuestionIndex, progressPercentage]);

  useEffect(() => {
    conversationRef.current = conversation || null;
  }, [conversation]);

  /* ─── Generate Feedback ─── */
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
        interviewId,
        feedback: parsed,
        exitReason: reason,
        progressAtExit: progress,
        completionStatus: progress === 100 ? "Success" : "Incomplete",
        tabSwitches: tabCount,
        securityFlags: {
          timestamps,
          browser: typeof navigator !== "undefined" ? navigator.userAgent : "",
          platform: typeof navigator !== "undefined" ? navigator.platform : "",
        },
      });

      if (isMountedRef.current) router.replace(`/interview/${interviewId}/completed`);
    } catch {
      if (isMountedRef.current) {
        toast.error("Feedback error — redirecting…");
        setTimeout(() => {
          if (isMountedRef.current) router.replace(`/interview/${interviewId}/completed`);
        }, 2000);
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [interviewInfo, interviewId, router]);

  /* ─── Build Vapi system prompt ─── */
  const buildSystemPrompt = useCallback((langCode: string): string => {
    const sysLang: Record<string, string> = {
      "en-US": "English",
      "hi-IN": "Hindi (हिंदी). Always respond in Hindi script.",
      "ur-PK": "Urdu (اردو). Always respond in Urdu script.",
    };

    const transitionPrompts: Record<string, string> = {
      "en-US": "Thank you for your answer. Shall we move to the next question?",
      "hi-IN": "आपके उत्तर के लिए धन्यवाद। क्या हम अगले प्रश्न की ओर बढ़ें?",
      "ur-PK": "آپ کے جواب کا شکریہ۔ کیا ہم اگلے سوال کی طرف بڑھیں؟",
    };

    const repeatPrompts: Record<string, string> = {
      "en-US": "Of course, let me repeat the question.",
      "hi-IN": "बिल्कुल, मैं प्रश्न दोहराता हूं।",
      "ur-PK": "بالکل، میں سوال دہراتا ہوں۔",
    };

    const endingPrompts: Record<string, string> = {
      "en-US": "Thank you for completing the interview! Your responses have been recorded. Have a great day!",
      "hi-IN": "साक्षात्कार पूरा करने के लिए धन्यवाद! आपके उत्तर रिकॉर्ड कर लिए गए हैं। आपका दिन शुभ हो!",
      "ur-PK": "انٹرویو مکمل کرنے کا شکریہ! آپ کے جوابات ریکارڈ کر لیے گئے ہیں۔ آپ کا دن اچھا گزرے!",
    };

    const ql: string = interviewInfo?.interviewData?.questions
      ?.map((q: Question, i: number) => `${i + 1}. ${q.question}`)
      .join("\n") || "";

    return `You are an AI recruiter. Conduct the ENTIRE interview in ${sysLang[langCode] || "English"}.

INTERVIEW QUESTIONS (ask one by one):
${ql}

CRITICAL RULES - FOLLOW STRICTLY:

1. LANGUAGE RULE (MOST IMPORTANT):
   - Speak ONLY in ${sysLang[langCode] || "English"} throughout the entire interview.
   - NEVER switch to English or any other language.

2. ASKING QUESTIONS:
   - Ask ONE question at a time.
   - After asking a question, STOP TALKING COMPLETELY.

3. SILENCE HANDLING:
   - Do NOT interrupt the candidate while they are speaking.
   - If the candidate is silent for AT LEAST 5-7 seconds, assume they have finished.
   - After 5-7 seconds of silence, say EXACTLY: "${transitionPrompts[langCode]}"
   - Wait for confirmation before proceeding.

4. MOVING TO NEXT QUESTION:
   - If the candidate says "next", "move on", "skip", "next question", or "Yes, please move to the next question", immediately proceed to the next question WITHOUT further confirmation.

5. REPEATING QUESTIONS:
   - If the candidate asks to repeat, say: "${repeatPrompts[langCode]}"
   - Then repeat the EXACT same question word for word.

6. CANDIDATE SPEAKING:
   - NEVER interrupt or talk over the candidate.
   - Only consider silence of 5+ seconds as "finished answering".

7. ENDING THE INTERVIEW:
   - After the LAST question is answered, say EXACTLY: "${endingPrompts[langCode]}"
   - End the conversation.

8. GENERAL BEHAVIOR:
   - Be professional, friendly, and encouraging.
   - Do NOT rush the candidate.
   - Do NOT ask multiple questions at once.`;
  }, [interviewInfo]);

  /* ─── Start Vapi call ─── */
  const startCall = useCallback((vapiInstance: any): void => {
    const langMap: Record<string, string> = {
      "en-US": "en-US",
      "hi-IN": "hi",
      "ur-PK": "ur",   // ✅ Fixed: "multi" → "ur"
    };
    const langCode = config.language.startsWith("hi") ? "hi-IN"
      : config.language.startsWith("ur") ? "ur-PK" : "en-US";

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
        messages: [{ role: "system", content: buildSystemPrompt(langCode) }],
      },
    });
  }, [interviewInfo, config, buildSystemPrompt]);

  /* ─── Vapi setup ─── */
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

    vapi.on("speech-end", () => {
      if (isMountedRef.current) {
        setStartTimer(true);
        setResetTimer(true);
        setAiIsSpeaking(false);
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
        if (l > 0.02) {
          setCandidateIsThinking(false);
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        }
      }
    });

    vapi.on("message", (msg: VapiMessage) => {
      if (msg?.conversation) {
        const c: string = JSON.stringify(msg.conversation);
        conversationRef.current = c;
        if (isMountedRef.current) setConversation(c);

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
        } catch {}
      }
    });

    vapi.on("call-end", () => {
      isCallActiveRef.current = false;
      if (isMountedRef.current) {
        setActiveUser(false);
        setAiIsSpeaking(false);
        setCandidateIsThinking(false);
      }

      const latestIndex = currentQuestionIndexRef.current;
      const latestProgress = progressPercentageRef.current;
      const latestConv = conversationRef.current;
      const latestTabCount = tabSwitchCountRef.current;
      const latestTimestamps = switchTimestampsRef.current;

      const reason = latestIndex >= totalQuestions
        ? "Interview Completed Normally"
        : "User Ended Early";

      GenerateFeedback(reason, latestProgress, latestConv, latestTabCount, latestTimestamps);
    });

    vapi.on("error", (err: VapiError) => {
      // ✅ Robust error filtering
      const errType = err?.error?.type || "";
      const errMsg = err?.error?.msg || err?.errorMsg || "";
      const topLevelType = err?.type || "";

      const isStartupNoise =
        !isCallActiveRef.current &&
        !hasGreetedRef.current;

      const isNormalEnd =
        errType === "ejected" ||
        errType === "no-room" ||
        errMsg === "Meeting has ended" ||
        errMsg.toLowerCase().includes("meeting has ended") ||
        errMsg.toLowerCase().includes("ejected");

      const isDailyStartupError =
        topLevelType === "daily-error" && !isCallActiveRef.current;

      if (isNormalEnd) {
        console.log("ℹ️ Ignoring normal-end error:", errMsg);
        return;
      }
      if (isDailyStartupError) {
        console.log("ℹ️ Ignoring daily startup error");
        return;
      }
      if (isStartupNoise) {
        console.log("ℹ️ Ignoring startup noise:", errType, errMsg);
        return;
      }

      console.error("❌ Real Vapi error:", err);
      if (isMountedRef.current && isCallActiveRef.current) {
        toast.error("Connection lost — check your internet.");
        router.replace(`/interview/${interviewId}/completed`);
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
        try { vapi.stop(); } catch {}
        isCallActiveRef.current = false;
      }
    };
  }, [interviewInfo, isPreCheckComplete, interviewId, router, isConfigLoaded,
      hasInterviewStarted, totalQuestions, startCall, GenerateFeedback]);

  /* ─── Repeat question handler ─── */
  const handleRepeatQuestion = useCallback((): void => {
    if (vapiRef.current && isCallActiveRef.current) {
      try {
        vapiRef.current.send({
          type: "add-message",
          message: { role: "user", content: "repeat the question" },
        });
        toast.success("Repeating question...");
      } catch {
        toast.error("Failed to repeat question.");
      }
    }
  }, []);

  /* ─── Next question handler ✅ NEW ─── */
  const handleNextQuestion = useCallback((): void => {
    if (vapiRef.current && isCallActiveRef.current) {
      try {
        vapiRef.current.send({
          type: "add-message",
          message: {
            role: "user",
            content: "Yes, please move to the next question.",
          },
        });
        toast.success("Moving to next question...");
      } catch {
        toast.error("Failed to skip question.");
      }
    }
  }, []);

  /* ─── Stop interview handler ─── */
  const handleStop = useCallback((): void => {
    if (vapiRef.current && isCallActiveRef.current) {
      try { vapiRef.current.stop(); } catch {}
    }
  }, []);

  return {
    // State
    activeUser,
    loading,
    volume,
    startTimer,
    resetTimer,
    aiIsSpeaking,
    candidateIsThinking,
    transcript,
    currentQuestionIndex,
    progressPercentage,
    totalQuestions,
    conversation,
    // Actions
    handleRepeatQuestion,
    handleNextQuestion,      // ✅ NEW
    handleStop,
    syncAntiCheatRefs,
  };
}