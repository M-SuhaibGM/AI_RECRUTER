// interview/[interview_id]/start/_components/PreInterviewCheck.tsx
"use client";
import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import {
    Mic, MicOff, CheckCircle2, RefreshCw, Clock,
    ChevronDown, ChevronUp, Wifi, Sparkles, MonitorSmartphone,
    Lightbulb, HelpCircle, Shield
} from "lucide-react";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { InterviewDataContext } from "@/context/InterviewDataContext";

// ─── Type Definitions ───
interface PreInterviewCheckProps {
    interviewData?: {
        jobPosition?: string;
        duration?: string | number;
        questions?: Array<{ question: string }>;
    };
    onAllReady?: () => void;
}

// ─── Constants ───
const BAR_COUNT = 32;
const INTERVIEW_TIPS = [
    { icon: "🎯", title: "Be Concise", desc: "Aim for 1-2 minutes per question." },
    { icon: "🎤", title: "Speak Clearly", desc: "Moderate pace, clear pronunciation." },
    { icon: "🏠", title: "Quiet Space", desc: "Minimal background noise." },
    { icon: "🔌", title: "Stable Internet", desc: "Wired connection recommended." },
];

// ─── Helper Functions ───
function getBarColor(height: number): string {
    if (height > 0.7) return "#f87171";
    if (height > 0.35) return "#3b82f6";
    return "#93c5fd";
}

function formatDuration(minutes: string | number | undefined): string {
    const mins = parseInt(String(minutes || "0"));
    if (mins < 60) return `${mins} minutes`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
}

