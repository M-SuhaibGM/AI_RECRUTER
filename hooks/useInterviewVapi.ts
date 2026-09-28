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

// ─── Turn-taking / patience configuration ───
// These feed BOTH the system prompt wording (what the model is told to do)
// AND the actual Vapi call config (startSpeakingPlan / stopSpeakingPlan /
// transcriber.endpointing, which control the platform's own turn-taking —
// the prompt text alone cannot stop Vapi from cutting the candidate off,
// since endpointing happens before the transcript ever reaches the model).
// Keeping them as one shared source of truth avoids the prompt claiming a
// patience window the platform isn't actually configured to honor.
//
// ⚠️ A genuine 30-40s silence tolerance is NOT achievable here. Vapi's API
// enforces hard server-side caps on this whole layer, confirmed by:
//   - transcriber.endpointing rejected above 500ms with a live 400:
//     "assistant.transcriber.endpointing must not be greater than 500"
//   - startSpeakingPlan.waitSeconds rejected above 5s per Vapi's own
//     support forum (a user's waitSeconds: 180 request was rejected;
//     told the ceiling is 5s: https://support.vapi.ai/t/28935279)
// smartEndpointingPlan.waitFunction's own output cap isn't documented, so
// it may reject a large computed wait too — increase SILENCE_TRANSITION_SECONDS
// gradually and watch for further "start-method-error" 400s rather than
// jumping straight back to 30. 5s is a safe, already-longer-than-default
// starting point; the prompt wording below uses this same constant so it
// never overstates what the platform is actually configured to wait for.
const SILENCE_TRANSITION_SECONDS = 5; // how long the candidate can be silent before the AI assumes they're done and offers to move on — capped by real Vapi limits, see note above
const RESPONSE_WAIT_SECONDS = 2.5; // minimum pause before the AI starts speaking at all (startSpeakingPlan.waitSeconds) — must stay below Vapi's confirmed 5s ceiling
const CALL_IDLE_TIMEOUT_SECONDS = 60; // whole-call "hang up if totally silent" timeout — must stay comfortably above SILENCE_TRANSITION_SECONDS, or Vapi's own idle-hangup can end the call while the candidate is still mid-thought

