"use client";
import React, { useEffect, useState, useRef } from "react";

// ─── Type Definitions ───
interface VoiceWaveformProps {
  volume?: number;
  isSpeaking?: boolean;
  className?: string;
}

interface BarState {
  height: number;
  color: string;
}

// ─── Constants ───
const BAR_COUNT: number = 9;
const UPDATE_INTERVAL: number = 80;

// ─── Main Component ───
function VoiceWaveform({ 
  volume = 0, 
  isSpeaking = false,
  className = "" 
}: VoiceWaveformProps): React.ReactElement {
  const [bars, setBars] = useState<BarState[]>(
    Array.from({ length: BAR_COUNT }, () => ({ height: 3, color: "bg-slate-300" }))
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isSpeaking) {
      // Reset to flat line
      setBars(Array.from({ length: BAR_COUNT }, () => ({ 
        height: 3, 
        color: "bg-slate-300 dark:bg-slate-600" 
      })));
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Animate bars when speaking
    intervalRef.current = setInterval(() => {
      setBars(
        Array.from({ length: BAR_COUNT }, (_: unknown, i: number) => {
          const baseHeight: number = volume * 80;
          const noise: number = Math.random() * 30;
          const shape: number = Math.sin((i / (BAR_COUNT - 1)) * Math.PI);
          const height: number = Math.max(4, Math.min(100, baseHeight * shape + noise));

          // Color based on height
          let color: string;
          if (height > 70) color = "bg-emerald-400";
          else if (height > 40) color = "bg-blue-500";
          else if (height > 15) color = "bg-indigo-400";
          else color = "bg-blue-400";

          return { height, color };
        })
      );
    }, UPDATE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isSpeaking, volume]);

  return (
    <div 
      className={`flex items-end justify-center gap-[3px] h-12 ${className}`}
      role="img" 
      aria-label={isSpeaking ? "Voice waveform active" : "Voice waveform inactive"}
    >
      {bars.map((bar: BarState, i: number) => (
        <div
          key={i}
          className={`w-1.5 rounded-full transition-all ${bar.color}`}
          style={{
            height: `${bar.height}%`,
            opacity: isSpeaking ? 0.9 : 0.4,
            transform: isSpeaking ? `scaleY(${0.8 + Math.random() * 0.4})` : "scaleY(1)",
          }}
        />
      ))}
    </div>
  );
}

export default VoiceWaveform;