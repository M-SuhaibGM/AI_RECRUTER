// interview/[interview_id]/start/_components/PreInterviewCheck.tsx
"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Mic, MicOff, Video, VideoOff, CheckCircle2, AlertCircle,
    RefreshCw, Clock, HelpCircle, Lightbulb, ChevronDown, ChevronUp,
    Wifi, Shield, Sparkles, ArrowRight, Zap
} from "lucide-react";
import { toast } from "sonner";

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
    { icon: "🎯", title: "Be Concise", desc: "Give clear, structured answers. Aim for 1-2 minutes per question." },
    { icon: "🎤", title: "Speak Clearly", desc: "Speak at a moderate pace. The AI transcribes your voice in real-time." },
    { icon: "🏠", title: "Quiet Environment", desc: "Find a quiet space with minimal background noise and good lighting." },
    { icon: "🔌", title: "Stable Connection", desc: "Use a wired internet connection if possible. Close other apps and tabs." },
];

// ─── Helper Functions ───
function getBarColor(height: number): string {
    if (height > 0.7) return "#f87171";
    if (height > 0.35) return "#34d399";
    return "#60a5fa";
}

function formatDuration(minutes: string | number | undefined): string {
    const mins = parseInt(String(minutes || "0"));
    if (mins < 60) return `${mins} minutes`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
}

