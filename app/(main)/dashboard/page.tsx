"use client";

import CreateOptions from "./_components/CreateOptions";
import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import axios, { AxiosError } from "axios";
import InterviewCard from "./_components/interviewCard";
import InterviewCardGridSkeleton from "./_components/InterviewCardGridSkeleton";
import { RefreshCw, Sparkles } from "lucide-react";

// ─── Type Definitions ───
interface Interview {
  id: string;
  jobPosition?: string;
  duration?: number | string;
  createdAt?: string | Date;
  interviewLink?: string;
  _count?: {
    candidates: number;
  };
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

interface UserSession {
  id?: string;
  email?: string;
  name?: string;
}

// ─── Main Component ───
const Dashboard: React.FC = () => {
  const [interviewList, setInterviewList] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const user: UserSession | undefined = session?.user;

  // ─── Fetch Interview List ───
  const GetInterviewList = useCallback(async (showLoader: boolean = true): Promise<void> => {
    if (showLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);
    
    try {
      const response = await axios.get<Interview[]>("/api/interviews/all");
      setInterviewList(response.data || []);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      console.error("Fetch failed:", error.message);
      
      if (error.response?.status === 401) {
        setError("Please sign in to view your interviews.");
      } else if (error.response?.status === 500) {
        setError("Server error. Please try again later.");
      } else {
        setError("Failed to load interviews. Please check your connection.");
      }
      
      setInterviewList([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // ─── Fetch data when user session becomes available ───
  useEffect(() => {
    if (user?.email) {
      GetInterviewList();
    }
  }, [user?.email, GetInterviewList]);

  // ─── Listen for credits updates to refresh interviews ───
  useEffect(() => {
    const handleCreditsUpdated = (): void => {
      GetInterviewList(false); // Silent refresh
    };

    window.addEventListener("credits-updated", handleCreditsUpdated);
    return () => {
      window.removeEventListener("credits-updated", handleCreditsUpdated);
    };
  }, [GetInterviewList]);

  // ─── Handlers ───
  const handleRetry = (): void => {
    GetInterviewList();
  };

  const handleRefresh = (): void => {
    GetInterviewList(false);
  };

  // ─── Total candidates count ───
  const totalCandidates: number = interviewList.reduce(
    (acc: number, interview: Interview) => acc + (interview?._count?.candidates || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-bold text-2xl text-slate-900">Dashboard</h2>
            {!isLoading && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-bold">
                {interviewList.length} Active
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Manage your AI-powered interviews and track candidate progress.
          </p>
        </div>

        {/* Quick Stats & Refresh */}
        <div className="flex items-center gap-3">
          {!isLoading && interviewList.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-white px-3 py-2 rounded-lg border shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>
                <span className="font-bold text-slate-700">{totalCandidates}</span> Total Candidates
              </span>
            </div>
          )}
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Refresh interviews"
            title="Refresh"
          >
            <RefreshCw 
              className={`w-4 h-4 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`} 
            />
          </button>
        </div>
      </div>

      {/* Create Options */}
      <CreateOptions />

      {/* Interview Cards Section */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">
          Recent Interviews
        </h3>

        {isLoading ? (
          /* Loading State */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InterviewCardGridSkeleton count={3} />
          </div>
        ) : error ? (
          /* Error State */
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <p className="text-gray-600 font-medium mb-2">{error}</p>
            <button
              onClick={handleRetry}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : interviewList.length > 0 ? (
          /* Interview Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {interviewList.map((interview: Interview, index: number) => (
              <InterviewCard
                key={interview.id || index}
                interview={interview}
                index={index}
                candidateCount={interview?._count?.candidates || 0}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
              <svg
                className="w-8 h-8 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-600 mb-1">
              No interviews yet
            </h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              Create your first AI-powered interview and start screening candidates automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;