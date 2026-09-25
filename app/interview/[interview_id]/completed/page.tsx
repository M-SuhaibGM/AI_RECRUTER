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
  @keyframes float-up {
    from { opacity:0; transform:translateY(20px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes star-spin {
    from { transform:rotate(0deg) scale(1); }
    50%  { transform:rotate(180deg) scale(1.2); }
    to   { transform:rotate(360deg) scale(1); }
  }
  @keyframes confetti-fall {
    0%   { transform:translateY(-10px) rotate(0deg); opacity:1; }
    100% { transform:translateY(80px) rotate(720deg); opacity:0; }
  }
  @keyframes progress-fill {
    from { width:0%; }
    to   { width:100%; }
  }

  .page-in    { animation: page-in .7s cubic-bezier(.16,1,.3,1) both; }
  .check-pop  { animation: check-pop .6s cubic-bezier(.34,1.56,.64,1) .3s both; }
  .ring-1     { animation: ring-expand 2s ease-out .4s infinite; }
  .ring-2     { animation: ring-expand 2s ease-out .8s infinite; }
  .star-anim  { animation: star-spin 4s linear infinite; }

  .step-1 { animation: float-up .5s ease .5s  both; }
  .step-2 { animation: float-up .5s ease .65s both; }
  .step-3 { animation: float-up .5s ease .8s  both; }

  .progress-bar { animation: progress-fill 1.8s cubic-bezier(.16,1,.3,1) .6s both; }

  .confetti-piece {
    position: absolute;
    border-radius: 1px;
    animation: confetti-fall 1.5s ease-out forwards;
  }
`;

// ─── Constants ───
const CONFETTI_COLORS: string[] = ["#3b82f6", "#6366f1", "#8b5cf6", "#0ea5e9", "#60a5fa"];

const STEPS: Step[] = [
  {
    icon: <Mail className="w-3.5 h-3.5" />,
    label: "Feedback report sent to your email",
    bg: "rgba(59,130,246,.12)",
    color: "#2563eb",
    cls: "step-1",
  },
  {
    icon: <Clock className="w-3.5 h-3.5" />,
    label: "Recruiter reviews within 3–5 business days",
    bg: "rgba(99,102,241,.12)",
    color: "#4f46e5",
    cls: "step-2",
  },
  {
    icon: <Star className="w-3.5 h-3.5" />,
    label: "Next steps shared via email",
    bg: "rgba(139,92,246,.12)",
    color: "#7c3aed",
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

  useEffect(() => {
    const pieces: ConfettiPiece[] = Array.from({ length: 24 }, (_, i: number) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: `${5 + Math.random() * 90}%`,
      delay: `${Math.random() * 0.9}s`,
      size: Math.round(4 + Math.random() * 7),
    }));

    setConfettiPieces(pieces);
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => setConfettiPieces(null), 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style>{STYLES}</style>

      <div
        className="h-screen w-screen overflow-hidden flex items-center justify-center px-4 bg-slate-50"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* ── Subtle background ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(37,99,235,.10) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(99,102,241,.08) 0%, transparent 70%)",
              filter: "blur(90px)",
            }}
          />
        </div>

        {/* ── Confetti ── */}
        {confettiPieces && <Confetti pieces={confettiPieces} />}

        {/* ── Card ── */}
        <div className="page-in relative w-full max-w-3xl">
          <div className="relative rounded-3xl overflow-hidden bg-white shadow-2xl shadow-blue-500/10 border border-slate-200">
            {/* Top accent */}
            <div
              className="h-1.5 w-full"
              style={{ background: "linear-gradient(90deg, #1d4ed8, #3b82f6, #60a5fa)" }}
            />

            <div className="p-6 md:p-8">
              {/* ═══ 2-COLUMN GRID ═══ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">

                {/* ══ LEFT COLUMN: Success Visual ══ */}
                <div className="flex flex-col items-center text-center space-y-4">

                  {/* Check icon + pulse rings */}
                  <div className="relative flex items-center justify-center">
                    <div
                      className="ring-1 absolute w-24 h-24 rounded-full"
                      style={{ border: "1px solid rgba(37,99,235,.3)" }}
                    />
                    <div
                      className="ring-2 absolute w-24 h-24 rounded-full"
                      style={{ border: "1px solid rgba(37,99,235,.15)" }}
                    />
                    <div
                      className="check-pop relative w-24 h-24 rounded-full flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
                        boxShadow: "0 8px 40px rgba(37,99,235,.35)",
                      }}
                    >
                      <CheckCircle2 className="w-12 h-12 text-white" />
                    </div>
                  </div>

                  {/* Complete badge */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[9px] font-bold uppercase tracking-[.25em] text-blue-600">
                      Session Complete
                    </span>
                  </div>

                  {/* Headline */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="star-anim w-4 h-4 text-amber-500" />
                      <Sparkles className="star-anim w-4 h-4 text-amber-500" style={{ animationDelay: ".5s" }} />
                    </div>
                    <h1
                      className="text-3xl font-black text-slate-900 leading-tight"
                      style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                      Interview
                      <br />
                      <span className="text-blue-600">Completed!</span>
                    </h1>
                    <p className="text-sm text-slate-500 leading-relaxed max-w-[280px] mx-auto">
                      Great work! Your responses have been recorded and forwarded to the
                      recruiter at <span className="text-blue-600 font-semibold">AI Recruiter</span>.
                    </p>
                  </div>

                  {/* Completion bar */}
                  <div className="w-full max-w-xs rounded-2xl p-3 space-y-2 bg-blue-50/50 border border-blue-100">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
                        Completion
                      </span>
                      <span className="text-xs font-bold text-blue-600">100%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden bg-blue-100">
                      <div
                        className="progress-bar h-full rounded-full"
                        style={{
                          background: "linear-gradient(90deg, #1d4ed8, #60a5fa)",
                          boxShadow: "0 0 10px rgba(37,99,235,.4)",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* ══ RIGHT COLUMN: Steps + CTA ══ */}
                <div className="flex flex-col justify-center space-y-4">

                  {/* What's next */}
                  <div className="space-y-2">
                    <p className="text-[9px] uppercase tracking-[.22em] text-slate-400 font-bold">
                      What Happens Next
                    </p>
                    {STEPS.map((step: Step, i: number) => (
                      <div
                        key={i}
                        className={`${step.cls} flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100`}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: step.bg, color: step.color }}
                        >
                          {step.icon}
                        </div>
                        <p className="text-xs text-slate-600 leading-snug font-medium">
                          {step.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <Link href="/dashboard" className="w-full">
                    <button
                      className="group w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 hover:scale-[1.02] hover:shadow-lg"
                      style={{
                        background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
                        color: "#fff",
                        boxShadow: "0 4px 20px rgba(37,99,235,.3)",
                        fontFamily: "'Syne', sans-serif",
                        letterSpacing: ".04em",
                      }}
                    >
                      Back to Dashboard
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </Link>

                  {/* Best of Luck */}
                  <p
                    className="text-[10px] font-black uppercase tracking-[.3em] text-center"
                    style={{ color: "#3b82f6" }}
                  >
                    ✦ Best of Luck ✦
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom accent */}
            <div
              className="h-px w-full"
              style={{ background: "linear-gradient(90deg, transparent, rgba(37,99,235,.25) 50%, transparent)" }}
            />
          </div>
        </div>
      </div>
    </>
  );
}