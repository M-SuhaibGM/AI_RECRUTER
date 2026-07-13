"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  Video,
  RefreshCw,
  Search,
  Download,
  TrendingUp,
  Users,
  DatabaseZapIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import { useSession } from "next-auth/react";
import CandidateReviewCard from "./_components/CandidateReviewCard";
import CandidateReviewSkeleton from "./_components/loading";
import { toast } from "sonner";

// ─── Type Definitions (Matching Prisma Schema) ───
interface Candidate {
  id: string;
  interviewId: string;
  userName: string;
  userEmail: string;
  feedback: any; // JsonValue
  exitReason: string | null;
  completionStatus: string | null;
  progressAtExit: number | null;
  createdAt: Date | string;
  tabSwitches: number;
  securityFlags: any; // JsonValue | null
  score?: number; // Optional score field
}

interface Interview {
  id: string;
  userEmail: string;
  createdAt: Date | string;
  jobPosition: string;
  jobDescription: string;
  duration: string;
  interviewLink: string;
  questions: any; // JsonValue
  type: any; // JsonValue
  candidates: Candidate[];
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

// ─── Stats Card Component ───
interface StatsCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon, color }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
    <div className={`p-2 rounded-lg ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-lg font-bold text-slate-800">{value}</p>
    </div>
  </div>
);

// ─── Header Sub-Component ───
interface HeaderSectionProps {
  onRefresh?: () => void;
  onExport?: () => void;
  isRefreshing?: boolean;
}

const HeaderSection: React.FC<HeaderSectionProps> = ({
  onRefresh,
  onExport,
  isRefreshing
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h2 className="font-bold text-2xl text-slate-800">
        Interview Reports
      </h2>
      <p className="text-slate-500 text-sm">
        Review candidate performance and AI-generated feedback.
      </p>
    </div>

    <div className="flex items-center gap-2">
      {onExport && (
        <Button
          onClick={onExport}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      )}
      {onRefresh && (
        <Button
          onClick={onRefresh}
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      )}
    </div>
  </div>
);

// ─── Main Component ───
function ScheduledInterview(): React.ReactElement {
  const { data: session } = useSession();
  const user = session?.user;

  const [interviewList, setInterviewList] = useState<Interview[]>([]);
  const [filteredList, setFilteredList] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // ─── Fetch Interview Reports ───
  const GetInterviewList = useCallback(async (showLoader: boolean = true): Promise<void> => {
    if (showLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const response = await axios.get<Interview[]>("/api/interviews/reports");
      const data: Interview[] = response.data || [];
      setInterviewList(data);
      console.log(data);
      setFilteredList(data);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      console.error("Fetch failed:", axiosError.message);
      setError("Failed to load interview reports. Please try again.");
      setInterviewList([]);
      setFilteredList([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user?.email) {
      GetInterviewList();
    }
  }, [user?.email, GetInterviewList]);

  // ─── Search Filter ───
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredList(interviewList);
      return;
    }

    const query: string = searchQuery.toLowerCase();
    const filtered: Interview[] = interviewList.filter((interview: Interview) => {
      const positionMatch: boolean = interview.jobPosition?.toLowerCase().includes(query) || false;
      const candidateMatch: boolean = interview.candidates?.some(
        (c: Candidate) =>
          c.userName?.toLowerCase().includes(query) ||
          c.userEmail?.toLowerCase().includes(query)
      ) || false;
      return positionMatch || candidateMatch;
    });

    setFilteredList(filtered);
  }, [searchQuery, interviewList]);

  // ─── Calculate Stats ───
  const totalInterviews: number = interviewList.length;

  const totalCandidates: number = interviewList.reduce(
    (acc: number, interview: Interview) =>
      acc + (interview.candidates?.length || 0),
    0
  );

  const averageScore: number = interviewList.length > 0
    ? Math.round(
      interviewList.reduce((acc: number, interview: Interview) => {
        const scores: number[] = interview.candidates?.map((c: Candidate) => c.score || 0) || [];
        const avg: number = scores.length > 0
          ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
          : 0;
        return acc + avg;
      }, 0) / interviewList.length
    )
    : 0;

  // ─── Handlers ───
  const handleRefresh = (): void => {
    GetInterviewList(false);
    toast.success("Reports refreshed!");
  };

  const handleExport = (): void => {
    toast.info("Export feature coming soon!", {
      description: "We're working on CSV and PDF export functionality.",
    });
  };

  // ─── Loading State ───
  if (isLoading) {
    return (
      <div className="mt-8">
        <HeaderSection />
        <div className="mt-5 space-y-4">
          <CandidateReviewSkeleton />
          <CandidateReviewSkeleton />
          <CandidateReviewSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {/* Header */}
      <HeaderSection
        onRefresh={handleRefresh}
        onExport={handleExport}
        isRefreshing={isRefreshing}
      />

      {/* Error State */}
      {error && (
        <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
          <p className="text-sm text-red-600">{error}</p>
          <Button
            onClick={() => GetInterviewList()}
            variant="outline"
            size="sm"
            className="gap-2 text-red-600 border-red-200 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      {!error && interviewList.length > 0 && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard
            label="Total Interviews"
            value={totalInterviews}
            icon={<Video className="h-4 w-4 text-blue-600" />}
            color="bg-blue-50"
          />
          <StatsCard
            label="Total Candidates"
            value={totalCandidates}
            icon={<Users className="h-4 w-4 text-emerald-600" />}
            color="bg-emerald-50"
          />
          <StatsCard
            label="Avg. Score"
            value={`${averageScore}%`}
            icon={<TrendingUp className="h-4 w-4 text-purple-600" />}
            color="bg-purple-50"
          />
        </div>
      )}

      {/* Search Bar */}
      {!error && interviewList.length > 0 && (
        <div className="mt-5 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by position or candidate name..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Content */}
      {!error && (
        <>
          {interviewList.length === 0 ? (
            /* Empty State */
            <div className="mt-5 p-10 flex flex-col gap-4 items-center border border-dashed rounded-2xl bg-slate-50">
              <div className="p-3 bg-slate-100 rounded-full">
                <Video className="h-12 w-12 text-slate-300" />
              </div>
              <div className="text-center">
                <h2 className="text-slate-600 font-medium">
                  No candidate reports available yet.
                </h2>
                <p className="text-sm text-slate-400 mt-1 max-w-sm">
                  Create an interview and invite candidates to see their AI-generated performance reports here.
                </p>
              </div>
              <Link href={"/dashboard/create-interview"}>
                <Button className="bg-blue-600 hover:bg-blue-700 shadow-md gap-2">
                  <Video className="h-4 w-4" />
                  + Create Your First Interview
                </Button>
              </Link>
            </div>
          ) : filteredList.length === 0 ? (
            /* No Search Results */
            <div className="mt-5 p-10 flex flex-col gap-4 items-center border border-dashed rounded-2xl bg-slate-50">
              <Search className="h-12 w-12 text-slate-300" />
              <div className="text-center">
                <h2 className="text-slate-600 font-medium">
                  No results found
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  No interviews or candidates matching &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
              <Button
                onClick={() => setSearchQuery("")}
                variant="outline" className={undefined}              >
                Clear Search
              </Button>
            </div>
          ) : (
            /* Interview Reports List */
            <div className="mt-5 space-y-4">
              {filteredList.map((interview: Interview) => (
                <CandidateReviewCard
                  key={interview.id}
                  interview={interview}
                  candidates={interview.candidates || []}
                  viewDetail={true}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ScheduledInterview;