"use client";
import React, { useEffect, useRef, useState } from "react";

// ─── Type Definitions ───
interface TimerComponentProps {
  startTimer: boolean;
  resetTimer: boolean;
}

// ─── Main Component ───
const TimerComponent: React.FC<TimerComponentProps> = ({ startTimer, resetTimer }) => {
  const [seconds, setSeconds] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRunningRef = useRef<boolean>(false);

  // ─── Reset pulse — only zeroes the counter ───
  useEffect(() => {
    if (resetTimer) {
      setSeconds(0);
    }
  }, [resetTimer]);

  // ─── Start/Stop timer ───
  useEffect(() => {
    if (startTimer && !isRunningRef.current) {
      isRunningRef.current = true;
      intervalRef.current = setInterval(() => {
        setSeconds((prev: number) => prev + 1);
      }, 1000);
    } else if (!startTimer && isRunningRef.current) {
      isRunningRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isRunningRef.current = false;
    };
  }, [startTimer]);

  // ─── Format time ───
  const formatTime = (totalSeconds: number): string => {
    const hrs: number = Math.floor(totalSeconds / 3600);
    const mins: number = Math.floor((totalSeconds % 3600) / 60);
    const secs: number = totalSeconds % 60;

    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="font-mono text-lg tabular-nums">
      {formatTime(seconds)}
    </div>
  );
};

export default TimerComponent;