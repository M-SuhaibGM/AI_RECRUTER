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
  type?: string;
  conversation?: unknown;
  role?: string;
  transcript?: string;
  transcriptType?: string;
  message?: string;
  [key: string]: unknown;
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

const CANDIDATE_SILENCE_MS = 5000;

// ✅ FIX: Vapi/Daily error payloads are NOT shape-stable. Some errors put
// the useful signal at `error.error.type` / `error.error.msg` (e.g. a
// "no-room" room-deletion error); others bury it a level deeper, e.g.
// `error.error.errorMsg` alongside an unrelated top-level `type: "daily-error"`
// (e.g. a normal "ejection" end-of-call event). Reading two fixed paths
// silently misclassifies whichever shape doesn't match — a real ejection
// was observed reaching the "real error" branch and firing a spurious
// "Connection lost" toast instead of being treated as a normal call end.
// Scanning every string value in the object (bounded depth, cycle-safe)
// and checking all of them against the keyword list is robust to whatever
// shape a given error variant happens to use.
function collectErrorStrings(
  value: unknown,
  depth = 0,
  seen: Set<unknown> = new Set(),
  acc: string[] = []
): string[] {
  if (value == null || depth > 5) return acc;
  if (typeof value === "string") {
    acc.push(value);
    return acc;
  }
  if (typeof value !== "object") return acc;
  if (seen.has(value)) return acc;
  seen.add(value);
  for (const v of Object.values(value as Record<string, unknown>)) {
    collectErrorStrings(v, depth + 1, seen, acc);
  }
  return acc;
}

