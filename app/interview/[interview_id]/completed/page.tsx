"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Clock, Mail, Star, Sparkles } from "lucide-react";

// ─── Type Definitions ───
interface ConfettiPiece {
  id: number;
  color: string;
  left: string;
  delay: string;
  size: number;
}

interface Step {
  icon: React.ReactNode;
  label: string;
  bg: string;
  color: string;
  cls: string;
}

interface ConfettiProps {
  pieces: ConfettiPiece[];
}

// ─── Styles ───
const STYLES: string = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

  @keyframes page-in {
    from { opacity:0; transform:scale(.96) translateY(16px); }
    to   { opacity:1; transform:scale(1)   translateY(0); }
  }
  @keyframes check-pop {
    0%   { transform:scale(0) rotate(-20deg); opacity:0; }
    70%  { transform:scale(1.15) rotate(4deg); opacity:1; }
    100% { transform:scale(1) rotate(0deg); opacity:1; }
  }
  @keyframes ring-expand {
    0%   { transform:scale(.6); opacity:.8; }
    100% { transform:scale(2);  opacity:0;  }
  }
  @keyframes orb-1 {
    0%,100% { transform:translate(0,0) scale(1); }
    50%     { transform:translate(40px,-30px) scale(1.1); }
  }
  @keyframes orb-2 {
    0%,100% { transform:translate(0,0) scale(1); }
    50%     { transform:translate(-50px,40px) scale(1.15); }
  }
  @keyframes float-up {
    from { opacity:0; transform:translateY(20px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes star-spin {
    from { transform:rotate(0deg) scale(1); }
    50%  { transform:rotate(180deg) scale(1.2); }
    to   { transform:rotate(360deg) scale(1); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes confetti-fall {
    0%   { transform:translateY(-10px) rotate(0deg); opacity:1; }
    100% { transform:translateY(80px) rotate(720deg); opacity:0; }
  }
  @keyframes progress-fill {
    from { width:0%; }
    to   { width:100%; }
  }
  @keyframes dot-grid-pulse {
    0%,100% { opacity:.03; }
    50%     { opacity:.07; }
  }
  @keyframes badge-glow {
    0%,100% { box-shadow: 0 0 8px rgba(52,211,153,.3); }
    50%     { box-shadow: 0 0 20px rgba(52,211,153,.6); }
  }
  @keyframes score-count-up {
    from { opacity:0; transform:translateY(10px); }
    to   { opacity:1; transform:translateY(0); }
  }

  .page-in    { animation: page-in .7s cubic-bezier(.16,1,.3,1) both; }
  .check-pop  { animation: check-pop .6s cubic-bezier(.34,1.56,.64,1) .3s both; }
  .ring-1     { animation: ring-expand 2s ease-out .4s infinite; }
  .ring-2     { animation: ring-expand 2s ease-out .8s infinite; }
  .orb-1-anim { animation: orb-1 16s ease-in-out infinite; }
  .orb-2-anim { animation: orb-2 20s ease-in-out infinite; }
  .star-anim  { animation: star-spin 4s linear infinite; }
  .dot-pulse  { animation: dot-grid-pulse 8s ease-in-out infinite; }
  .badge-glow { animation: badge-glow 2s ease-in-out infinite; }

  .step-1 { animation: float-up .5s ease .5s  both; }
  .step-2 { animation: float-up .5s ease .65s both; }
  .step-3 { animation: float-up .5s ease .8s  both; }

  .shimmer-text {
    background: linear-gradient(90deg, #60a5fa 0%, #a78bfa 30%, #34d399 60%, #60a5fa 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 3s linear infinite;
  }

  .progress-bar { animation: progress-fill 1.8s cubic-bezier(.16,1,.3,1) .6s both; }
  .score-anim { animation: score-count-up .6s ease-out .8s both; }

  .confetti-piece {
    position: absolute;
    border-radius: 1px;
    animation: confetti-fall 1.5s ease-out forwards;
  }

  .glass-dark {
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.08);
    backdrop-filter: blur(20px);
  }

  .card-scroll::-webkit-scrollbar { width: 0px; }
  .card-scroll { scrollbar-width: none; }
`;

// ─── Constants ───
const CONFETTI_COLORS: string[] = ["#60a5fa", "#a78bfa", "#34d399", "#f472b6", "#fbbf24"];

const STEPS: Step[] = [
  {
    icon: <Mail className="w-3.5 h-3.5" />,
    label: "Feedback report sent to your email",
    bg: "rgba(59,130,246,.12)",
    color: "#60a5fa",
    cls: "step-1",
  },
  {
    icon: <Clock className="w-3.5 h-3.5" />,
    label: "Recruiter reviews within 3–5 business days",
    bg: "rgba(251,191,36,.1)",
    color: "#fbbf24",
    cls: "step-2",
  },
  {
    icon: <Star className="w-3.5 h-3.5" />,
    label: "Next steps shared via email",
    bg: "rgba(167,139,250,.12)",
    color: "#a78bfa",
    cls: "step-3",
  },
];

// ─── Confetti Component ───
function Confetti({ pieces }: ConfettiProps): React.ReactElement {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((p: ConfettiPiece) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            top: "-10px",
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───
export default function CompletedPage(): React.ReactElement {
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[] | null>(null);
  const [showScore, setShowScore] = useState<boolean>(false);

  useEffect(() => {
    // Generate confetti pieces client-side only
    const pieces: ConfettiPiece[] = Array.from({ length: 24 }, (_, i: number) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: `${5 + Math.random() * 90}%`,
      delay: `${Math.random() * 0.9}s`,
      size: Math.round(4 + Math.random() * 7),
    }));
    
    setConfettiPieces(pieces);
    setShowScore(true);
    
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => setConfettiPieces(null), 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style>{STYLES}</style>

      <div
        className="h-screen overflow-hidden flex items-center justify-center px-4 relative"
        style={{ background: "#020817", fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* ── Animated background ── */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="orb-1-anim absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(37,99,235,.16) 0%, transparent 70%)",
              filter: "blur(70px)",
            }}
          />
          <div
            className="orb-2-anim absolute bottom-[-20%] right-[-10%] w-[55%] h-[55%] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(99,102,241,.13) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            className="absolute top-[20%] left-[30%] w-[40%] h-[40%] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(16,185,129,.06) 0%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
          <div
            className="dot-pulse absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(148,163,184,.5) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* ── Confetti ── */}
        {confettiPieces && <Confetti pieces={confettiPieces} />}

        {/* ── Card ── */}
        <div className="page-in relative w-full max-w-md">
          <div
            className="absolute inset-0 rounded-3xl -z-10 blur-2xl"
            style={{ background: "rgba(16,185,129,.08)", transform: "scale(1.1)" }}
          />

          <div
            className="card-scroll relative rounded-3xl overflow-hidden glass-dark"
            style={{ maxHeight: "calc(100vh - 2rem)", overflowY: "auto" }}
          >
            {/* Top accent */}
            <div
              className="h-px w-full"
              style={{
                background: "linear-gradient(90deg, transparent, #10b981 40%, #34d399 60%, transparent)",
              }}
            />

            <div className="p-7 flex flex-col items-center gap-5">
              {/* ── Check icon + pulse rings ── */}
              <div className="relative flex items-center justify-center mt-1">
                <div
                  className="ring-1 absolute w-20 h-20 rounded-full"
                  style={{ border: "1px solid rgba(52,211,153,.3)" }}
                />
                <div
                  className="ring-2 absolute w-20 h-20 rounded-full"
                  style={{ border: "1px solid rgba(52,211,153,.15)" }}
                />
                <div
                  className="check-pop relative w-20 h-20 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #064e3b, #10b981)",
                    boxShadow: "0 0 48px rgba(16,185,129,.4), inset 0 1px 0 rgba(255,255,255,.18)",
                  }}
                >
                  <CheckCircle2 className="w-9 h-9 text-white" />
                </div>
              </div>

              {/* ── Live badge ── */}
              <div
                className="badge-glow flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(52,211,153,.08)",
                  border: "1px solid rgba(52,211,153,.25)",
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  style={{ boxShadow: "0 0 6px #34d399" }}
                />
                <span className="text-[9px] font-bold uppercase tracking-[.25em] text-emerald-400">
                  Session Complete
                </span>
              </div>

              {/* ── Headline ── */}
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-3 mb-1">
                  <Sparkles className="star-anim w-4 h-4 text-amber-400" />
                  <Sparkles
                    className="star-anim w-4 h-4 text-amber-400"
                    style={{ animationDelay: ".5s" }}
                  />
                </div>
                <h1
                  className="text-3xl font-black text-white leading-tight"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  Interview
                  <br />
                  <span className="shimmer-text">Completed!</span>
                </h1>
                <p className="text-sm text-slate-400 leading-relaxed max-w-[270px] mx-auto">
                  Great work! Your responses have been recorded and forwarded to
                  the recruiter at{" "}
                  <span className="text-blue-400 font-semibold">AIcruiter</span>.
                </p>
              </div>
              {/* ── Completion bar ── */}
              <div
                className="w-full rounded-2xl p-4 space-y-2"
                style={{
                  background: "rgba(255,255,255,.03)",
                  border: "1px solid rgba(255,255,255,.07)",
                }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[9px] uppercase tracking-widest text-slate-500">
                    Interview Completion
                  </span>
                  <span
                    className="text-xs font-bold text-emerald-400"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    100%
                  </span>
                </div>
                <div
                  className="h-1.5 w-full rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,.06)" }}
                >
                  <div
                    className="progress-bar h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, #059669, #34d399)",
                      boxShadow: "0 0 10px rgba(52,211,153,.5)",
                    }}
                  />
                </div>
                <p className="text-[9px] text-slate-600">
                  All questions answered successfully
                </p>
              </div>

              {/* ── What's next ── */}
              <div className="w-full space-y-2.5">
                <p className="text-[9px] uppercase tracking-[.22em] text-slate-500 font-bold">
                  What Happens Next
                </p>
                {STEPS.map((step: Step, i: number) => (
                  <div
                    key={i}
                    className={`${step.cls} flex items-center gap-3 p-3 rounded-xl`}
                    style={{
                      background: "rgba(255,255,255,.03)",
                      border: "1px solid rgba(255,255,255,.06)",
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: step.bg, color: step.color }}
                    >
                      {step.icon}
                    </div>
                    <p className="text-xs text-slate-300 leading-snug">{step.label}</p>
                    <div
                      className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: step.color, opacity: 0.4 }}
                    />
                  </div>
                ))}
              </div>

              {/* ── Good luck ── */}
              <div className="text-center space-y-0.5">
                <p
                  className="text-xs font-black uppercase tracking-[.3em]"
                  style={{ color: "#fbbf24" }}
                >
                  ✦ Best of Luck ✦
                </p>
                <p className="text-[10px] text-slate-600">We'll be in touch soon.</p>
              </div>

              {/* ── CTA ── */}
              <Link href="/dashboard" className="w-full">
                <button
                  className="group w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 hover:scale-[1.02]"
                  style={{
                    background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
                    color: "#fff",
                    boxShadow: "0 4px 24px rgba(37,99,235,.35)",
                    fontFamily: "'Syne', sans-serif",
                    letterSpacing: ".04em",
                  }}
                >
                  Back to Dashboard
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </Link>
            </div>

            {/* Bottom accent */}
            <div
              className="h-px w-full"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(16,185,129,.25) 50%, transparent)",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}