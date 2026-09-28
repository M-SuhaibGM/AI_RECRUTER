"use client";
import React, { useState, useEffect, useRef, JSX } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, PlayCircle, Sparkles, Mic,
  BarChart3, Users, X, ArrowRight, Zap,
  Shield, Globe, ChevronRight, Bot,
  Menu, // ← add
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image"; // Imported Next.js Image component

/* ═══════════════════════════════════════════
   GLOBAL STYLES (Injected safely)
═══════════════════════════════════════════ */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  :root {
    --blue:     #2563eb;
    --blue-d:   #1d4ed8;
    --blue-l:   #3b82f6;
    --indigo:   #4f46e5;
    --sky:      #0ea5e9;
    --text:     #0c0f1a;
    --text2:    #374151;
    --muted:    #6b7280;
    --pale:     #eff6ff;
    --border:   rgba(0,0,0,.08);
  }

  html { scroll-behavior: smooth; }

  /* ── Scrollbar ── */
  * { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
  *::-webkit-scrollbar { width: 4px; }
  *::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }

  /* ── Keyframes ── */
  @keyframes rise         { from{opacity:0;transform:translateY(36px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fade         { from{opacity:0} to{opacity:1} }
  @keyframes float-card  { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-12px) rotate(.4deg)} }
  @keyframes orb-drift-a { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(60px,-50px) scale(1.12)} 70%{transform:translate(-30px,40px) scale(.95)} }
  @keyframes orb-drift-b { 0%,100%{transform:translate(0,0) scale(1)} 35%{transform:translate(-80px,60px) scale(1.15)} 70%{transform:translate(50px,-30px) scale(.9)} }
  @keyframes orb-drift-c { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,70px) scale(1.1)} }
  @keyframes dot-pulse   { 0%,100%{opacity:.25} 50%{opacity:.55} }
  @keyframes shimmer     { 0%{background-position:-300% center} 100%{background-position:300% center} }
  @keyframes scan-line   { 0%{top:0%;opacity:.6} 100%{top:100%;opacity:0} }
  @keyframes spin         { to{transform:rotate(360deg)} }
  @keyframes badge-pop   { 0%{opacity:0;transform:scale(.8) translateY(8px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes line-grow   { from{width:0} to{width:100%} }
  @keyframes count-up    { from{opacity:0;transform:scale(.7)} to{opacity:1;transform:scale(1)} }
  @keyframes card-reveal { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  @keyframes glow-breath { 0%,100%{opacity:.35;transform:scale(1)} 50%{opacity:.65;transform:scale(1.08)} }

  /* ── Animation classes ── */
  .rise-1  { animation: rise .85s cubic-bezier(.16,1,.3,1) .05s both }
  .rise-2  { animation: rise .85s cubic-bezier(.16,1,.3,1) .18s both }
  .rise-3  { animation: rise .85s cubic-bezier(.16,1,.3,1) .31s both }
  .rise-4  { animation: rise .85s cubic-bezier(.16,1,.3,1) .44s both }
  .rise-5  { animation: rise .85s cubic-bezier(.16,1,.3,1) .57s both }

  .float-card { animation: float-card 6s ease-in-out infinite }
  .orb-a      { animation: orb-drift-a 20s ease-in-out infinite }
  .orb-b      { animation: orb-drift-b 26s ease-in-out infinite }
  .orb-c      { animation: orb-drift-c 16s ease-in-out infinite }
  .dot-grid   { animation: dot-pulse 7s ease-in-out infinite }
  .spin-slow  { animation: spin 14s linear infinite }
  .badge-pop  { animation: badge-pop .6s cubic-bezier(.34,1.56,.64,1) .2s both }
  .glow-breath{ animation: glow-breath 3.5s ease-in-out infinite }

  .shimmer-text {
    background: linear-gradient(90deg, #1d4ed8, #4f46e5, #0ea5e9, #2563eb, #4f46e5, #1d4ed8);
    background-size: 300% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 4s linear infinite;
  }

  .scan-el {
    position: absolute; left: 0; right: 0; height: 2px; z-index: 2;
    background: linear-gradient(90deg, transparent, rgba(37,99,235,.5), rgba(99,102,241,.5), transparent);
    animation: scan-line 3.5s linear infinite;
  }

  /* ── Reveal on scroll ── */
  .reveal       { opacity: 0; transform: translateY(28px); transition: opacity .7s ease, transform .7s cubic-bezier(.16,1,.3,1); }
  .reveal.in    { opacity: 1; transform: none; }
  .reveal-d1    { transition-delay: .1s }
  .reveal-d2    { transition-delay: .2s }
  .reveal-d3    { transition-delay: .3s }
  .reveal-d4    { transition-delay: .4s }
  .reveal-d5    { transition-delay: .5s }
  .reveal-d6    { transition-delay: .6s }

  /* ── Cards ── */
  .card {
    background: #fff;
    border: 1px solid rgba(0,0,0,.07);
    box-shadow: 0 2px 8px rgba(0,0,0,.04), 0 0 0 0 rgba(37,99,235,0);
    transition: transform .3s ease, box-shadow .3s ease, border-color .3s ease;
  }
  .card:hover {
    transform: translateY(-5px);
    border-color: rgba(37,99,235,.22);
    box-shadow: 0 16px 48px rgba(37,99,235,.11), 0 4px 12px rgba(0,0,0,.05);
  }

  /* ── Buttons ── */
  .btn-blue {
    background: linear-gradient(135deg, #1d4ed8, #3b82f6);
    color: #fff;
    border: 1px solid rgba(37,99,235,.25);
    box-shadow: 0 4px 20px rgba(37,99,235,.38), inset 0 1px 0 rgba(255,255,255,.15);
    transition: all .22s ease;
    font-family: 'Instrument Sans', sans-serif;
    font-weight: 600;
  }
  .btn-blue:hover  { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(37,99,235,.5); }
  .btn-blue:active { transform: scale(.97); }

  .btn-outline {
    background: #fff;
    color: #1e293b;
    border: 1.5px solid rgba(0,0,0,.1);
    box-shadow: 0 2px 6px rgba(0,0,0,.05);
    transition: all .22s ease;
    font-family: 'Instrument Sans', sans-serif;
    font-weight: 600;
  }
  .btn-outline:hover { border-color: rgba(37,99,235,.35); box-shadow: 0 4px 16px rgba(37,99,235,.12); }

  /* ── Nav links ── */
  .nlink {
    font-family: 'Instrument Sans', sans-serif;
    font-size: .83rem; font-weight: 500; color: #4b5563;
    position: relative; transition: color .2s;
    padding-bottom: 2px;
  }
  .nlink::after {
    content:''; position:absolute; bottom:0; left:0; right:0; height:1.5px;
    background: linear-gradient(90deg,#2563eb,#4f46e5);
    transform: scaleX(0); transform-origin: left;
    transition: transform .25s cubic-bezier(.16,1,.3,1);
    border-radius: 2px;
  }
  .nlink:hover { color: #2563eb; }
  .nlink:hover::after { transform: scaleX(1); }

  /* ── Stat counter ── */
  .stat-big {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 2.8rem; font-weight: 800; line-height: 1;
    background: linear-gradient(135deg, #1d4ed8, #4f46e5);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    animation: count-up .8s cubic-bezier(.34,1.56,.64,1) both;
  }

  /* ── Pricing highlight ── */
  .plan-popular {
    background: linear-gradient(155deg, #eff6ff, #eef2ff);
    border: 2px solid rgba(37,99,235,.28);
    box-shadow: 0 0 0 5px rgba(37,99,235,.05), 0 16px 48px rgba(37,99,235,.14);
  }

  /* ── Hero underline accent ── */
  .hero-line {
    position: relative; display: inline-block;
  }
  .hero-line::after {
    content:''; position:absolute; bottom:-4px; left:0; right:0; height:3px;
    background: linear-gradient(90deg, #2563eb, #4f46e5);
    border-radius: 3px;
    animation: line-grow .9s cubic-bezier(.16,1,.3,1) .7s both;
  }
`;

/* ═══════════════════════════════════════════
   TYPES & INTERFACES
═══════════════════════════════════════════ */
interface Feature {
  icon: JSX.Element;
  c: string;
  bg: string;
  b: string;
  t: string;
  d: string;
}

interface Stat {
  n: string;
  l: string;
}

interface Plan {
  name: string;
  price: string;
  mo: string;
  feats: string[];
  cta: string;
  pop: boolean;
  contact: boolean;
}

/* ═══════════════════════════════════════════
   HELPERS / CUSTOM HOOKS
═══════════════════════════════════════════ */
function useReveal() {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in");
        });
      },
      { threshold: 0.12 }
    );

    el.querySelectorAll(".reveal").forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, []);

  return ref;
}

/* ═══════════════════════════════════════════
   DATA
═══════════════════════════════════════════ */
const FEATURES: Feature[] = [
  { icon: <Mic className="w-5 h-5" />, c: "#2563eb", bg: "#eff6ff", b: "rgba(37,99,235,.14)", t: "AI Voice Interviews", d: "Natural agents that probe technical knowledge across every domain — with human-like follow-up questions and pacing." },
  { icon: <BarChart3 className="w-5 h-5" />, c: "#4f46e5", bg: "#eef2ff", b: "rgba(79,70,229,.14)", t: "Instant Analytics", d: "Scored feedback on communication, sentiment, and accuracy delivered seconds after the call ends." },
  { icon: <Users className="w-5 h-5" />, c: "#0891b2", bg: "#ecfeff", b: "rgba(8,145,178,.14)", t: "Bias-Free Hiring", d: "Consistent, objective evaluation — every candidate assessed on the same standardised rubric." },
  { icon: <Globe className="w-5 h-5" />, c: "#059669", bg: "#ecfdf5", b: "rgba(5,150,105,.14)", t: "Multi-Language", d: "Fluent interviews in English, Hindi, Urdu and dozens more. Candidates speak their strongest language." },
  { icon: <Shield className="w-5 h-5" />, c: "#d97706", bg: "#fffbeb", b: "rgba(217,119,6,.14)", t: "Enterprise Security", d: "SOC2-compliant, end-to-end encrypted. Your candidate data stays under your control at all times." },
  { icon: <Zap className="w-5 h-5" />, c: "#7c3aed", bg: "#f5f3ff", b: "rgba(124,58,237,.14)", t: "5-Minute Setup", d: "From signup to first live interview in under 5 minutes. Zero configuration, zero prompt engineering." },
];

const STATS: Stat[] = [
  { n: "40+", l: "Hours saved / week" },
  { n: "98%", l: "Candidate satisfaction" },
  { n: "3×", l: "Faster time-to-hire" },
  { n: "0", l: "Documented bias incidents" },
];

const PLANS: Plan[] = [
  { name: "Starter", price: "$0", mo: "/mo", feats: ["5 Interviews / month", "Basic AI Feedback", "Web Interface"], cta: "Get Started", pop: false, contact: false },
  { name: "Pro", price: "$49", mo: "/mo", feats: ["Unlimited Interviews", "AI Voice Agent", "Full Analytics", "Custom Questions", "Priority Support"], cta: "Upgrade Now", pop: true, contact: false },
  { name: "Enterprise", price: "Custom", mo: "", feats: ["Team Management", "API Access", "Custom Branding", "Dedicated Account Manager"], cta: "Contact Sales", pop: false, contact: true },
];

/* ═══════════════════════════════════════════
   PAGE COMPONENT
═══════════════════════════════════════════ */
export default function LandingPage(): JSX.Element {
  const router = useRouter();
  const [modal, setModal] = useState<boolean>(false);
  const [mobileMenu, setMobileMenu] = useState<boolean>(false);
  const { status } = useSession();
  const heroRef = useRef<HTMLDivElement | null>(null);

  const s1 = useReveal(),
    s2 = useReveal(),
    s3 = useReveal();

  const go = (): void => router.push(status === "authenticated" ? "/dashboard" : "/auth/login");

  // Type definitions for interactive dynamic hover references
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>): void => {
    e.currentTarget.style.color = "#fff";
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>): void => {
    e.currentTarget.style.color = "#6b7280";
  };

  return (
    <>
      <style>{STYLES}</style>

      <div style={{ background: "#f8fafc", color: "#0c0f1a", fontFamily: "'Instrument Sans',sans-serif", minHeight: "100vh" }}>

        {/* ░░ BG CANVAS ░░ */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="orb-a absolute -top-[15%] -left-[8%] w-[55%] h-[55%] rounded-full"
            style={{ background: "radial-gradient(circle,rgba(37,99,235,.1) 0%,transparent 70%)", filter: "blur(90px)" }} />
          <div className="orb-b absolute -bottom-[15%] -right-[8%] w-[60%] h-[60%] rounded-full"
            style={{ background: "radial-gradient(circle,rgba(79,70,229,.09) 0%,transparent 70%)", filter: "blur(100px)" }} />
          <div className="orb-c absolute top-[35%] right-[25%] w-[35%] h-[35%] rounded-full"
            style={{ background: "radial-gradient(circle,rgba(14,165,233,.07) 0%,transparent 70%)", filter: "blur(70px)" }} />
          <div className="dot-grid absolute inset-0"
            style={{ backgroundImage: "radial-gradient(circle,rgba(100,116,139,.3) 1px,transparent 1px)", backgroundSize: "42px 42px" }} />
        </div>

        {/* ░░ NAVBAR ░░ */}
        {/* ░░ NAVBAR ░░ */}
        <header className="sticky top-0 z-50"
          style={{ background: "rgba(248,250,252,.92)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(0,0,0,.07)" }}>
          <div className="max-w-7xl mx-auto flex h-[62px] items-center justify-between px-4 sm:px-6 md:px-10">

            {/* Logo */}
            <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => router.push("/")}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", boxShadow: "0 4px 14px rgba(37,99,235,.35)" }}>
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-.01em", color: "#0c0f1a" }}>
                <span style={{ color: "#2563eb" }}>AI</span>Recruiter
              </span>
            </div>

            {/* Desktop nav links */}
            <nav className="hidden md:flex items-center gap-9">
              {[["#features", "Features"], ["#pricing", "Pricing"], ["#whatsnew", "What's New"]].map(([h, l]) => (
                <a key={h} href={h} className="nlink">{l}</a>
              ))}
            </nav>

            {/* Desktop auth buttons */}
            <div className="hidden md:flex items-center gap-2.5">
              {status === "loading" ? (
                <><Skeleton className="h-9 w-18 rounded-xl bg-slate-200" /><Skeleton className="h-9 w-28 rounded-xl bg-slate-200" /></>
              ) : (
                <>
                  <button className="btn-outline px-4 py-2 rounded-xl text-sm" onClick={go}>
                    {status === "authenticated" ? "Dashboard" : "Sign in"}
                  </button>
                  {status !== "authenticated" && (
                    <button className="btn-blue px-4 py-2 rounded-xl text-sm flex items-center gap-1.5" onClick={go}>
                      Get Started <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Mobile: compact CTA + hamburger */}
            <div className="flex md:hidden items-center gap-2">
              {status === "loading" ? (
                <Skeleton className="h-9 w-20 rounded-xl bg-slate-200" />
              ) : status !== "authenticated" ? (
                <button className="btn-blue px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5" onClick={go}>
                  Get Started <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <button className="btn-outline px-3.5 py-2 rounded-xl text-xs" onClick={go}>
                  Dashboard
                </button>
              )}
              <button
                aria-label="Toggle menu"
                aria-expanded={mobileMenu}
                onClick={() => setMobileMenu((v) => !v)}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
                style={{ border: "1.5px solid rgba(0,0,0,.1)", background: "#fff", color: "#0c0f1a" }}
              >
                {mobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mobile dropdown panel */}
          {mobileMenu && (
            <div className="md:hidden border-t" style={{ borderColor: "rgba(0,0,0,.07)", background: "#fff" }}>
              <nav className="flex flex-col px-5 py-3">
                {[["#features", "Features"], ["#pricing", "Pricing"], ["#whatsnew", "What's New"]].map(([h, l]) => (
                  <a
                    key={h}
                    href={h}
                    onClick={() => setMobileMenu(false)}
                    className="py-3.5 text-sm font-medium border-b last:border-b-0"
                    style={{ color: "#374151", borderColor: "rgba(0,0,0,.05)" }}
                  >
                    {l}
                  </a>
                ))}

                <div className="pt-4 pb-2 flex flex-col gap-2.5">
                  <button
                    className="btn-outline w-full py-3 rounded-xl text-sm"
                    onClick={() => { setMobileMenu(false); go(); }}
                  >
                    {status === "authenticated" ? "Go to Dashboard" : "Sign in"}
                  </button>
                  {status !== "authenticated" && (
                    <button
                      className="btn-blue w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                      onClick={() => { setMobileMenu(false); go(); }}
                    >
                      Get Started <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </nav>
            </div>
          )}
        </header>

        {/* ░░ HERO ░░ */}
        <section ref={heroRef} className="relative z-10 pt-20 pb-28 md:pt-28 md:pb-36 text-center">
          <div className="max-w-7xl mx-auto px-6 md:px-10">

            {/* pill badge */}
            <div className="badge-pop inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
              style={{ background: "#eff6ff", border: "1px solid rgba(37,99,235,.25)", boxShadow: "0 2px 12px rgba(37,99,235,.12)" }}>
              <Sparkles className="w-3.5 h-3.5 text-blue-600 spin-slow" />
              <span className="text-[11px] font-bold uppercase tracking-[.22em] text-blue-700">Next-Gen AI Hiring Platform</span>
            </div>

            {/* headline */}
            <h1 className="rise-1 mb-6"
              style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "clamp(2.6rem,6vw,5.5rem)", lineHeight: 1.04, letterSpacing: "-.03em", color: "#0c0f1a" }}>
              Hire Smarter.<br />
              <span className="shimmer-text">Interview Faster.</span>
            </h1>

            <p className="rise-2 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
              style={{ color: "#4b5563", fontWeight: 400 }}>
              AI voice agents that screen candidates 24/7 — with <strong style={{ color: "#1d4ed8", fontWeight: 600 }}>zero bias</strong>, instant feedback,
              and conversations that feel genuinely human.
            </p>

            {/* CTA row */}
            <div className="rise-3 flex flex-col sm:flex-row items-center justify-center gap-3 mb-20">
              <button className="btn-blue px-8 py-3.5 rounded-2xl text-[.93rem] flex items-center gap-2" onClick={go}>
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </button>
              <a href="/demo.mp4" target="_blank" rel="noopener noreferrer">
                <button className="btn-outline px-8 py-3.5 rounded-2xl text-[.93rem] flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-blue-600" /> Watch Demo
                </button>
              </a>
            </div>

            {/* Dashboard mockup */}
            <div className="rise-4 float-card relative mx-auto max-w-5xl">
              {/* halo glow */}
              <div className="glow-breath absolute -inset-6 rounded-[3rem]"
                style={{ background: "radial-gradient(ellipse,rgba(37,99,235,.18) 0%,rgba(79,70,229,.1) 50%,transparent 75%)", filter: "blur(32px)" }} />
              <div className="relative rounded-3xl overflow-hidden"
                style={{ border: "1.5px solid rgba(37,99,235,.15)", background: "#fff", boxShadow: "0 32px 80px rgba(0,0,0,.14),0 2px 8px rgba(0,0,0,.06)" }}>
                <div className="scan-el" />
                {/* fake browser chrome */}
                <div className="flex items-center gap-1.5 px-5 py-3.5 border-b"
                  style={{ borderColor: "rgba(0,0,0,.06)", background: "#f1f5f9" }}>
                  {["#ef4444", "#f59e0b", "#22c55e"].map((c, i) => (
                    <div key={i} className="w-3 h-3 rounded-full" style={{ background: c, opacity: .75 }} />
                  ))}
                  <div className="flex-1 flex justify-center">
                    <div className="h-5 w-52 rounded-full flex items-center justify-center gap-1.5 px-3"
                      style={{ background: "#e2e8f0" }}>
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span style={{ fontSize: "9px", color: "#64748b", fontFamily: "'JetBrains Mono',monospace" }}>airecruiter.app/dashboard</span>
                    </div>
                  </div>
                </div>
                {/* Fixed line 396: Replaced <img> with optimized Next.js <Image /> */}
                <Image
                  src="/dashboard.jpeg"
                  alt="Dashboard"
                  width={1200}
                  height={675}
                  className="w-full h-auto block"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* ░░ STATS ░░ */}
        <section ref={s1} className="relative z-10"
          style={{ background: "#fff", borderTop: "1px solid rgba(0,0,0,.06)", borderBottom: "1px solid rgba(0,0,0,.06)" }}>
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-14">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {STATS.map((s, i) => (
                <div key={i} className={`reveal reveal-d${i + 1} card rounded-2xl p-7 text-center`}>
                  <div className="stat-big">{s.n}</div>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: "#9ca3af", fontFamily: "'JetBrains Mono',monospace" }}>{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ░░ FEATURES ░░ */}
        <section id="features" ref={s2} className="relative z-10 py-28">
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <div className="reveal text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5"
                style={{ background: "#eff6ff", border: "1px solid rgba(37,99,235,.2)" }}>
                <span className="text-[10px] font-bold uppercase tracking-[.28em] text-blue-600">Platform Capabilities</span>
              </div>
              <h2 className="mb-4"
                style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "clamp(1.8rem,3.5vw,3rem)", letterSpacing: "-.025em", lineHeight: 1.15, color: "#0c0f1a" }}>
                Everything you need<br />
                <span style={{ color: "#2563eb" }}>to scale your hiring</span>
              </h2>
              <p className="text-base max-w-lg mx-auto" style={{ color: "#6b7280" }}>
                One integrated platform — every tool a modern recruiting team depends on.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((f, i) => (
                <div key={i} className={`reveal reveal-d${(i % 3) + 1} card rounded-2xl p-6 flex flex-col gap-4`}>
                  <div className="w-11 h-11 flex items-center justify-center rounded-xl shrink-0"
                    style={{ background: f.bg, color: f.c, border: `1px solid ${f.b}` }}>
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-[1rem] mb-2 leading-snug"
                      style={{ fontFamily: "'Bricolage Grotesque',sans-serif", color: "#0c0f1a" }}>{f.t}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>{f.d}</p>
                  </div>
                  <div className="mt-auto flex items-center gap-1 text-xs font-semibold" style={{ color: f.c }}>
                    Learn more <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ░░ CTA BANNER ░░ */}
        <section id="whatsnew" className="relative z-10 py-10">
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <div className="relative rounded-3xl overflow-hidden p-12 md:p-20 text-center"
              style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 40%,#4f46e5 100%)", boxShadow: "0 24px 64px rgba(37,99,235,.35)" }}>
              <div className="scan-el" />
              {/* subtle mesh */}
              <div className="absolute inset-0 opacity-[.06]"
                style={{ backgroundImage: "radial-gradient(circle,rgba(255,255,255,.7) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
              <p className="relative text-[10px] font-bold uppercase tracking-[.32em] text-blue-300 mb-5">Limited Time Offer</p>
              <h2 className="relative text-3xl md:text-5xl font-black text-white mb-4 leading-tight"
                style={{ fontFamily: "'Bricolage Grotesque',sans-serif", letterSpacing: "-.02em" }}>
                First 5 interviews<br /><span style={{ color: "#bfdbfe" }}>completely free.</span>
              </h2>
              <p className="relative text-base text-blue-200 mb-9 max-w-sm mx-auto">
                No credit card. No setup fees. Ready in 5 minutes.
              </p>
              <button onClick={go}
                className="relative inline-flex items-center gap-2 px-9 py-4 rounded-2xl font-bold text-blue-800 text-[.93rem] transition-all hover:scale-105 active:scale-97"
                style={{ background: "#fff", boxShadow: "0 6px 24px rgba(0,0,0,.2)", fontFamily: "'Instrument Sans',sans-serif" }}>
                Start for Free <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ░░ PRICING ░░ */}
        <section id="pricing" ref={s3} className="relative z-10 py-28"
          style={{ background: "#fff" }}>
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <div className="reveal text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5"
                style={{ background: "#eff6ff", border: "1px solid rgba(37,99,235,.2)" }}>
                <span className="text-[10px] font-bold uppercase tracking-[.28em] text-blue-600">Pricing</span>
              </div>
              <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "clamp(1.8rem,3.5vw,3rem)", letterSpacing: "-.025em", color: "#0c0f1a" }}>
                Simple, transparent pricing
              </h2>
              <p className="mt-3 text-base" style={{ color: "#6b7280" }}>No hidden fees. Upgrade or cancel any time.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
              {PLANS.map((p, i) => (
                <div key={i}
                  className={`reveal reveal-d${i + 1} relative flex flex-col rounded-3xl p-8 ${p.pop ? "plan-popular" : "card"} ${p.pop ? "md:-translate-y-5" : ""}`}>
                  {p.pop && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white"
                      style={{ background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", boxShadow: "0 4px 14px rgba(37,99,235,.4)" }}>
                      Most Popular
                    </div>
                  )}
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9ca3af", fontFamily: "'JetBrains Mono',monospace" }}>{p.name}</p>
                  <div className="flex items-end gap-1 mb-7">
                    <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "2.8rem", lineHeight: 1, color: "#0c0f1a" }}>{p.price}</span>
                    <span className="mb-1 text-sm" style={{ color: "#9ca3af" }}>{p.mo}</span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {p.feats.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "#374151" }}>
                        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: p.pop ? "#2563eb" : "#9ca3af" }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => p.contact ? setModal(true) : go()}
                    className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all ${p.pop ? "btn-blue" : "btn-outline"}`}>
                    {p.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ░░ FOOTER ░░ */}
        <footer className="relative z-10 py-16 px-6 md:px-10"
          style={{ background: "#0c0f1a", borderTop: "1px solid rgba(255,255,255,.06)" }}>
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between gap-12 pb-12 mb-10"
              style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              <div className="max-w-xs">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)" }}>
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, color: "#f8fafc", fontSize: "1.05rem" }}>
                    <span style={{ color: "#60a5fa" }}>AI</span>Recruiter
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>
                  Empowering modern HR teams with intelligent AI voice hiring.
                </p>
              </div>
              <div className="flex gap-16 text-sm">
                {[
                  ["Platform", [["#features", "Features"], ["#pricing", "Pricing"]]],
                  ["Company", [["#", "About"], ["c", "Contact"]]]
                ].map(([title, links]) => (
                  <div key={title as string}>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-5"
                      style={{ color: "#4b5563", fontFamily: "'JetBrains Mono',monospace" }}>{title as string}</p>
                    <div className="space-y-3">
                      {(links as [string, string][]).map(([h, l]) => (
                        h === "c"
                          ? <button key={l} onClick={() => setModal(true)} className="block text-sm transition-colors"
                            style={{ color: "#6b7280" }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>{l}</button>
                          : <a key={l} href={h} className="block text-sm transition-colors"
                            style={{ color: "#6b7280" }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>{l}</a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs" style={{ color: "#374151" }}>
              <p style={{ fontFamily: "'JetBrains Mono',monospace" }}>© {new Date().getFullYear()} AIRecruiter Inc. — All rights reserved.</p>
              <div className="flex gap-6">
                {["Privacy", "Terms"].map((t) => (
                  <a key={t} href="#" className="transition-colors hover:text-white">{t}</a>
                ))}
              </div>
            </div>
          </div>
        </footer>

        {/* ░░ CONTACT MODAL ░░ */}
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(12,15,26,.55)" }}
              onClick={() => setModal(false)} />
            <div className="relative w-full max-w-sm rounded-3xl p-8 bg-white"
              style={{ border: "1px solid rgba(0,0,0,.08)", boxShadow: "0 40px 80px rgba(0,0,0,.22)" }}>
              <div className="h-1 w-full rounded-full mb-7"
                style={{ background: "linear-gradient(90deg,#1d4ed8,#4f46e5)" }} />
              <button onClick={() => setModal(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50"
                style={{ color: "#9ca3af" }}>
                <X className="w-4 h-4" />
              </button>
              {/* Fixed line 598: Escaped apostrophe inside "Let's Talk" */}
              <h2 className="mb-1.5" style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "#0c0f1a" }}>Let&apos;s Talk</h2>
              <p className="text-sm mb-7" style={{ color: "#6b7280" }}>
                Reach out on X (Twitter) for fast responses or enterprise deals.
              </p>
              <a href="https://twitter.com/vipinSao1" target="_blank" rel="noopener noreferrer">
                <button className="btn-blue w-full py-3.5 rounded-xl text-sm flex items-center justify-center gap-2">
                  Message @vipinSao1 <ArrowRight className="w-4 h-4" />
                </button>
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}