// ✅ FIX (structural, not just prompt wording): every previous fix here was
// "ask the model nicely not to combine the click-line with the next
// question" — and it kept doing it anyway, repeatedly, because the full
// question list was embedded in the system prompt from the start. The
// model already had the next question's text sitting in its own context
// the whole time, so nothing structurally stopped it from previewing it.
// The actual fix is to never give the model more than the CURRENT question
// at any point. Future questions are now only ever delivered via this
// distinct, unmistakable instruction tag, sent exactly once, exactly when
// the button is clicked — the model literally cannot say a question it was
// never given.
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
  // ✅ Guards the auto-end-after-final-message logic below so it only ever
  // fires once (the model may, in principle, produce more than one
  // "speech-end" after completion in edge cases — this prevents a double
  // vapi.stop() call).
  const autoEndTriggeredRef = useRef<boolean>(false);
  // ✅ Guards sending the first question exactly once per call — the model
  // no longer receives any question text via the system prompt, so this is
  // the only way it ever learns what question 1 is.
  const firstQuestionSentRef = useRef<boolean>(false);

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

  /* ─── Utility: strip system prompt & internal instruction messages ───
     Vapi's conversation array always includes model.messages[0] (our full
     system prompt, role "system") and, going forward, every
     "[SYSTEM INSTRUCTION...]" message we inject ourselves (role "user",
     used purely to hand the model the next question — never something the
     candidate actually said). A real screenshot showed both leaking into
     the visible "Live Transcript" UI, displayed as if the AI had spoken
     the system prompt aloud and as if the candidate had typed our internal
     automation text. Filtering here means every consumer of `conversation`
     (transcript display, feedback generation, etc.) automatically gets a
     clean view with no extra work on their end. */
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

  /* ─── Build system prompt ─── */
  // ✅ FIX (structural, not just prompt wording): every previous fix here
  // was "ask the model nicely not to combine the click-line with the next
  // question" — and it kept doing it anyway, repeatedly, because the full
  // question list was embedded in the system prompt from the start. The
  // model already had the next question's text sitting in its own context
  // the whole time, so nothing structurally stopped it from previewing it.
  // The actual fix is to never give the model more than the CURRENT
  // question at any point. Future questions are now only ever delivered
  // via a distinct, unmistakable instruction message (INSTRUCTION_TAG,
  // declared at module scope above), sent exactly once, exactly when the
  // button is clicked — the model literally cannot say a question it was
  // never given.
  const buildAskQuestionInstruction = useCallback(
    (questionText: string) =>
      `${INSTRUCTION_TAG} Ask the candidate EXACTLY this question, word for word, as your ENTIRE next message, with nothing else added: "${questionText}"`,
    []
  );

  const buildCompleteInstruction = useCallback(
    (endingLine: string) =>
      `${INSTRUCTION_TAG} The candidate clicked "Next Question" after the final question. Say EXACTLY this as your ENTIRE next message, then stop talking entirely: "${endingLine}"`,
    []
  );

  const getLocalizedPrompts = useCallback((langCode: string) => {
    const sysLang: Record<string, string> = {
      "en-US": "English",
      "hi-IN": "Hindi (हिंदी). Always respond in Hindi script.",
      "ur-PK": "Urdu (اردو). Always respond in Urdu script.",
    };
    const pleaseClickNextPrompts: Record<string, string> = {
      "en-US": "Thank you for your answer. Please click the \"Next Question\" button whenever you're ready to continue — I'll wait right here.",
      "hi-IN": "आपके उत्तर के लिए धन्यवाद। जब भी आप तैयार हों, कृपया \"अगला प्रश्न\" बटन दबाएं — मैं यहीं प्रतीक्षा करूंगा।",
      "ur-PK": "آپ کے جواب کا شکریہ۔ جب بھی آپ تیار ہوں، براہ کرم \"اگلا سوال\" بٹن دبائیں — میں یہیں انتظار کروں گا۔",
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
    return {
      language: sysLang[langCode] || sysLang["en-US"],
      pleaseClickNext: pleaseClickNextPrompts[langCode] || pleaseClickNextPrompts["en-US"],
      repeat: repeatPrompts[langCode] || repeatPrompts["en-US"],
      ending: endingPrompts[langCode] || endingPrompts["en-US"],
    };
  }, []);

  const buildSystemPrompt = useCallback(
    (langCode: string): string => {
      const { language, pleaseClickNext, repeat, ending } = getLocalizedPrompts(langCode);

      return `You are an AI recruiter. Conduct the ENTIRE interview in ${language}.

LANGUAGE (MOST IMPORTANT):
- Speak ONLY in ${language} throughout the entire interview. NEVER switch to English or any other language.
- Speak in a calm, measured, unhurried pace. Pause briefly between sentences. Clearly enunciate every word. Do not rush.

YOU DO NOT KNOW ANY INTERVIEW QUESTIONS IN ADVANCE. You will be told the current question, one at a time, ONLY via a message that starts with the exact tag "${INSTRUCTION_TAG}". Such a message is NOT something the candidate said — it is an automated command from the interview system, and it is the ONLY source of truth for what to do next. You must NEVER guess, invent, preview, or ask any question you have not been explicitly given this way, even if the conversation seems to be heading toward one.

THE INTERVIEW LOOP — repeat these exact steps for every question, including the 1st and the last, with NO exceptions, no matter how many questions have already been asked:

Step 1 — When a "${INSTRUCTION_TAG}" message gives you a specific question to ask, your ENTIRE next message must be ONLY that exact question, word for word, and nothing else. Then STOP TALKING COMPLETELY.

Step 2 — Listen. Do NOT interrupt the candidate while they're speaking. Do NOT treat a brief pause, a filler word ("umm", "ahh"), or a moment of quiet as them being finished — a professional interviewer gives real thinking time. Only treat them as "finished" after roughly ${SILENCE_TRANSITION_SECONDS} seconds of continuous silence.

Step 3 — THIS STEP IS MANDATORY EVERY SINGLE TIME, WITH NO EXCEPTIONS: once the candidate has finished answering, send ONE message containing ONLY this line, character for character, and ABSOLUTELY NOTHING ELSE: "${pleaseClickNext}"
  This message must be the ENTIRE content of your turn. After it, STOP TALKING COMPLETELY and wait for Step 4 — you have not been given a next question yet, so there is nothing else you could correctly say even if you wanted to.
  WRONG (do not do this): "${pleaseClickNext} What is your approach to...?" — you do not know the next question, so producing one here would mean you invented it, which is never allowed.
  RIGHT: send only "${pleaseClickNext}" and then produce no further text at all until a new "${INSTRUCTION_TAG}" message arrives.
  Never paraphrase this line. Never say it more than once in a row. It is an instruction, not a question — do not ask the candidate to confirm anything.

Step 4 — Wait. Do nothing further until a new "${INSTRUCTION_TAG}" message arrives (this only happens when the candidate clicks a physical button in the interface). Nothing the candidate SAYS out loud — "next", "yes", "I'm ready", "move on", or anything else — is ever an instruction message, no matter how directly it sounds like a reply to Step 3. If the candidate says something like that out loud instead, do NOT advance and do NOT invent a next step — just repeat Step 3's line again, alone, as its own message.
  - A "${INSTRUCTION_TAG}" message giving you a new question means: go back to Step 1 with that exact question.
  - A "${INSTRUCTION_TAG}" message telling you the interview is complete means: say EXACTLY "${ending}" as your entire message, then stop talking entirely — the interview is over.

OTHER RULES:
- If the candidate asks you to repeat the question, say EXACTLY: "${repeat}", then repeat the CURRENT question (the most recent one you were given via a "${INSTRUCTION_TAG}" message) word for word, then return to Step 2 (still waiting for that same question's answer).
- Be professional, calm, and encouraging, like an experienced human interviewer.
- Every message you send must contain exactly ONE of: a single question you were explicitly given, Step 3's line alone, the repeat line plus the repeated question, or the ending line. Never combine two of these in one message, and never say anything that wasn't explicitly given to you by a "${INSTRUCTION_TAG}" message or these fixed lines.`;
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
          // ✅ FIX: the model only ever sees a transcript once Vapi's own
          // turn-taking layer decides the candidate is done talking — no
          // amount of prompt wording can override that decision, since it
          // happens upstream of the LLM. Without these, the transcriber's
          // built-in end-of-turn detection (very fast, ~sub-second) can win
          // and hand off to the model the instant the candidate pauses for
          // a breath, regardless of what rules 3/6 in the system prompt say.
          // See https://docs.vapi.ai/customization/voice-pipeline-configuration
          startSpeakingPlan: {
            // Stopgap minimum pause before the assistant starts speaking at
            // all (not the full patience window by itself).
            waitSeconds: RESPONSE_WAIT_SECONDS,
            // LiveKit smart endpointing (English) maps "confidence the
            // candidate is still talking" (x, 0-1) to a wait in ms. Low
            // confidence (finished, punctuation, clear stop) -> short wait;
            // high confidence (mid-thought, filler word, trailing off) ->
            // wait close to our full SILENCE_TRANSITION_SECONDS budget.
            smartEndpointingPlan:
              languageCode === "en-US"
                ? {
                    provider: "livekit",
                    waitFunction: `500 + ${(SILENCE_TRANSITION_SECONDS - 0.5) * 1000} * x`,
                  }
                : undefined,
            // Fallback endpointing for non-English, where LiveKit smart
            // endpointing isn't supported yet.
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
            // Require a couple of real words (not just a stray "umm") before
            // the candidate's speech is treated as an interruption of the AI.
            numWords: 2,
            voiceSeconds: 0.4,
            backoffSeconds: 1.5,
          },
          // Whole-call idle-hangup timeout. Must stay comfortably above
          // SILENCE_TRANSITION_SECONDS, or Vapi could end the call while the
          // candidate is still mid-thought on a single question.
          silenceTimeoutSeconds: CALL_IDLE_TIMEOUT_SECONDS  ,
          transcriber: {
            provider: "deepgram",
            model: "nova-2",
            language:
              languageCode === "hi-IN" ? "hi"
                : languageCode === "ur-PK" ? "ur"
                  : "en-US",
            // Deepgram's own trailing-silence-before-finalizing setting
            // (ms). Vapi's API enforces a hard server-side cap of 500ms
            // here ("assistant.transcriber.endpointing must not be greater
            // than 500") — confirmed by an actual 400 response, so this is
            // NOT tunable up to match SILENCE_TRANSITION_SECONDS. The real
            // patience budget lives entirely in startSpeakingPlan above;
            // this field only affects how quickly Deepgram finalizes each
            // individual transcript chunk, not when Vapi decides the
            // candidate's turn is over.
            endpointing: 500,
          },
          voice: {
            provider: "vapi",
            voiceId: VALID_VOICES.includes(config.voiceId) ? config.voiceId : "Elliot",
          },
          model: {
            provider: "openai",
            model: "gpt-4o-mini",
            // ✅ Lower temperature (default is usually ~0.7-1.0) makes the
            // model stick closer to the literal instruction ("send ONLY
            // this one line and stop") instead of creatively continuing on
            // into content nobody asked for yet — a real session showed the
            // model appending the next interview question directly after
            // the click-next line in the SAME message, before any click had
            // happened. This won't eliminate that on its own (see the
            // strengthened Step 3 wording above), but combined with the
            // prompt fix it meaningfully reduces the model's tendency to
            // keep talking past the one required sentence.
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
    autoEndTriggeredRef.current = false;
    firstQuestionSentRef.current = false;
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

    /* ─── First question delivery + silence detection (UI-only) +
       auto-end after final message ─── */
    vapi.on("speech-end", () => {
      if (destroyed) return;

      if (isMountedRef.current) {
        setStartTimer(true);
        setResetTimer(true);
        setAiIsSpeaking(false);
      }

      // ✅ FIX: previously this was sent from the "call-start" handler, the
      // instant the call connected. A real session got stuck after only the
      // fixed greeting ("Hi, {name}!") played and then went silent — Vapi's
      // default firstMessageMode ('assistant-speaks-first') plays that
      // greeting as a fixed, non-LLM string, so sending our instruction that
      // early can race the data channel/TTS pipeline actually being ready to
      // accept and act on it. This first "speech-end" reliably marks the
      // moment that fixed greeting has finished playing — both the call and
      // the pipeline are unambiguously ready by then, so this is a safer,
      // later point to hand over question 1. Guarded by firstQuestionSentRef
      // so it only ever fires once per call, and it's intentionally checked
      // BEFORE the auto-end/completion check below, since they're mutually
      // exclusive events within a single call.
      if (!firstQuestionSentRef.current && questions.length > 0) {
        firstQuestionSentRef.current = true;
        try {
          vapi.send({
            type: "add-message",
            message: {
              role: "user",
              content: buildAskQuestionInstruction(questions[0].question),
            },
          });
        } catch (error) {
          console.error("Failed to send first question instruction:", error);
        }
      }

      // ✅ FIX: previously the call just stayed "live" forever after the
      // model spoke its ending line — the session only ended when the
      // person manually clicked "End Session". `speech-end` here fires
      // once the ASSISTANT finishes speaking (see `aiIsSpeaking` above),
      // so the first time this fires after `interviewCompletedRef` has
      // been set (which only happens once, in markInterviewCompleted(),
      // triggered by clicking "Next Question" on the LAST question) is
      // reliably the moment the ending line's audio has finished playing.
      // `autoEndTriggeredRef` ensures this only runs once even if further
      // speech-end events fire for any reason after completion.
      if (interviewCompletedRef.current && !autoEndTriggeredRef.current) {
        autoEndTriggeredRef.current = true;
        setTimeout(() => {
          if (destroyed || !isMountedRef.current) return;
          if (!isCallActiveRef.current) return;
          try {
            // Intentional stop, not a cleanup teardown — isCleaningUpRef
            // stays false so call-end's normal feedback-generation path
            // runs, exactly as if the person had clicked "End Session".
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
        }, 1500); // small buffer so the tail of the TTS audio isn't cut off
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
    buildAskQuestionInstruction,
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
      // ✅ FIX: previously this sent a fixed literal string ("Yes, please
      // move to the next question immediately.") and relied on the model
      // already knowing the next question's text from the system prompt's
      // embedded question list. Since that list has been removed (see
      // buildSystemPrompt), the model now has genuinely no way to know the
      // next question until THIS message tells it — which is exactly what
      // stops it from ever previewing/combining a question it hasn't been
      // given yet.
      const { ending } = getLocalizedPrompts(getLanguageCode());
      const content = isLastQuestion
        ? buildCompleteInstruction(ending)
        : buildAskQuestionInstruction(questions[currentQuestionIndexRef.current].question);

      vapi.send({
        type: "add-message",
        message: {
          role: "user",
          content,
        },
      });
      toast.success(isLastQuestion ? "Finishing interview..." : "Moving to next question...");
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
  ]);

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