// ─── Main Component ───
export function PreInterviewCheck({ interviewData, onAllReady }: PreInterviewCheckProps): React.ReactElement | null {
    const router = useRouter();
    const params = useParams<{ interview_id: string }>();
    const { interviewInfo } = useContext(InterviewDataContext);

    // ✅ Guard: If context is lost (page refreshed), redirect to interview entry form
    useEffect(() => {
        if (!interviewInfo?.userEmail || !interviewInfo?.userName) {
            router.replace(`/interview/${params.interview_id}`);
        }
    }, [interviewInfo, router, params.interview_id]);

    // ✅ Mobile device detection
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [checkedDevice, setCheckedDevice] = useState<boolean>(false);

    useEffect(() => {
        const ua = navigator.userAgent;
        const isMobileUA = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        const isSmallScreen = window.innerWidth < 1024;
        setIsMobile(isMobileUA || isSmallScreen);
        setCheckedDevice(true);
    }, []);

    // Mic states
    const [micStatus, setMicStatus] = useState<"idle" | "requesting" | "active" | "denied" | "ready">("idle");
    const [micVolume, setMicVolume] = useState<number>(0);
    const [micPeakDetected, setMicPeakDetected] = useState<boolean>(false);
    const [micBars, setMicBars] = useState<number[]>(Array(BAR_COUNT).fill(0.05));

    // UI states
    const [activeTab, setActiveTab] = useState<"sample" | "tips">("sample");
    const [connectionQuality, setConnectionQuality] = useState<"good" | "fair" | "poor">("good");

    // Refs
    const micStreamRef = useRef<MediaStream | null>(null);
    const micAudioCtxRef = useRef<AudioContext | null>(null);
    const micAnalyserRef = useRef<AnalyserNode | null>(null);
    const micRafRef = useRef<number | null>(null);
    const mountedRef = useRef<boolean>(true);

    const sampleQuestion = interviewData?.questions?.[0]?.question || "Tell me about your relevant experience for this role.";

    // ─── Cleanup ───
    const stopMic = useCallback((): void => {
        if (micRafRef.current) { cancelAnimationFrame(micRafRef.current); micRafRef.current = null; }
        if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null; }
        if (micAudioCtxRef.current?.state !== "closed") { micAudioCtxRef.current?.close().catch(() => { }); micAudioCtxRef.current = null; }
        micAnalyserRef.current = null;
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; stopMic(); };
    }, [stopMic]);

    // ─── Connection Check ───
    useEffect(() => {
        const check = (): void => {
            if ("connection" in navigator) {
                const conn = (navigator as any).connection;
                if (conn?.downlink < 1) setConnectionQuality("poor");
                else if (conn?.downlink < 5) setConnectionQuality("fair");
                else setConnectionQuality("good");
            }
        };
        check();
        const interval = setInterval(check, 5000);
        return () => clearInterval(interval);
    }, []);

    // ─── Auto-proceed when mic ready ───
    useEffect(() => {
        if (micStatus === "ready") {
            const timer = setTimeout(() => onAllReady?.(), 1000);
            return () => clearTimeout(timer);
        }
    }, [micStatus, onAllReady]);

    // ─── Start Mic Test ───
    const startMicTest = useCallback(async (): Promise<void> => {
        stopMic();
        setMicStatus("requesting");
        setMicPeakDetected(false);
        setMicVolume(0);
        setMicBars(Array(BAR_COUNT).fill(0.05));

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 }
            });
            if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
            micStreamRef.current = stream;

            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (ctx.state === "suspended") await ctx.resume();
            micAudioCtxRef.current = ctx;

            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.75;
            micAnalyserRef.current = analyser;

            const source = ctx.createMediaStreamSource(stream);
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            setMicStatus("active");

            const tick = (): void => {
                if (!mountedRef.current || !micAnalyserRef.current) return;
                micAnalyserRef.current.getByteFrequencyData(dataArray);
                const step = Math.floor(bufferLength / BAR_COUNT);
                const newBars = Array.from({ length: BAR_COUNT }, (_, i) => {
                    let sum = 0;
                    for (let j = 0; j < step; j++) sum += dataArray[i * step + j];
                    return Math.min(1, (sum / step) / 200);
                });
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
                const avg = sum / bufferLength / 255;
                if (mountedRef.current) {
                    setMicBars(newBars);
                    setMicVolume(avg);
                    if (avg > 0.05) setMicPeakDetected(true);
                }
                micRafRef.current = requestAnimationFrame(tick);
            };
            micRafRef.current = requestAnimationFrame(tick);
        } catch {
            if (mountedRef.current) setMicStatus("denied");
        }
    }, [stopMic]);

    // ─── Confirm Mic ───
    const confirmMic = (): void => { setMicStatus("ready"); stopMic(); };

    // ─── Loading state (still checking device) ───
    if (!checkedDevice) return null;

    // ─── Mobile Block Screen ───
    if (isMobile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-blue-100">
                    <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                        <MonitorSmartphone className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">
                        Desktop Required
                    </h2>
                    <p className="text-gray-500 mb-6 text-sm leading-relaxed">
                        This interview requires a desktop or laptop computer for the best experience.
                        Please open this link on a desktop device to continue.
                    </p>
                    <p className="text-xs text-gray-400">
                        If you believe this is an error, try switching to desktop mode in your browser.
                    </p>
                </div>
            </div>
        );
    }

    // ─── Main UI (Blue & White Theme, 100vh, 2-Column) ───
    return (
        <div
            className="w-full h-full flex flex-col relative overflow-hidden"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
            {/* ── Top Bar: Timer + Connection ── */}
            <div className="flex items-center justify-between px-4 py-2 shrink-0">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs text-blue-700 font-medium">
                        ~{formatDuration(interviewData?.duration)}
                    </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200">
                    <Wifi className={`w-3.5 h-3.5 ${
                        connectionQuality === "good" ? "text-green-500" :
                        connectionQuality === "fair" ? "text-amber-500" : "text-red-500"
                    }`} />
                    <span className="text-[10px] text-slate-500 font-medium">
                        {connectionQuality.toUpperCase()}
                    </span>
                </div>
            </div>

            {/* ── 2-Column Grid Layout ── */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 pb-4 min-h-0">

                {/* ══════════════ LEFT: MIC TEST CARD ══════════════ */}
                <div className="relative rounded-3xl overflow-hidden flex flex-col min-h-0"
                    style={{
                        background: "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)",
                        border: micStatus === "active" ? "2px solid rgba(37,99,235,0.4)" : "1px solid #e2e8f0",
                        boxShadow: micStatus === "active"
                            ? "0 20px 60px rgba(37,99,235,0.15), inset 0 1px 0 rgba(255,255,255,0.9)"
                            : "0 8px 32px rgba(0,0,0,0.06)",
                        transition: "all 0.4s ease",
                    }}
                >
                    {micStatus === "active" && (
                        <div className="absolute inset-0 bg-blue-500/5 animate-pulse pointer-events-none" />
                    )}

                    <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                        {/* Icon */}
                        <div className="relative mb-4">
                            {micStatus === "active" && (
                                <>
                                    <span className="absolute w-24 h-24 rounded-full border border-blue-400/30 animate-ping" style={{ animationDuration: "2s" }} />
                                    <span className="absolute w-20 h-20 rounded-full border border-blue-300/20 animate-ping" style={{ animationDuration: "2.5s", animationDelay: "0.3s" }} />
                                </>
                            )}
                            <div
                                className="relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300"
                                style={{
                                    background:
                                        micStatus === "denied" ? "linear-gradient(135deg,#dc2626,#ef4444)" :
                                        micStatus === "ready" ? "linear-gradient(135deg,#059669,#10b981)" :
                                        "linear-gradient(135deg,#1d4ed8,#3b82f6)",
                                    boxShadow: micStatus === "active"
                                        ? `0 0 ${Math.round(micVolume * 40)}px rgba(59,130,246,0.5)`
                                        : "0 8px 32px rgba(37,99,235,0.25)",
                                }}
                            >
                                {micStatus === "requesting" && <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />}
                                {micStatus === "denied" && <MicOff className="w-7 h-7 text-white" />}
                                {micStatus === "ready" && <CheckCircle2 className="w-7 h-7 text-white" />}
                                {(micStatus === "idle" || micStatus === "active") && <Mic className="w-7 h-7 text-white" />}
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-lg font-bold text-slate-900 mb-1" style={{ fontFamily: "'Syne',sans-serif" }}>
                            {micStatus === "ready" ? "Microphone Ready" : "Microphone Test"}
                        </h2>
                        <p className="text-[11px] text-slate-500 text-center mb-4 max-w-[280px]">
                            {micStatus === "idle" && "Test your microphone before starting."}
                            {micStatus === "requesting" && "Allow microphone access in your browser."}
                            {micStatus === "active" && (micPeakDetected ? "✓ We can hear you clearly!" : "Say something to test...")}
                            {micStatus === "denied" && "Microphone blocked. Check permissions."}
                            {micStatus === "ready" && "Your microphone is working perfectly!"}
                        </p>

                        {/* Waveform */}
                        <div
                            className="w-full max-w-md h-20 flex items-end justify-center gap-[3px] rounded-2xl p-3 mb-3"
                            style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
                        >
                            {micBars.map((h, i) => (
                                <div
                                    key={i}
                                    className="rounded-full flex-1 transition-all"
                                    style={{
                                        height: `${Math.max(4, h * 100)}%`,
                                        background: micStatus === "active" ? getBarColor(h) : "#cbd5e1",
                                        maxWidth: 6,
                                        transition: "height 0.04s ease",
                                    }}
                                />
                            ))}
                        </div>

                        {/* Volume Level */}
                        {micStatus === "active" && (
                            <div className="w-full max-w-md space-y-1">
                                <div className="flex justify-between text-[10px] text-slate-500">
                                    <span>Input Level</span>
                                    <span className="font-mono">{Math.round(micVolume * 100)}%</span>
                                </div>
                                <div className="h-1.5 rounded-full overflow-hidden bg-slate-100">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                            width: `${micVolume * 100}%`,
                                            background: micVolume > 0.7 ? "#ef4444" : micVolume > 0.35 ? "#3b82f6" : "#93c5fd",
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Button */}
                    <div className="p-4 relative z-10 shrink-0">
                        {(micStatus === "idle" || micStatus === "denied") && (
                            <button
                                onClick={startMicTest}
                                type="button"
                                className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 hover:shadow-lg"
                                style={{
                                    background: micStatus === "denied"
                                        ? "linear-gradient(135deg,#dc2626,#ef4444)"
                                        : "linear-gradient(135deg,#1d4ed8,#3b82f6)",
                                    color: "#fff",
                                    boxShadow: "0 4px 20px rgba(37,99,235,0.3)",
                                }}
                            >
                                {micStatus === "denied" ? (
                                    <><RefreshCw className="w-4 h-4" /> Retry Microphone</>
                                ) : (
                                    <><Mic className="w-4 h-4" /> Test Microphone</>
                                )}
                            </button>
                        )}
                        {micStatus === "active" && (
                            <button
                                onClick={confirmMic}
                                disabled={!micPeakDetected}
                                type="button"
                                className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
                                style={{
                                    background: micPeakDetected
                                        ? "linear-gradient(135deg,#059669,#10b981)"
                                        : "#e2e8f0",
                                    color: micPeakDetected ? "#fff" : "#94a3b8",
                                }}
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                {micPeakDetected ? "Confirm Microphone" : "Speak to enable"}
                            </button>
                        )}
                        {micStatus === "ready" && (
                            <div
                                className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                                style={{ background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}
                            >
                                <CheckCircle2 className="w-4 h-4" /> Microphone Verified ✓
                            </div>
                        )}
                    </div>
                </div>

                {/* ══════════════ RIGHT: SAMPLE QUESTION + TIPS ══════════════ */}
                <div className="flex flex-col gap-3 min-h-0">

                    {/* Tabs */}
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={() => setActiveTab("sample")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                                activeTab === "sample"
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                            <HelpCircle className="w-3.5 h-3.5" />
                            Sample Question
                        </button>
                        <button
                            onClick={() => setActiveTab("tips")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                                activeTab === "tips"
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                            <Lightbulb className="w-3.5 h-3.5" />
                            Interview Tips
                        </button>
                    </div>

                    {/* Content Panel */}
                    <div
                        className="flex-1 rounded-3xl p-6 overflow-y-auto min-h-0"
                        style={{
                            background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
                        }}
                    >
                        {/* ── Sample Question Tab ── */}
                        {activeTab === "sample" && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <HelpCircle className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">Sample Question</h3>
                                        <p className="text-[10px] text-slate-500">Here's an example of what to expect</p>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-100">
                                    <p className="text-sm text-slate-700 leading-relaxed italic">
                                        &ldquo;{sampleQuestion}&rdquo;
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        <span className="font-bold text-slate-700">💡 Tip:</span> Take a moment to structure
                                        your answer using the STAR method (Situation, Task, Action, Result) for clarity.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ── Interview Tips Tab ── */}
                        {activeTab === "tips" && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                        <Lightbulb className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">Interview Tips</h3>
                                        <p className="text-[10px] text-slate-500">Best practices for success</p>
                                    </div>
                                </div>

                                {INTERVIEW_TIPS.map((tip, i) => (
                                    <div
                                        key={i}
                                        className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-blue-200 transition-all"
                                    >
                                        <span className="text-lg shrink-0">{tip.icon}</span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-700">{tip.title}</p>
                                            <p className="text-[10px] text-slate-500 leading-snug">{tip.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Security Notice */}
                    <div className="shrink-0 p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <p className="text-[10px] text-blue-700 font-medium">
                            Your interview is secure and monitored for integrity.
                        </p>
                    </div>
                </div>
            </div>

            {/* ─── Ready State Overlay ─── */}
            {micStatus === "ready" && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-md">
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center mx-auto animate-bounce shadow-lg shadow-blue-300">
                            <CheckCircle2 className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Syne',sans-serif" }}>
                            All Set!
                        </h2>
                        <p className="text-slate-500">Starting your interview...</p>
                    </div>
                </div>
            )}
        </div>
    );
}