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

const SILENCE_TRANSITION_SECONDS = 5;
const RESPONSE_WAIT_SECONDS = 2.5;
const CALL_IDLE_TIMEOUT_SECONDS = 60;

const INSTRUCTION_TAG = "[SYSTEM INSTRUCTION - NOT SPOKEN BY CANDIDATE]:";

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
  const setupStartedRef = useRef<boolean>(false);

  // Explicit interview state
  const currentQuestionIndexRef = useRef<number>(0);
  const answeredQuestionsRef = useRef<number>(0);
  const interviewCompletedRef = useRef<boolean>(false);
  const autoEndTriggeredRef = useRef<boolean>(false);
  const firstQuestionSentRef = useRef<boolean>(false);
  const candidateSpokeSinceQuestionRef = useRef<boolean>(false);

  // Conversation refs
  const conversationRef = useRef<string | null>(null);
  const latestProgressRef = useRef<number>(0);

  // Anti-cheat refs
  const tabSwitchCountRef = useRef<number>(0);
  const switchTimestampsRef = useRef<string[]>([]);

  // Timers
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Abort controllers
  const feedbackAbortRef = useRef<AbortController | null>(null);

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
  const [isInterviewCompleted, setIsInterviewCompleted] = useState<boolean>(false);
  const [candidateIsThinking, setCandidateIsThinking] = useState<boolean>(false);
  // ✅ True as soon as the first question instruction has been sent to the AI.
  // The UI uses this to avoid showing "Question 1/6" before the AI has asked Q1.
  const [hasQuestionBeenAsked, setHasQuestionBeenAsked] = useState<boolean>(false);
  const [config, setConfig] = useState<UserConfig>({
    language: "en-US",
    voiceId: "Elliot",
    voiceProvider: "vapi",
  });
  const [interviewStateVersion, setInterviewStateVersion] = useState(0);
  const [canAdvance, setCanAdvance] = useState(false);

  /* ─── Derived values ─── */
  const questions = interviewInfo?.interviewData?.questions ?? [];
  const totalQuestions = questions.length;

  const currentQuestionIndex = useMemo(() => {
    if (totalQuestions === 0) return 0;
    return Math.min(currentQuestionIndexRef.current, totalQuestions - 1);
  }, [totalQuestions, interviewStateVersion]);

  const progressPercentage = useMemo(() => {
    if (totalQuestions === 0) return 0;
    if (interviewCompletedRef.current) return 100;
    const answered = Math.min(answeredQuestionsRef.current, totalQuestions);
    return Math.min(Math.round((answered / totalQuestions) * 100), 100);
  }, [totalQuestions, interviewStateVersion]);

  const isLastQuestion = useMemo(
    () => totalQuestions > 0 && currentQuestionIndex >= totalQuestions - 1,
    [currentQuestionIndex, totalQuestions]
  );

  /* ─── Sync refs ─── */
  useEffect(() => {
    latestProgressRef.current = progressPercentage;
  }, [progressPercentage]);

  useEffect(() => {
    conversationRef.current = conversation || null;
  }, [conversation]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /* ─── Utility: keep candidateSpokeSinceQuestionRef + canAdvance in sync ─── */
  const setCandidateSpoke = useCallback((value: boolean) => {
    candidateSpokeSinceQuestionRef.current = value;
    if (isMountedRef.current) setCanAdvance(value);
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

  /* ─── Utility: strip system prompt & internal instruction messages ─── */
  const filterTranscriptEntries = useCallback((arr: unknown[]): unknown[] => {
    return arr.filter((entry) => {
      if (!entry || typeof entry !== "object") return true;
      const e = entry as Record<string, unknown>;
      const role = typeof e.role === "string" ? e.role : "";
      if (role === "system") return false;
      const content =
        (typeof e.content === "string" && e.content) ||
        (typeof e.message === "string" && e.message) ||
        "";
      if (role === "user" && content.startsWith(INSTRUCTION_TAG)) return false;
      return true;
    });
  }, []);

  /* ─── Utility: normalize conversation ─── */
  const normalizeConversation = useCallback(
    (raw: unknown): string | null => {
      if (!raw) return null;
      try {
        if (typeof raw === "string") {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? JSON.stringify(filterTranscriptEntries(parsed)) : raw;
        }
        if (Array.isArray(raw)) return JSON.stringify(filterTranscriptEntries(raw));
        return JSON.stringify(raw);
      } catch (error) {
        console.error("Failed to normalize Vapi conversation:", error);
        return null;
      }
    },
    [filterTranscriptEntries]
  );

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

  /* ─── Build instruction messages ─── */
  const buildAskQuestionInstruction = useCallback(
    (questionText: string, isFinal: boolean = false) =>
      `${INSTRUCTION_TAG} Ask the candidate EXACTLY this question, word for word, as your ENTIRE next message, with nothing else added${
        isFinal
          ? " — THIS IS THE FINAL QUESTION of the interview. When the candidate finishes answering, use the FINAL-question closing line instead of the standard one."
          : ""
      }: "${questionText}"`,
    []
  );

  const buildCompleteInstruction = useCallback(
    (endingLine: string) =>
      `${INSTRUCTION_TAG} The candidate has finished the final question and clicked the "Finish Interview" button. Say EXACTLY this as your ENTIRE next message, then stop talking entirely: "${endingLine}"`,
    []
  );

  const getLocalizedPrompts = useCallback((langCode: string) => {
    const sysLang: Record<string, string> = {
      "en-US": "English",
      "hi-IN": "Hindi (हिंदी). Always respond in Hindi script.",
      "ur-PK": "Urdu (اردو). Always respond in Urdu script.",
    };
    const pleaseClickNextPrompts: Record<string, string> = {
      "en-US":
        "Thank you for your answer. Please click the \"Next Question\" button whenever you're ready to continue — I'll wait right here.",
      "hi-IN":
        "आपके उत्तर के लिए धन्यवाद। जब भी आप तैयार हों, कृपया \"अगला प्रश्न\" बटन दबाएं — मैं यहीं प्रतीक्षा करूंगा।",
      "ur-PK":
        "آپ کے جواب کا شکریہ۔ جب بھی آپ تیار ہوں، براہ کرم \"اگلا سوال\" بٹن دبائیں — میں یہیں انتظار کروں گا۔",
    };
    const pleaseClickFinishPrompts: Record<string, string> = {
      "en-US":
        "Thank you for your answer. That was the final question — please click the \"Finish Interview\" button whenever you're ready to submit your responses.",
      "hi-IN":
        "आपके उत्तर के लिए धन्यवाद। यह अंतिम प्रश्न था — जब भी आप तैयार हों, कृपया \"साक्षात्कार समाप्त करें\" बटन दबाएं।",
      "ur-PK":
        "آپ کے جواب کا شکریہ۔ یہ آخری سوال تھا — جب بھی آپ تیار ہوں، براہ کرم \"انٹرویو مکمل کریں\" بٹن دبائیں۔",
    };
    const repeatPrompts: Record<string, string> = {
      "en-US": "Of course, let me repeat the question.",
      "hi-IN": "बिल्कुल, मैं प्रश्न दोहराता हूं।",
      "ur-PK": "بالکل، میں سوال دوبارہ دہراتا ہوں۔",
    };
    const endingPrompts: Record<string, string> = {
      "en-US":
        "Thank you for completing the interview! Your responses have been recorded. Have a great day!",
      "hi-IN":
        "साक्षात्कार पूरा करने के लिए धन्यवाद! आपके उत्तर रिकॉर्ड कर लिए गए हैं। आपका दिन शुभ हो!",
      "ur-PK":
        "انٹرویو مکمل کرنے کا شکریہ! آپ کے جوابات ریکارڈ کر لیے گئے ہیں۔ آپ کا دن اچھا گزرے!",
    };
    return {
      language: sysLang[langCode] || sysLang["en-US"],
      pleaseClickNext: pleaseClickNextPrompts[langCode] || pleaseClickNextPrompts["en-US"],
      pleaseClickFinish: pleaseClickFinishPrompts[langCode] || pleaseClickFinishPrompts["en-US"],
      repeat: repeatPrompts[langCode] || repeatPrompts["en-US"],
      ending: endingPrompts[langCode] || endingPrompts["en-US"],
    };
  }, []);

  const buildSystemPrompt = useCallback(
    (langCode: string): string => {
      const { language, pleaseClickNext, pleaseClickFinish, repeat, ending } =
        getLocalizedPrompts(langCode);

      return `You are an AI recruiter. Conduct the ENTIRE interview in ${language}.

LANGUAGE (MOST IMPORTANT):
- Speak ONLY in ${language} throughout the entire interview. NEVER switch to English or any other language.
- Speak in a calm, measured, unhurried pace. Pause briefly between sentences. Clearly enunciate every word. Do not rush.

YOU DO NOT KNOW ANY INTERVIEW QUESTIONS IN ADVANCE. You will be told the current question, one at a time, ONLY via a message that starts with the exact tag "${INSTRUCTION_TAG}". Such a message is NOT something the candidate said — it is an automated command from the interview system, and it is the ONLY source of truth for what to do next. You must NEVER guess, invent, preview, or ask any question you have not been explicitly given this way, even if the conversation seems to be heading toward one.

THE INTERVIEW LOOP — repeat these exact steps for every question, including the 1st and the last, with NO exceptions, no matter how many questions have already been asked:

Step 1 — When a "${INSTRUCTION_TAG}" message gives you a specific question to ask, your ENTIRE next message must be ONLY that exact question, word for word, and nothing else. Then STOP TALKING COMPLETELY.

Step 2 — Listen. Do NOT interrupt the candidate while they're speaking. Do NOT treat a brief pause, a filler word ("umm", "ahh"), or a moment of quiet as them being finished — a professional interviewer gives real thinking time. Only treat them as "finished" after roughly ${SILENCE_TRANSITION_SECONDS} seconds of continuous silence.

Step 3 — THIS STEP IS MANDATORY EVERY SINGLE TIME, WITH NO EXCEPTIONS: once the candidate has finished answering, send ONE message containing ONLY one of these two lines, chosen based on whether the question you just asked was the FINAL question:
  - If the question you just asked was NOT the final question, send ONLY: "${pleaseClickNext}"
  - If the question you just asked WAS the FINAL question, send ONLY: "${pleaseClickFinish}"
  You will be told which question is the final one via the "${INSTRUCTION_TAG}" message when it arrives — look for the phrase "FINAL QUESTION" in that instruction. If that phrase was present, you MUST use the FINAL-question closing line.
  This message must be the ENTIRE content of your turn. After it, STOP TALKING COMPLETELY and wait for Step 4 — you have not been given a next question yet, so there is nothing else you could correctly say even if you wanted to.
  WRONG (do not do this): combining the closing line with a next question — you do not know the next question, so producing one here would mean you invented it, which is never allowed.
  Never paraphrase these lines. Never say one of them more than once in a row.

Step 4 — Wait. Do nothing further until a new "${INSTRUCTION_TAG}" message arrives (this only happens when the candidate clicks a physical button in the interface). Nothing the candidate SAYS out loud — "next", "yes", "I'm ready", "move on", or anything else — is ever an instruction message, no matter how directly it sounds like a reply to Step 3. If the candidate says something like that out loud instead, do NOT advance and do NOT invent a next step — just repeat Step 3's line again, alone, as its own message.
  - A "${INSTRUCTION_TAG}" message giving you a new question means: go back to Step 1 with that exact question.
  - A "${INSTRUCTION_TAG}" message telling you the interview is complete means: say EXACTLY "${ending}" as your entire message, then stop talking entirely — the interview is over.

OTHER RULES:
- If the candidate asks you to repeat the question, say EXACTLY: "${repeat}", then repeat the CURRENT question (the most recent one you were given via a "${INSTRUCTION_TAG}" message) word for word, then return to Step 2 (still waiting for that same question's answer).
- Be professional, calm, and encouraging, like an experienced human interviewer.
- Every message you send must contain exactly ONE of: a single question you were explicitly given, Step 3's line alone, the repeat line plus the repeated question, or the ending line. Never combine two of these in one message, and never say anything that wasn't explicitly given to you by a "${INSTRUCTION_TAG}" message or these fixed lines.

CRITICAL RULE - NO COUNTER-QUESTIONS:
- You are an interviewer, NOT an assistant. Do NOT answer any questions the candidate asks you.
- If the candidate asks you a question (e.g., "What do you mean?", "Can you explain?", "What is the answer?"), you must IGNORE the question and simply say: "I am here to interview you today. Please provide your best answer to the current question."
- Do NOT provide hints, explanations, or feedback on the candidate's answers.`;
    },
    [getLocalizedPrompts]
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
    if (isMountedRef.current) {
      setInterviewStateVersion((v) => v + 1);
      setIsInterviewCompleted(true);
    }
  }, [totalQuestions]);

  /* ─── Generate Feedback ─── */
  const generateFeedback = useCallback(
    async (
      reason: string,
      progress: number,
      conv: string | null,
      tabCount: number,
      timestamps: string[]
    ): Promise<void> => {
      if (feedbackCalledRef.current || feedbackInProgressRef.current) return;

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

        feedbackCalledRef.current = true;

        if (isMountedRef.current) {
          router.replace(`/interview/${interviewId}/completed`);
        }
      } catch (error: unknown) {
        if (axios.isCancel(error)) {
          console.log("Feedback request cancelled.");
          return;
        }

        console.error("Interview feedback generation failed:", error);

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
          startSpeakingPlan: {
            waitSeconds: RESPONSE_WAIT_SECONDS,
            smartEndpointingPlan:
              languageCode === "en-US"
                ? {
                    provider: "livekit",
                    waitFunction: `500 + ${(SILENCE_TRANSITION_SECONDS - 0.5) * 1000} * x`,
                  }
                : undefined,
            transcriptionEndpointingPlan:
              languageCode !== "en-US"
                ? {
                    onPunctuationSeconds: 0.5,
                    onNoPunctuationSeconds: SILENCE_TRANSITION_SECONDS,
                    onNumberSeconds: 1,
                  }
                : undefined,
          },
          stopSpeakingPlan: {
            numWords: 2,
            voiceSeconds: 0.4,
            backoffSeconds: 1.5,
          },
          silenceTimeoutSeconds: CALL_IDLE_TIMEOUT_SECONDS,
          transcriber: {
            provider: "deepgram",
            model: "nova-2",
            language:
              languageCode === "hi-IN" ? "hi"
                : languageCode === "ur-PK" ? "ur"
                  : "en-US",
            endpointing: 500,
          },
          voice: {
            provider: "vapi",
            voiceId: VALID_VOICES.includes(config.voiceId) ? config.voiceId : "Elliot",
          },
          model: {
            provider: "openai",
            model: "gpt-4o-mini",
            temperature: 0.3,
            messages: [{ role: "system", content: buildSystemPrompt(languageCode) }],
          },
        } as any);
      } catch (error) {
        callStartedRef.current = false;
        console.error("Failed to start Vapi call:", error);
        toast.error("Unable to start the voice interview.");
      }
    },
    [interviewInfo, config.voiceId, totalQuestions, getLanguageCode, buildSystemPrompt]
  );

  /* ─── Vapi setup ─── */
  useEffect(() => {
    if (!interviewInfo) return;
    if (!isPreCheckComplete) return;
    if (!isConfigLoaded) return;
    if (totalQuestions === 0) return;
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
    autoEndTriggeredRef.current = false;
    firstQuestionSentRef.current = false;
    candidateSpokeSinceQuestionRef.current = false;
    if (isMountedRef.current) {
      setCanAdvance(false);
      setIsInterviewCompleted(false);
      setHasQuestionBeenAsked(false);
    }
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
        setHasInterviewStarted(true);
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

    /* ─── SPEECH END ─── */
    vapi.on("speech-end", () => {
      if (destroyed) return;

      if (isMountedRef.current) {
        setStartTimer(true);
        setResetTimer(true);
        setAiIsSpeaking(false);
      }

      // First question delivery — fires exactly once, right after the greeting
      if (!firstQuestionSentRef.current && questions.length > 0) {
        firstQuestionSentRef.current = true;
        setCandidateSpoke(false);
        try {
          vapi.send({
            type: "add-message",
            message: {
              role: "user",
              content: buildAskQuestionInstruction(
                questions[0].question,
                totalQuestions === 1
              ),
            },
          });
          // Mark as asked only after we've actually sent it
          if (isMountedRef.current) setHasQuestionBeenAsked(true);
        } catch (error) {
          console.error("Failed to send first question instruction:", error);
        }
      }

      // Auto-end after the AI speaks the final ending line
      if (interviewCompletedRef.current && !autoEndTriggeredRef.current) {
        autoEndTriggeredRef.current = true;
        setTimeout(() => {
          if (destroyed || !isMountedRef.current) return;
          if (!isCallActiveRef.current) return;
          try {
            vapi.stop();
          } catch (error) {
            console.error("Failed to auto-stop call after final message:", error);
            isCallActiveRef.current = false;
            void generateFeedback(
              "Interview Completed Normally",
              100,
              conversationRef.current,
              tabSwitchCountRef.current,
              switchTimestampsRef.current
            );
          }
        }, 1500);
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

    /* ─── VOLUME ─── */
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

      if (
        message.type === "transcript" &&
        typeof message.transcript === "string" &&
        message.transcriptType === "final"
      ) {
        setTranscript(message.transcript);

        if (!message.role || message.role === "user") {
          setCandidateSpoke(true);
        }
      }

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

    /* ─── CALL END ─── */
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

      if (isCleaningUpRef.current) {
        console.log("Ignoring cleanup-triggered call-end");
        return;
      }

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

      if (feedbackAbortRef.current) {
        feedbackAbortRef.current.abort();
        feedbackAbortRef.current = null;
      }

      try {
        vapi.removeAllListeners();
      } catch (error) {
        console.error("Failed to remove Vapi listeners:", error);
      }

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
    buildAskQuestionInstruction,
    setCandidateSpoke,
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
          content:
            "Please repeat the current interview question exactly. Do not move to the next question.",
        },
      });
      toast.success("Repeating question...");
    } catch (error) {
      console.error("Failed to repeat question:", error);
      toast.error("Failed to repeat question.");
    }
  }, []);

  /* ─── Handle "next" / "finish" ─── */
  const handleNextQuestion = useCallback(() => {
    const vapi = vapiRef.current;
    if (!vapi || !isCallActiveRef.current) return;

    // Require an actual answer before advancing
    if (!candidateSpokeSinceQuestionRef.current) {
      toast.error("Please answer the current question before moving on.");
      return;
    }

    const isAnsweringLastQuestion =
      currentQuestionIndexRef.current >= totalQuestions - 1;

    if (isAnsweringLastQuestion) {
      // User has answered the LAST question and clicked "Finish Interview"
      markInterviewCompleted();
      setCandidateSpoke(false);

      try {
        const { ending } = getLocalizedPrompts(getLanguageCode());
        vapi.send({
          type: "add-message",
          message: {
            role: "user",
            content: buildCompleteInstruction(ending),
          },
        });
        toast.success("Finishing interview...");
      } catch (error) {
        console.error("Failed to finish interview:", error);
        toast.error("Failed to finish interview.");
      }
      return;
    }

    // Advance to the next question
    answeredQuestionsRef.current = Math.min(
      answeredQuestionsRef.current + 1,
      totalQuestions
    );
    currentQuestionIndexRef.current = Math.min(
      currentQuestionIndexRef.current + 1,
      totalQuestions - 1
    );
    if (isMountedRef.current) setInterviewStateVersion((v) => v + 1);

    setCandidateSpoke(false);

    try {
      const nextIndex = currentQuestionIndexRef.current;
      const isNextFinal = nextIndex >= totalQuestions - 1;

      vapi.send({
        type: "add-message",
        message: {
          role: "user",
          content: buildAskQuestionInstruction(
            questions[nextIndex].question,
            isNextFinal
          ),
        },
      });
      toast.success("Moving to next question...");
    } catch (error) {
      console.error("Failed to move to next question:", error);
      toast.error("Failed to skip question.");
    }
  }, [
    totalQuestions,
    markInterviewCompleted,
    getLocalizedPrompts,
    getLanguageCode,
    buildCompleteInstruction,
    buildAskQuestionInstruction,
    questions,
    setCandidateSpoke,
  ]);

  /* ─── Stop interview ─── */
  const handleStop = useCallback(() => {
    const vapi = vapiRef.current;
    if (!vapi || !isCallActiveRef.current) return;

    try {
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
    canAdvance,
    isLastQuestion,
    isInterviewCompleted,
    hasQuestionBeenAsked,   // ✅ new — UI uses this to avoid showing "Q1/6" on arrival
    handleRepeatQuestion,
    handleNextQuestion,
    handleStop,
    syncAntiCheatRefs,
  };
}