"use client";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import axios from "axios";

interface AntiCheatReturn {
  tabSwitchCount: number;
  switchTimestamps: string[];
}

export function useAntiCheat(
  isInterviewActive: boolean,
  candidateId: string,
  dbTabSwitches: number
): AntiCheatReturn {
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const timestamps = useRef<string[]>([]);

  // Sync state when database value is retrieved
  useEffect(() => {
    if (dbTabSwitches) {
      setTabSwitchCount(dbTabSwitches);
    }
  }, [dbTabSwitches]);

  useEffect(() => {
    // Only track when the Vapi call is actively live
    if (!isInterviewActive) return;

    const handleVisibilityChange = (): void => {
      if (document.hidden) {
        setTabSwitchCount((prev: number) => {
          const newCount: number = prev + 1;
          
          // Stern warning alert to discourage further cheating attempts
          toast.error(`Warning: Tab switching detected (${newCount}). This incident has been flagged for HR review.`, {
            duration: 6000,
            style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fee2e2' }
          });

          // Log the tab switch to the database in real-time
          if (candidateId) {
            axios.post("/api/interview-feedback/tab-switch", {
              candidateId,
              browser: typeof navigator !== "undefined" ? navigator.userAgent : "",
              platform: typeof navigator !== "undefined" ? navigator.platform : "",
            }).catch((err: unknown) => {
              console.error("Failed to log tab switch in real-time:", err);
            });
          }

          return newCount;
        });

        // Push current timestamp to log exactly when they left
        timestamps.current.push(new Date().toISOString());
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isInterviewActive, candidateId]);

  return { tabSwitchCount, switchTimestamps: timestamps.current };
}