const NORMAL_END_KEYWORDS = [
  "ejected",
  "ejection",
  "no-room",
  "room was deleted",
  "meeting has ended",
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
  const vapiRef = useRef<Vapi | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const isCleaningUpRef = useRef<boolean>(false);
  const isCallActiveRef = useRef<boolean>(false);
  const callStartedRef = useRef<boolean>(false);
  const feedbackCalledRef = useRef<boolean>(false);
  const feedbackInProgressRef = useRef<boolean>(false);
  const hasGreetedRef = useRef<boolean>(false);

  // ✅ FIX (critical): gates the setup effect itself. This must NOT be React
  // state, because the effect that creates the Vapi instance must not be
  // torn down and re-run as a side effect of the call successfully starting.
  // (Previously `hasInterviewStarted` state was both set inside this effect
  // AND listed in its dependency array, which caused React to run the
  // effect's cleanup — including vapi.stop() — immediately after call-start
  // fired, silently killing the interview right after it connected.)
  const setupStartedRef = useRef<boolean>(false);

  // Explicit interview state — no longer derived from transcript
  const currentQuestionIndexRef = useRef<number>(0);
  const answeredQuestionsRef = useRef<number>(0);
  const interviewCompletedRef = useRef<boolean>(false);

  // Conversation refs
  const conversationRef = useRef<string | null>(null);
  const latestProgressRef = useRef<number>(0);

  // Anti-cheat refs
  const tabSwitchCountRef = useRef<number>(0);
  const switchTimestampsRef = useRef<string[]>([]);

  // Timers
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Abort controllers for cleanup
  const feedbackAbortRef = useRef<AbortController | null>(null);

  /* ─── STATE ─── */
  const [activeUser, setActiveUser] = useState<boolean>(false);
  const [conversation, setConversation] = useState<string | undefined>();
  // ✅ Now purely a UI flag (e.g. "connecting..." vs "live"). It no longer
  // gates or re-triggers the setup effect — see setupStartedRef above.
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
  // ✅ Version state to force re-render on ref-only changes
  const [interviewStateVersion, setInterviewStateVersion] = useState(0);

  /* ─── Derived values ─── */
  const questions = interviewInfo?.interviewData?.questions ?? [];
  const totalQuestions = questions.length;

  const currentQuestionIndex = useMemo(() => {
    if (totalQuestions === 0) return 0;
    return Math.min(currentQuestionIndexRef.current, totalQuestions - 1);
  }, [totalQuestions, interviewStateVersion]);

  const progressPercentage = useMemo(() => {
    if (totalQuestions === 0) return 0;
    const answered = Math.min(answeredQuestionsRef.current, totalQuestions);
    return Math.min(Math.round((answered / totalQuestions) * 100), 100);
  }, [totalQuestions, interviewStateVersion]);

  /* ─── Sync refs ─── */
  useEffect(() => {
    latestProgressRef.current = progressPercentage;
  }, [progressPercentage]);

  useEffect(() => {
    conversationRef.current = conversation || null;
  }, [conversation]);

  /* ─── Mounted state ─── */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /* ─── Utility: clear timers ─── */
  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  /* ─── Utility: normalize conversation ─── */
  const normalizeConversation = useCallback((raw: unknown): string | null => {
    if (!raw) return null;
    try {
      if (typeof raw === "string") {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? JSON.stringify(parsed) : raw;
      }
      if (Array.isArray(raw)) return JSON.stringify(raw);
      return JSON.stringify(raw);
    } catch (error) {
      console.error("Failed to normalize Vapi conversation:", error);
      return null;
    }
  }, []);

  const updateConversation = useCallback(
    (raw: unknown) => {
      const normalized = normalizeConversation(raw);
      if (!normalized) return;
      conversationRef.current = normalized;
      if (isMountedRef.current) setConversation(normalized);
    },
    [normalizeConversation]
  );

  /* ─── Anti-cheat refs ─── */
  const syncAntiCheatRefs = useCallback((tabCount: number, timestamps: string[]) => {
    tabSwitchCountRef.current = Math.max(0, tabCount);
    switchTimestampsRef.current = Array.isArray(timestamps) ? [...timestamps] : [];
  }, []);

  /* ─── Load user configuration ─── */
  useEffect(() => {
    let cancelled = false;
    const loadConfig = async () => {
      try {
        const res = await axios.get("/api/user-config");
        if (cancelled || !isMountedRef.current) return;
        const data = res.data;
        setConfig({
          language: typeof data?.language === "string" ? data.language : "en-US",
          voiceId:
            typeof data?.voiceId === "string" && VALID_VOICES.includes(data.voiceId)
              ? data.voiceId
              : "Elliot",
          voiceProvider: "vapi",
        });
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load user configuration:", error);
        }
      }
    };
    loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ─── Build system prompt ─── */
  const buildSystemPrompt = useCallback(
    (langCode: string): string => {
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
        "ur-PK": "بالکل، میں سوال دوبارہ دہراتا ہوں۔",
      };
      const endingPrompts: Record<string, string> = {
        "en-US": "Thank you for completing the interview! Your responses have been recorded. Have a great day!",
        "hi-IN": "साक्षात्कार पूरा करने के लिए धन्यवाद! आपके उत्तर रिकॉर्ड कर लिए गए हैं। आपका दिन शुभ हो!",
        "ur-PK": "انٹرویو مکمل کرنے کا شکریہ! آپ کے جوابات ریکارڈ کر لیے گئے ہیں۔ آپ کا دن اچھا گزرے!",
      };

      const language = sysLang[langCode] || sysLang["en-US"];
      const transition = transitionPrompts[langCode] || transitionPrompts["en-US"];
      const repeat = repeatPrompts[langCode] || repeatPrompts["en-US"];
      const ending = endingPrompts[langCode] || endingPrompts["en-US"];

      const questionList = questions
        .map((q, i) => `${i + 1}. ${q.question}`)
        .join("\n");

      return `You are an AI recruiter. Conduct the ENTIRE interview in ${language}.

INTERVIEW QUESTIONS (ask one by one):
${questionList}

CRITICAL RULES - FOLLOW STRICTLY:

1. LANGUAGE RULE (MOST IMPORTANT):
   - Speak ONLY in ${language} throughout the entire interview.
   - NEVER switch to English or any other language.
   - Speak in a calm, measured, and unhurried pace.
   - Pause briefly between sentences to sound natural.
   - Do not rush through questions. Clearly enunciate every word.

2. ASKING QUESTIONS:
   - Ask ONE question at a time.
   - After asking a question, STOP TALKING COMPLETELY.

3. SILENCE HANDLING:
   - Do NOT interrupt the candidate while they are speaking.
   - If the candidate is silent for AT LEAST 5-7 seconds, assume they have finished.
   - After 5-7 seconds of silence, say EXACTLY: "${transition}"
   - Wait for confirmation before proceeding.

4. MOVING TO NEXT QUESTION:
   - If the candidate says "next", "move on", "skip", "next question", or "Yes, please move to the next question", immediately proceed to the next question WITHOUT further confirmation.

5. REPEATING QUESTIONS:
   - If the candidate asks to repeat, say: "${repeat}"
   - Then repeat the EXACT same question word for word.

6. CANDIDATE SPEAKING:
   - NEVER interrupt or talk over the candidate.
   - Only consider silence of 5+ seconds as "finished answering".

7. ENDING THE INTERVIEW:
   - After the LAST question is answered, say EXACTLY: "${ending}"
   - End the conversation.

8. GENERAL BEHAVIOR:
   - Be professional, friendly, and encouraging.
   - Do NOT rush the candidate.
   - Do NOT ask multiple questions at once.`;
    },
    [questions]
  );

  /* ─── Language code resolver ─── */
  const getLanguageCode = useCallback(() => {
    if (config.language.startsWith("hi")) return "hi-IN";
    if (config.language.startsWith("ur")) return "ur-PK";
    return "en-US";
  }, [config.language]);

  /* ─── Explicit completion marker ─── */
  const markInterviewCompleted = useCallback(() => {
    if (totalQuestions === 0) return;
    answeredQuestionsRef.current = totalQuestions;
    currentQuestionIndexRef.current = totalQuestions - 1;
    interviewCompletedRef.current = true;
    latestProgressRef.current = 100;
    if (isMountedRef.current) setInterviewStateVersion((v) => v + 1);
  }, [totalQuestions]);

  /* ─── Generate Feedback with proper guards + AbortController ─── */
  const generateFeedback = useCallback(
    async (
      reason: string,
      progress: number,
      conv: string | null,
      tabCount: number,
      timestamps: string[]
    ): Promise<void> => {
      // Prevent duplicate calls
      if (feedbackCalledRef.current || feedbackInProgressRef.current) return;

      // Only mark called=true AFTER success
      feedbackInProgressRef.current = true;

      const controller = new AbortController();
      feedbackAbortRef.current = controller;

      if (isMountedRef.current) setLoading(true);

      try {
        const aiRes = await axios.post(
          "/api/ai-feedback",
          { conversation: conv },
          { signal: controller.signal }
        );

        if (aiRes.data?.error) throw new Error(aiRes.data.error);

        let parsedFeedback: unknown;
        if (typeof aiRes.data === "string") {
          const cleaned = aiRes.data
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();
          parsedFeedback = JSON.parse(cleaned);
        } else {
          parsedFeedback = aiRes.data;
        }

        await axios.post(
          "/api/interview-feedback",
          {
            userName: interviewInfo?.userName,
            userEmail: interviewInfo?.userEmail,
            interviewId,
            feedback: parsedFeedback,
            exitReason: reason,
            progressAtExit: progress,
            completionStatus: progress >= 100 ? "Success" : "Incomplete",
            tabSwitches: tabCount,
            securityFlags: {
              timestamps,
              browser: typeof navigator !== "undefined" ? navigator.userAgent : "",
              platform: typeof navigator !== "undefined" ? navigator.platform : "",
            },
          },
          { signal: controller.signal }
        );

        // Only mark as called AFTER both API calls succeed
        feedbackCalledRef.current = true;

        if (isMountedRef.current) {
          router.replace(`/interview/${interviewId}/completed`);
        }
      } catch (error: unknown) {
        // Ignore abort errors
        if (axios.isCancel(error)) {
          console.log("Feedback request cancelled.");
          return;
        }

        console.error("Interview feedback generation failed:", error);

        // Allow retry on failure
        feedbackCalledRef.current = false;

        if (isMountedRef.current) {
          toast.error("Feedback could not be saved. Redirecting…");
          setTimeout(() => {
            if (isMountedRef.current) {
              router.replace(`/interview/${interviewId}/completed`);
            }
          }, 2000);
        }
      } finally {
        feedbackInProgressRef.current = false;
        feedbackAbortRef.current = null;
        if (isMountedRef.current) setLoading(false);
      }
    },
    [interviewInfo, interviewId, router]
  );

  /* ─── Start Vapi call ─── */
  const startCall = useCallback(
    (vapiInstance: Vapi) => {
      if (callStartedRef.current) return;

      const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
      if (!publicKey) {
        console.error("NEXT_PUBLIC_VAPI_PUBLIC_KEY is missing.");
        toast.error("Voice interview configuration is missing.");
        return;
      }

      if (totalQuestions === 0) {
        console.error("Cannot start interview: no questions found.");
        toast.error("No interview questions were found.");
        return;
      }

      const languageCode = getLanguageCode();

      let welcome = `Hi ${interviewInfo?.userName || "there"}! Ready to start?`;
      if (languageCode === "hi-IN") {
        welcome = `नमस्ते ${interviewInfo?.userName || ""}! क्या आप साक्षात्कार शुरू करने के लिए तैयार हैं?`;
      }
      if (languageCode === "ur-PK") {
        welcome = `اسلام و علیکم ${interviewInfo?.userName || ""}! کیا آپ انٹرویو کے لیے تیار ہیں؟`;
      }

      try {
        callStartedRef.current = true;

        vapiInstance.start({
          name: "AI Recruiter",
          firstMessage: welcome,
          transcriber: {
            provider: "deepgram",
            model: "nova-2",
            language:
              languageCode === "hi-IN" ? "hi"
                : languageCode === "ur-PK" ? "ur"
                  : "en-US",
          },
          voice: {
            provider: "vapi",
            voiceId: VALID_VOICES.includes(config.voiceId) ? config.voiceId : "Elliot",
          },
          model: {
            provider: "openai",
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: buildSystemPrompt(languageCode) }],
          },
        });
      } catch (error) {
        callStartedRef.current = false;
        console.error("Failed to start Vapi call:", error);
        toast.error("Unable to start the voice interview.");
      }
    },
    [interviewInfo, config.voiceId, totalQuestions, getLanguageCode, buildSystemPrompt]
  );

  /* ─── Vapi setup ───
     ✅ FIX (critical): `hasInterviewStarted` has been REMOVED from this
     effect's dependency array and from its early-return guard. It used to
     be both set inside this effect (in the call-start handler) and listed
     as a dependency, which forced React to tear down (cleanup: vapi.stop())
     and re-run this effect the instant the call actually connected — killing
     the interview immediately after it started. Gating is now done purely
     with `setupStartedRef`, a ref that isn't part of the dependency array,
     so state changes produced by the effect itself can no longer re-trigger
     it. */
  useEffect(() => {
    if (!interviewInfo) return;
    if (!isPreCheckComplete) return;
    if (!isConfigLoaded) return;
    if (totalQuestions === 0) return;

    // Prevent duplicate setup (StrictMode double-invoke, re-renders, etc.)
    if (setupStartedRef.current) return;
    if (vapiRef.current) return;

    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      console.error("NEXT_PUBLIC_VAPI_PUBLIC_KEY is not configured.");
      toast.error("Voice interview configuration is missing.");
      return;
    }

    let destroyed = false;
    setupStartedRef.current = true;
    isCleaningUpRef.current = false;

    // Reset interview state
    currentQuestionIndexRef.current = 0;
    answeredQuestionsRef.current = 0;
    interviewCompletedRef.current = false;
    feedbackCalledRef.current = false;
    feedbackInProgressRef.current = false;
    hasGreetedRef.current = false;
    callStartedRef.current = false;

    clearTimers();

    let vapi: Vapi;
    try {
      vapi = new Vapi(publicKey);
    } catch (error) {
      console.error("Failed to create Vapi instance:", error);
      toast.error("Unable to initialize voice interview.");
      setupStartedRef.current = false;
      return;
    }

    vapiRef.current = vapi;

    /* ─── CALL START ─── */
    vapi.on("call-start", () => {
      if (destroyed) return;
      isCallActiveRef.current = true;
      if (isMountedRef.current) {
        setActiveUser(true);
        setHasInterviewStarted(true); // UI flag only — safe now, not a dependency
      }
    });

    /* ─── SPEECH START ─── */
    vapi.on("speech-start", () => {
      if (destroyed) return;

      if (!hasGreetedRef.current) {
        hasGreetedRef.current = true;
        if (isMountedRef.current) toast.success("Interview started!");
      }

      clearTimers();

      if (isMountedRef.current) {
        setStartTimer(false);
        setResetTimer(false);
        setAiIsSpeaking(true);
        setCandidateIsThinking(false);
      }
    });

    /* ─── Silence detection (UI-only) ─── */
    vapi.on("speech-end", () => {
      if (destroyed) return;

      if (isMountedRef.current) {
        setStartTimer(true);
        setResetTimer(true);
        setAiIsSpeaking(false);
      }

      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) setResetTimer(false);
      }, 50);

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (!destroyed && isMountedRef.current && isCallActiveRef.current) {
          setCandidateIsThinking(true);
        }
      }, CANDIDATE_SILENCE_MS);
    });

    /* ─── VOLUME (UI only) ─── */
    vapi.on("volume-level", (level: number) => {
      if (destroyed) return;
      if (isMountedRef.current) {
        setVolume(level);
        if (level > 0.02) setCandidateIsThinking(false);
      }
    });

    /* ─── MESSAGE ─── */
    vapi.on("message", (message: VapiMessage) => {
      if (destroyed) return;

      // Handle newer transcript events
      if (
        message.type === "transcript" &&
        typeof message.transcript === "string" &&
        message.transcriptType === "final" &&
        isMountedRef.current
      ) {
        setTranscript(message.transcript);
      }

      // Handle conversation updates
      if (message.conversation) {
        updateConversation(message.conversation);

        try {
          const raw =
            typeof message.conversation === "string"
              ? JSON.parse(message.conversation)
              : message.conversation;

          if (Array.isArray(raw)) {
            const messages = raw as ConversationMessage[];
            const lastMessage = messages[messages.length - 1];

            if (lastMessage?.role === "assistant" || lastMessage?.role === "bot") {
              const assistantText =
                lastMessage.content || lastMessage.message || "";
              if (isMountedRef.current) setTranscript(assistantText);
            }
          }
        } catch (error) {
          console.error("Failed to parse Vapi conversation:", error);
        }
      }
    });

    /* ─── CALL END with proper guards ─── */
    vapi.on("call-end", () => {
      if (destroyed) return;

      isCallActiveRef.current = false;
      clearTimers();

      if (isMountedRef.current) {
        setActiveUser(false);
        setAiIsSpeaking(false);
        setCandidateIsThinking(false);
        setVolume(0);
      }

      // Skip feedback if cleanup triggered this
      if (isCleaningUpRef.current) {
        console.log("Ignoring cleanup-triggered call-end");
        return;
      }

      // Use explicit completion flag
      const completed = interviewCompletedRef.current;
      const progress = completed ? 100 : Math.min(latestProgressRef.current, 100);
      const reason = completed ? "Interview Completed Normally" : "User Ended Early";

      void generateFeedback(
        reason,
        progress,
        conversationRef.current,
        tabSwitchCountRef.current,
        switchTimestampsRef.current
      );
    });

    /* ─── ERROR ─── */
    vapi.on("error", (error: VapiError) => {
      if (destroyed) return;

      const errorStrings = collectErrorStrings(error);
      const normalized = errorStrings.join(" | ").toLowerCase();
      const isNormalEnd = NORMAL_END_KEYWORDS.some((kw) => normalized.includes(kw));

      if (isNormalEnd) {
        console.log("Ignoring normal-end error:", errorStrings.join(" | "));
        return;
      }

      if (isCleaningUpRef.current) return;

      console.error("Real Vapi error:", error);

      if (isMountedRef.current && isCallActiveRef.current) {
        toast.error("Connection lost — check your internet.");
        isCallActiveRef.current = false;
        void generateFeedback(
          "Connection Error",
          latestProgressRef.current,
          conversationRef.current,
          tabSwitchCountRef.current,
          switchTimestampsRef.current
        );
      }
    });

    /* ─── START CALL ─── */
    startCall(vapi);

    /* ─── Cleanup ─── */
    return () => {
      destroyed = true;
      isCleaningUpRef.current = true;
      setupStartedRef.current = false;
      clearTimers();

      // Cancel in-flight feedback
      if (feedbackAbortRef.current) {
        feedbackAbortRef.current.abort();
        feedbackAbortRef.current = null;
      }

      try {
        vapi.removeAllListeners();
      } catch (error) {
        console.error("Failed to remove Vapi listeners:", error);
      }

      // ✅ FIX (critical): guard on `callStartedRef`, not `isCallActiveRef`.
      // `isCallActiveRef` only flips to true once the "call-start" event
      // fires — i.e. AFTER the Daily/Vapi room has finished connecting.
      // `vapi.start()` kicks off room creation synchronously, well before
      // that event arrives. If this effect tears down before "call-start"
      // fires (StrictMode's dev-only mount→cleanup→remount is the most
      // common trigger, but any re-render with a new dependency reference
      // would do the same), the old `isCallActiveRef.current` check was
      // still false, so the in-flight call was abandoned instead of
      // stopped. The backend later kills that orphaned room, and the
      // resulting "no-room" / "room was deleted" error was observed
      // leaking into the NEXT (live) instance's error handler — which is
      // exactly the "Real Vapi error" / stuck-at-0%-progress symptom.
      // `callStartedRef` is set synchronously the moment start() is
      // called, so this now always attempts to stop anything we started.
      if (callStartedRef.current) {
        try {
          vapi.stop();
        } catch (error) {
          console.error("Failed to stop Vapi call:", error);
        }
      }

      isCallActiveRef.current = false;
      if (vapiRef.current === vapi) vapiRef.current = null;
      callStartedRef.current = false;
    };
  }, [
    interviewInfo,
    isPreCheckComplete,
    isConfigLoaded,
    totalQuestions,
    startCall,
    generateFeedback,
    clearTimers,
    updateConversation,
  ]);

  /* ─── Handle "repeat" ─── */
  const handleRepeatQuestion = useCallback(() => {
    const vapi = vapiRef.current;
    if (!vapi || !isCallActiveRef.current) return;

    try {
      vapi.send({
        type: "add-message",
        message: {
          role: "user",
          content: "Please repeat the current interview question exactly. Do not move to the next question.",
        },
      });
      toast.success("Repeating question...");
    } catch (error) {
      console.error("Failed to repeat question:", error);
      toast.error("Failed to repeat question.");
    }
  }, []);

  /* ─── Handle "next" — updates explicit state ─── */
  const handleNextQuestion = useCallback(() => {
    const vapi = vapiRef.current;
    if (!vapi || !isCallActiveRef.current) return;

    const isLastQuestion = currentQuestionIndexRef.current >= totalQuestions - 1;

    // Explicitly track progress
    if (isLastQuestion) {
      markInterviewCompleted();
    } else {
      answeredQuestionsRef.current = Math.min(
        answeredQuestionsRef.current + 1,
        totalQuestions
      );
      currentQuestionIndexRef.current = Math.min(
        currentQuestionIndexRef.current + 1,
        totalQuestions - 1
      );
      // Trigger re-render
      if (isMountedRef.current) setInterviewStateVersion((v) => v + 1);
    }

    try {
      // ✅ Minor fix: send an unambiguous instruction depending on whether
      // this is the last question, instead of always saying "move to the
      // next question" even when there isn't one.
      vapi.send({
        type: "add-message",
        message: {
          role: "user",
          content: isLastQuestion
            ? "Yes, that was my final answer. Please conclude the interview now."
            : "Yes, please move to the next question immediately.",
        },
      });
      toast.success(isLastQuestion ? "Finishing interview..." : "Moving to next question...");
    } catch (error) {
      console.error("Failed to move to next question:", error);
      toast.error("Failed to skip question.");
    }
  }, [totalQuestions, markInterviewCompleted]);

  /* ─── Stop interview ─── */
  const handleStop = useCallback(() => {
    const vapi = vapiRef.current;
    if (!vapi || !isCallActiveRef.current) return;

    try {
      // Do NOT set isCleaningUpRef — this is an intentional stop
      vapi.stop();
    } catch (error) {
      console.error("Failed to stop interview:", error);
      isCallActiveRef.current = false;
      void generateFeedback(
        interviewCompletedRef.current ? "Interview Completed Normally" : "User Ended Early",
        interviewCompletedRef.current ? 100 : latestProgressRef.current,
        conversationRef.current,
        tabSwitchCountRef.current,
        switchTimestampsRef.current
      );
    }
  }, [generateFeedback]);

  /* ─── Return API ─── */
  return {
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
    hasInterviewStarted,
    handleRepeatQuestion,
    handleNextQuestion,
    handleStop,
    syncAntiCheatRefs,
  };
}