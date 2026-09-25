// interview/[interview_id]/start/_components/AnimatedBackground.tsx
"use client";
import React from "react";

export function AnimatedBackground(): React.ReactElement {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <div
        className="orb-1 absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(37,99,235,.18) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="orb-2 absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,.14) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="orb-3 absolute top-[30%] right-[20%] w-[30%] h-[30%] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(6,182,212,.1) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
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
  );
}