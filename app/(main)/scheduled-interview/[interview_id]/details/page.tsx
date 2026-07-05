"use client";
import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import InterviewDetailContainer from "./_components/InterviewDetailContainer";
import CandidateList from "./_components/CandidateList";
import { useSession } from "next-auth/react";
import axios, { AxiosError } from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw, 
  ArrowLeft,
  Download,
  Share2
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// ─── Type Definitions ───
interface Candidate {
  id: string;
  interviewId: string;
  userName: string;
  userEmail: string;
  feedback?: any;
  exitReason?: string | null;
  completionStatus?: string | null;
  progressAtExit?: number | null;
  createdAt?: Date | string;
  tabSwitches?: number;
  securityFlags?: any;
  score?: number;
}

interface InterviewDetail {
  id: string;
  jobPosition?: string;
  duration?: number | string;
  createdAt?: Date | string;
  interviewLink?: string;
  jobDescription?: string;
  userEmail?: string;
  questions?: any;
  candidates?: Candidate[];
  _count?: {
    candidates: number;
  };
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

// ─── Loading Skeleton ───
const LoadingSkeleton: React.FC = () => (
  <div className="space-y-2 h-[68vh] overflow-hidden pr-2 animate-pulse">
    <div className="flex flex-col gap-1">
      <Skeleton className="h-8 w-[200px]" />
      <Skeleton className="h-4 w-[300px]" />
    </div>
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-[250px] rounded-lg" />
      <Skeleton className="h-4 w-[350px] rounded-lg" />
    </div>
    <div className="grid grid-cols-1 gap-6">
      <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-6 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[90%]" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <Skeleton className="h-6 w-[180px] mb-6" />
        {[1, 2, 3].map((i: number) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-3 w-[80px]" />
              </div>
            </div>
            <Skeleton className="h-8 w-[100px] rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Main Component ───
function InterviewDetails(): React.ReactElement {
  const { interview_id } = useParams<{ interview_id: string }>();
  const { data: session } = useSession();
  const user = session?.user;
  
  const [interviewDetail, setInterviewDetail] = useState<InterviewDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch Interview Detail ───
  const fetchInterviewDetail = useCallback(async (isRefresh: boolean = false): Promise<void> => {
    if (!user?.email || !interview_id) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const response = await axios.get<InterviewDetail>(`/api/interviews/${interview_id}`);
      setInterviewDetail(response.data);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      console.error("Error fetching interview details:", axiosError.message);
      
      if (axiosError.response?.status === 404) {
        setError("Interview not found");
      } else if (axiosError.response?.status === 401) {
        setError("Please sign in to view this interview");
      } else {
        setError("Failed to load interview details");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.email, interview_id]);

  useEffect(() => {
    fetchInterviewDetail();
  }, [fetchInterviewDetail]);

  // ─── Handlers ───
  const handleRefresh = (): void => {
    fetchInterviewDetail(true);
    toast.success("Data refreshed!");
  };

  const handleExport = (): void => {
    toast.info("Export feature coming soon!");
  };

  const handleShare = async (): Promise<void> => {
    const url = `${process.env.NEXT_PUBLIC_HOST_URL}/interview/${interviewDetail?.interviewLink}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Interview link copied!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // ─── Loading State ───
  if (loading) {
    return <LoadingSkeleton />;
  }

  // ─── Error State ───
  if (error) {
    return (
      <div className="mt-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-600">{error}</h2>
        <button
          onClick={() => fetchInterviewDetail()}
          className="text-sm text-blue-600 hover:text-blue-700 mt-2 underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }

  // ─── Not Found State ───
  if (!interviewDetail) {
    return (
      <div className="mt-10 text-center">
        <h2 className="text-xl font-semibold text-slate-600">Interview not found.</h2>
        <Link href="/scheduled-interview" className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block">
          ← Back to Reports
        </Link>
      </div>
    );
  }

  // ─── Main Render ───
  return (
    <div className="space-y-8 h-[78vh] overflow-y-auto pr-2 scrollbar-thin">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Link 
              href="/scheduled-interview" 
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </Link>
            <h2 className="font-bold text-2xl text-slate-800">Interview Analytics</h2>
          </div>
          <p className="text-sm text-slate-500 ml-9">
            Review job details and candidate performance reports.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-9 sm:ml-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Interview Detail Container */}
        <InterviewDetailContainer interviewDetail={interviewDetail} />

        {/* Candidate Reports Section */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-700">
              Candidate Reports
              {interviewDetail?.candidates && interviewDetail.candidates.length > 0 && (
                <span className="text-sm font-normal text-slate-400 ml-2">
                  ({interviewDetail.candidates.length})
                </span>
              )}
            </h3>
          </div>
          <CandidateList candidate={interviewDetail?.candidates || []} />
        </div>
      </div>
    </div>
  );
}

export default InterviewDetails;