"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import InterviewCard from "./interviewCard";
import { RefreshCw, Sparkles } from "lucide-react";

interface Interview {
  id: string;
  jobPosition?: string;
  duration?: number | string;
  createdAt?: string;
  interviewLink?: string;
  _count?: { candidates: number };
}

interface Props {
  initialInterviews: Interview[];
}

export default function DashboardClient({ initialInterviews }: Props) {
  const router = useRouter();
  const [interviews, setInterviews] = useState<Interview[]>(initialInterviews);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync when server data changes (after router.refresh())
  useEffect(() => {
    setInterviews(initialInterviews);
  }, [initialInterviews]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    router.refresh(); // Re-fetches server data
    setTimeout(() => setIsRefreshing(false), 500);
  }, [router]);

  // Listen for credits updates to refresh
  useEffect(() => {
    const handler = () => router.refresh();
    window.addEventListener("credits-updated", handler);
    return () => window.removeEventListener("credits-updated", handler);
  }, [router]);

  const totalCandidates = interviews.reduce(
    (acc, i) => acc + (i?._count?.candidates || 0),
    0
  );

  return (
    <>
      {/* Quick Stats & Refresh */}
      <div className="flex items-center gap-3 mb-4">
        {interviews.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-white px-3 py-2 rounded-lg border shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>
              <span className="font-bold text-slate-700">{totalCandidates}</span> Total Candidates
            </span>
          </div>
        )}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Refresh interviews"
        >
          <RefreshCw className={`w-4 h-4 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Grid — no loading state needed, data is here */}
      {interviews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {interviews.map((interview, index) => (
            <InterviewCard
              key={interview.id}
              interview={interview}
              index={index}
              candidateCount={interview?._count?.candidates || 0}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-600 mb-1">No interviews yet</h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            Create your first AI-powered interview and start screening candidates automatically.
          </p>
        </div>
      )}
    </>
  );
}