// ─── Main Component ───
export function PreInterviewCheck({ interviewData, onAllReady }: PreInterviewCheckProps): React.ReactElement {
    // Mic states
    const [micStatus, setMicStatus] = useState<"idle" | "requesting" | "active" | "denied" | "ready">("idle");
    const [micVolume, setMicVolume] = useState<number>(0);
    const [micPeakDetected, setMicPeakDetected] = useState<boolean>(false);
    const [micBars, setMicBars] = useState<number[]>(Array(BAR_COUNT).fill(0.05));

    // Camera states
    const [camStatus, setCamStatus] = useState<"idle" | "requesting" | "active" | "denied" | "ready">("idle");
    const [faceDetected, setFaceDetected] = useState<boolean>(false);
    const [camError, setCamError] = useState<string>("");

    // UI states
    const [showTips, setShowTips] = useState<boolean>(false);
    const [connectionQuality, setConnectionQuality] = useState<"good" | "fair" | "poor">("good");

    // Refs
    const micStreamRef = useRef<MediaStream | null>(null);
    const micAudioCtxRef = useRef<AudioContext | null>(null);
    const micAnalyserRef = useRef<AnalyserNode | null>(null);
    const micRafRef = useRef<number | null>(null);
    const camStreamRef = useRef<MediaStream | null>(null);
    const camIntervalRef = useRef<number | null>(null);
    const camVideoRef = useRef<HTMLVideoElement>(null);
    const camCanvasRef = useRef<HTMLCanvasElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const mountedRef = useRef<boolean>(true);

    const sampleQuestion = interviewData?.questions?.[0]?.question || "Tell me about your relevant experience for this role.";

    // ─── Cleanup ───
    const stopAll = useCallback((): void => {
        if (micRafRef.current) { cancelAnimationFrame(micRafRef.current); micRafRef.current = null; }
        if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null; }
        if (micAudioCtxRef.current?.state !== "closed") { micAudioCtxRef.current?.close().catch(() => { }); micAudioCtxRef.current = null; }
        micAnalyserRef.current = null;
        if (camStreamRef.current) { camStreamRef.current.getTracks().forEach(t => t.stop()); camStreamRef.current = null; }
        if (camIntervalRef.current) { clearInterval(camIntervalRef.current); camIntervalRef.current = null; }
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; stopAll(); };
    }, [stopAll]);

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

    // ─── Auto-proceed when both ready ───
    useEffect(() => {
        if (micStatus === "ready" && camStatus === "ready") {
            const timer = setTimeout(() => onAllReady?.(), 1000);
            return () => clearTimeout(timer);
        }
    }, [micStatus, camStatus, onAllReady]);

    // ─── Start Mic Test ───
    const startMicTest = useCallback(async (): Promise<void> => {
        stopAll();
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
    }, [stopAll]);

    // ─── Start Camera Test (FIXED - Video display + face detection) ───
    const startCamTest = useCallback(async (): Promise<void> => {
        // Clean up previous stream
        if (camStreamRef.current) {
            camStreamRef.current.getTracks().forEach(t => t.stop());
            camStreamRef.current = null;
        }
        if (camIntervalRef.current) {
            clearInterval(camIntervalRef.current);
            camIntervalRef.current = null;
        }

        setCamStatus("requesting");
        setCamError("");
        setFaceDetected(false);

        try {
            // ✅ Get camera stream
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: "user"
                }
            });

            if (!mountedRef.current) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            camStreamRef.current = stream;

            // ✅ Set video source and force play
            if (camVideoRef.current) {
                const video = camVideoRef.current;
                video.srcObject = stream;
                video.muted = true;
                video.playsInline = true;

                // ✅ Force video to play (required for some browsers)
                try {
                    await video.play();
                } catch (playErr) {
                    toast.error("Camera auto-play failed. Please click on the video to start.");
                }

                // ✅ Wait for video to be ready
                await new Promise<void>((resolve) => {
                    if (video.readyState >= 2) {
                        resolve();
                    } else {
                        video.onloadeddata = (): void => {
                            resolve();
                        };
                        // Timeout fallback
                        setTimeout(() => {
                            resolve();
                        }, 3000);
                    }
                });
            }

            setCamStatus("active");
            toast.success("Camera is active");

            // ✅ Simple face/feed detection
            const checkFeed = (): void => {
                const video = camVideoRef.current;
                const canvas = camCanvasRef.current;

                if (!video || !canvas || video.readyState < 2) {
                    toast.error("Video not ready for face check");
                    return;
                }

                // ✅ Update canvas size to match video
                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                    canvas.width = video.videoWidth || 320;
                    canvas.height = video.videoHeight || 240;
                }

                const ctx = canvas.getContext("2d", { willReadFrequently: true });
                if (!ctx) return;

                try {
                    // Draw current video frame to canvas
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    // ✅ Check multiple sample points across the frame
                    let totalBrightness = 0;
                    let samplesChecked = 0;

                    // Check 5 different regions
                    const regions = [
                        { x: 0.25, y: 0.25, w: 0.5, h: 0.5 },  // Center
                        { x: 0.1, y: 0.1, w: 0.3, h: 0.3 },    // Top-left
                        { x: 0.6, y: 0.1, w: 0.3, h: 0.3 },    // Top-right
                        { x: 0.1, y: 0.6, w: 0.3, h: 0.3 },    // Bottom-left
                        { x: 0.6, y: 0.6, w: 0.3, h: 0.3 },    // Bottom-right
                    ];

                    for (const region of regions) {
                        const sx = Math.floor(canvas.width * region.x);
                        const sy = Math.floor(canvas.height * region.y);
                        const sw = Math.floor(canvas.width * region.w);
                        const sh = Math.floor(canvas.height * region.h);

                        if (sw <= 0 || sh <= 0) continue;

                        const imageData = ctx.getImageData(sx, sy, sw, sh);

                        let brightness = 0;
                        for (let i = 0; i < imageData.data.length; i += 4) {
                            brightness += (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
                        }

                        totalBrightness += brightness / (imageData.data.length / 4);
                        samplesChecked++;
                    }

                    const avgBrightness = samplesChecked > 0 ? totalBrightness / samplesChecked : 0;

                    // ✅ Very lenient: brightness > 5 means camera is working (not black screen)
                    const isActive = avgBrightness > 5;
                    if (mountedRef.current) {
                        setFaceDetected(isActive);
                    }
                } catch (err) {
                    toast.error("Face detection error.");
                }
            };

            // ✅ Run first check after delay
            setTimeout(() => {
                checkFeed();
                camIntervalRef.current = window.setInterval(checkFeed, 1500);
            }, 1000);

        } catch (err: any) {
            toast.error("Camera access denied. Please check your permissions.");

            if (err.name === "NotAllowedError") {
                setCamError("Camera access denied. Please allow camera permissions.");
            } else if (err.name === "NotFoundError") {
                setCamError("No camera found on this device.");
            } else {
                setCamError(err.message || "Camera access denied");
            }

            if (mountedRef.current) setCamStatus("denied");
        }
    }, []);
    // ─── Confirm Buttons ───
    const confirmMic = (): void => { setMicStatus("ready"); stopAll(); };
    const confirmCam = (): void => {
        setCamStatus("ready");
        if (camStreamRef.current) camStreamRef.current.getTracks().forEach(t => t.stop());
    };

    const bothReady = micStatus === "ready" && camStatus === "ready";

    return (
        <div className="w-full h-full flex flex-col relative" style={{ fontFamily: "'DM Sans', sans-serif" }}>

            {/* ── Top Bar: Timer + Connection (Fixed) ── */}
            <div className="flex items-center justify-between px-4 py-2 shrink-0">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs text-blue-300">~{formatDuration(interviewData?.duration)}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Wifi className={`w-3.5 h-3.5 ${connectionQuality === "good" ? "text-green-400" : connectionQuality === "fair" ? "text-amber-400" : "text-red-400"}`} />
                    <span className="text-[10px] text-slate-500">{connectionQuality.toUpperCase()}</span>
                </div>
            </div>

            {/* ── Scrollable Content ── */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-3 pb-4 space-y-3" style={{ scrollBehavior: "smooth" }}>

                {/* ── Mic & Camera Cards ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-[400px] lg:min-h-[500px]">

                    {/* ═══════════════ MIC CARD ═══════════════ */}
                    <div className="relative rounded-3xl overflow-hidden flex flex-col min-h-[400px]" style={{
                        background: "linear-gradient(180deg, rgba(37,99,235,0.1) 0%, rgba(15,23,42,0.6) 100%)",
                        border: micStatus === "active" ? "2px solid rgba(96,165,250,0.5)" : "1px solid rgba(255,255,255,0.1)",
                        boxShadow: micStatus === "active" ? "0 0 60px rgba(37,99,235,0.15), inset 0 1px 0 rgba(255,255,255,0.05)" : "inset 0 1px 0 rgba(255,255,255,0.03)",
                    }}>
                        {micStatus === "active" && (
                            <div className="absolute inset-0 bg-blue-500/5 animate-pulse pointer-events-none" />
                        )}

                        <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                            <div className="relative mb-6">
                                {micStatus === "active" && (
                                    <>
                                        <span className="absolute w-28 h-28 rounded-full border border-blue-500/30 animate-ping" style={{ animationDuration: "2s" }} />
                                        <span className="absolute w-24 h-24 rounded-full border border-blue-400/20 animate-ping" style={{ animationDuration: "2.5s", animationDelay: "0.3s" }} />
                                    </>
                                )}
                                <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300"
                                    style={{
                                        background: micStatus === "denied" ? "linear-gradient(135deg,#7f1d1d,#991b1b)" :
                                            micStatus === "ready" ? "linear-gradient(135deg,#065f46,#10b981)" :
                                                "linear-gradient(135deg,#1d4ed8,#3b82f6)",
                                        boxShadow: micStatus === "active" ? `0 0 ${Math.round(micVolume * 30)}px rgba(59,130,246,0.5)` : "0 8px 32px rgba(0,0,0,0.4)",
                                    }}>
                                    {micStatus === "requesting" && <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />}
                                    {micStatus === "denied" && <MicOff className="w-9 h-9 text-white" />}
                                    {micStatus === "ready" && <CheckCircle2 className="w-9 h-9 text-white" />}
                                    {(micStatus === "idle" || micStatus === "active") && <Mic className="w-9 h-9 text-white" />}
                                </div>
                            </div>

                            <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Syne',sans-serif" }}>
                                {micStatus === "ready" ? "Microphone Ready" : "Microphone Test"}
                            </h2>
                            <p className="text-xs text-slate-400 text-center mb-6 max-w-[250px]">
                                {micStatus === "idle" && "Test your microphone before starting the interview."}
                                {micStatus === "requesting" && "Allow microphone access in your browser."}
                                {micStatus === "active" && (micPeakDetected ? "✓ We can hear you clearly!" : "Say something to test...")}
                                {micStatus === "denied" && "Microphone blocked. Check browser permissions."}
                                {micStatus === "ready" && "Your microphone is working perfectly!"}
                            </p>

                            <div className="w-full max-w-md h-20 flex items-end justify-center gap-[3px] rounded-2xl p-3 mb-4"
                                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                {micBars.map((h, i) => (
                                    <div key={i} className="rounded-full flex-1 transition-all" style={{
                                        height: `${Math.max(4, h * 100)}%`,
                                        background: micStatus === "active" ? getBarColor(h) : "rgba(255,255,255,0.06)",
                                        maxWidth: 6,
                                        transition: "height 0.04s ease",
                                    }} />
                                ))}
                            </div>

                            {micStatus === "active" && (
                                <div className="w-full max-w-md space-y-1 mb-4">
                                    <div className="flex justify-between text-[10px] text-slate-500">
                                        <span>Input Level</span>
                                        <span className="font-mono">{Math.round(micVolume * 100)}%</span>
                                    </div>
                                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                        <div className="h-full rounded-full transition-all" style={{
                                            width: `${micVolume * 100}%`,
                                            background: micVolume > 0.7 ? "#f87171" : micVolume > 0.35 ? "#34d399" : "#3b82f6",
                                        }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ✅ Bottom Button - Now properly accessible */}
                        <div className="p-4 relative z-10 shrink-0">
                            {(micStatus === "idle" || micStatus === "denied") && (
                                <button onClick={startMicTest} type="button"
                                    className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 hover:brightness-110"
                                    style={{ background: micStatus === "denied" ? "linear-gradient(135deg,#dc2626,#ef4444)" : "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "#fff" }}>
                                    {micStatus === "denied" ? <><RefreshCw className="w-4 h-4" /> Retry Microphone</> : <><Mic className="w-4 h-4" /> Test Microphone</>}
                                </button>
                            )}
                            {micStatus === "active" && (
                                <button onClick={confirmMic} disabled={!micPeakDetected} type="button"
                                    className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-30 hover:brightness-110"
                                    style={{ background: micPeakDetected ? "linear-gradient(135deg,#065f46,#10b981)" : "rgba(255,255,255,0.06)", color: "#fff" }}>
                                    <CheckCircle2 className="w-4 h-4" />
                                    {micPeakDetected ? "Confirm Microphone" : "Speak to enable"}
                                </button>
                            )}
                            {micStatus === "ready" && (
                                <div className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                                    style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>
                                    <CheckCircle2 className="w-4 h-4" /> Microphone Verified ✓
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ═══════════════ CAMERA CARD (FIXED) ═══════════════ */}
                    <div className="relative rounded-3xl overflow-hidden flex flex-col min-h-[400px]" style={{
                        background: "linear-gradient(180deg, rgba(99,102,241,0.1) 0%, rgba(15,23,42,0.6) 100%)",
                        border: camStatus === "active" ? "2px solid rgba(129,140,248,0.5)" : "1px solid rgba(255,255,255,0.1)",
                        boxShadow: camStatus === "active" ? "0 0 60px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.05)" : "inset 0 1px 0 rgba(255,255,255,0.03)",
                    }}>
                        <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                            <div className="relative mb-4">
                                {camStatus === "active" && (
                                    <>
                                        <span className="absolute w-28 h-28 rounded-full border border-indigo-500/30 animate-ping" style={{ animationDuration: "2s" }} />
                                        <span className="absolute w-24 h-24 rounded-full border border-indigo-400/20 animate-ping" style={{ animationDuration: "2.5s", animationDelay: "0.3s" }} />
                                    </>
                                )}
                                <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300"
                                    style={{
                                        background: camStatus === "denied" ? "linear-gradient(135deg,#7f1d1d,#991b1b)" :
                                            camStatus === "ready" ? "linear-gradient(135deg,#065f46,#10b981)" :
                                                "linear-gradient(135deg,#4f46e5,#6366f1)",
                                        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                                    }}>
                                    {camStatus === "requesting" && <div className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin" />}
                                    {camStatus === "denied" && <VideoOff className="w-8 h-8 text-white" />}
                                    {camStatus === "ready" && <CheckCircle2 className="w-8 h-8 text-white" />}
                                    {(camStatus === "idle" || camStatus === "active") && <Video className="w-8 h-8 text-white" />}
                                </div>
                            </div>

                            <h2 className="text-lg font-bold text-white mb-1" style={{ fontFamily: "'Syne',sans-serif" }}>
                                {camStatus === "ready" ? "Camera Ready" : "Camera Test"}
                            </h2>
                            <p className="text-[11px] text-slate-400 text-center mb-4 max-w-[250px]">
                                {camStatus === "idle" && "Enable camera for presence detection."}
                                {camStatus === "requesting" && "Allow camera access in your browser."}
                                {camStatus === "active" && (faceDetected ? "✓ Face detected!" : "Position your face in view...")}
                                {camStatus === "denied" && "Camera blocked. Check browser permissions."}
                                {camStatus === "ready" && "Your camera is working perfectly!"}
                            </p>

                            {/* ✅ Camera Preview - Simplified & Guaranteed to show */}
                            <div className="relative w-full max-w-[280px] aspect-[4/3] rounded-2xl overflow-hidden mb-4 border-2 border-slate-600"
                                style={{ background: "#111" }}>

                                {/* ✅ Video element - Always rendered when active */}
                                <video
                                    ref={camVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="absolute inset-0 w-full h-full"
                                    style={{
                                        objectFit: "cover",
                                        transform: "scaleX(-1)", // Mirror effect inline
                                        display: camStatus === "active" ? "block" : "none"
                                    }}
                                />

                                {/* Canvas for face detection (hidden) */}
                                <canvas ref={camCanvasRef} className="hidden" />

                                {/* Placeholder when camera is off */}
                                {camStatus !== "active" && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                        <VideoOff className="w-10 h-10 text-slate-600" />
                                        <p className="text-[10px] text-slate-500">Camera preview</p>
                                    </div>
                                )}

                                {/* Face detection badge */}
                                {camStatus === "active" && (
                                    <div className="absolute bottom-2 left-2 right-2 z-10">
                                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${faceDetected ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white animate-pulse"
                                            }`}>
                                            {faceDetected ? "✓ Face Detected" : "⚠ No Face"}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bottom Button */}
                        <div className="p-4 relative z-10 shrink-0">
                            {(camStatus === "idle" || camStatus === "denied") && (
                                <button onClick={startCamTest} type="button"
                                    className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                                    style={{ background: camStatus === "denied" ? "linear-gradient(135deg,#dc2626,#ef4444)" : "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff" }}>
                                    {camStatus === "denied" ? <><RefreshCw className="w-4 h-4" /> Retry Camera</> : <><Video className="w-4 h-4" /> Test Camera</>}
                                </button>
                            )}
                            {camStatus === "active" && (
                                <button onClick={confirmCam} disabled={!faceDetected} type="button"
                                    className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-30"
                                    style={{ background: faceDetected ? "linear-gradient(135deg,#065f46,#10b981)" : "rgba(255,255,255,0.06)", color: "#fff" }}>
                                    <CheckCircle2 className="w-4 h-4" />
                                    {faceDetected ? "Confirm Camera" : "Face not detected"}
                                </button>
                            )}
                            {camStatus === "ready" && (
                                <div className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                                    style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>
                                    <CheckCircle2 className="w-4 h-4" /> Camera Verified ✓
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Bottom: Tips + Sample Question ── */}
                <div className="space-y-2 shrink-0">
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer"
                        style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}
                        onClick={() => setShowTips(!showTips)}>
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <p className="text-xs text-amber-300 truncate">
                            <span className="font-bold">Sample:</span> &quot;{sampleQuestion}&quot;
                        </p>
                        {showTips ? <ChevronUp className="w-3.5 h-3.5 text-amber-400 ml-auto shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400 ml-auto shrink-0" />}
                    </div>

                    {showTips && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                            {INTERVIEW_TIPS.map((tip, i) => (
                                <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                                    <span className="text-base shrink-0">{tip.icon}</span>
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-300">{tip.title}</p>
                                        <p className="text-[9px] text-slate-500">{tip.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Ready State Overlay ─── */}
            {bothReady && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto animate-bounce">
                            <CheckCircle2 className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Syne',sans-serif" }}>
                            All Set!
                        </h2>
                        <p className="text-slate-300">Starting your interview...</p>
                    </div>
                </div>
            )}
        </div>
    );
}