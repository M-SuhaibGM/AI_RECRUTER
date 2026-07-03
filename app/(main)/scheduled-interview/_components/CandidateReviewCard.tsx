import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Users, 
  CalendarDays, 
  Briefcase, 
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import moment from "moment";
import Link from "next/link";
import React from "react";

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

interface Interview {
  id?: string;
  jobPosition?: string;
  duration?: number | string;
  created_at?: Date | string;
  createdAt?: Date | string;
  interviewLink?: string;
  jobDescription?: string;
  candidates?: Candidate[];
  _count?: {
    candidates: number;
  };
}

interface CandidateReviewCardProps {
  interview: Interview;
  index?: number;
  viewDetail?: boolean;
  candidates?: Candidate[];
  onDelete?: (interviewId: string) => void;
}

// ─── Status Badge Component ───
interface StatusBadgeProps {
  status?: string | null;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  if (!status) return null;

  const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    completed: {
      icon: <CheckCircle2 className="w-3 h-3" />,
      color: "bg-emerald-50 text-emerald-600 border-emerald-200",
      label: "Completed",
    },
    "in-progress": {
      icon: <Clock className="w-3 h-3" />,
      color: "bg-amber-50 text-amber-600 border-amber-200",
      label: "In Progress",
    },
    failed: {
      icon: <XCircle className="w-3 h-3" />,
      color: "bg-red-50 text-red-600 border-red-200",
      label: "Failed",
    },
    pending: {
      icon: <AlertCircle className="w-3 h-3" />,
      color: "bg-slate-50 text-slate-600 border-slate-200",
      label: "Pending",
    },
  };

  const config = statusConfig[status.toLowerCase()] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

// ─── Candidate Stats Component ───
interface CandidateStatsProps {
  candidates: Candidate[];
}

const CandidateStats: React.FC<CandidateStatsProps> = ({ candidates }) => {
  const completed: number = candidates.filter(
    (c: Candidate) => c.completionStatus?.toLowerCase() === "completed"
  ).length;
  const averageScore: number = candidates.length > 0
    ? Math.round(
        candidates.reduce((acc: number, c: Candidate) => acc + (c.score || 0), 0) / candidates.length
      )
    : 0;

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1 text-emerald-600">
        <CheckCircle2 className="w-3 h-3" />
        <span className="font-bold">{completed}</span>
        <span className="text-slate-400">completed</span>
      </div>
      {averageScore > 0 && (
        <>
          <div className="w-px h-3 bg-slate-200" />
          <div className="flex items-center gap-1 text-blue-600">
            <TrendingUp className="w-3 h-3" />
            <span className="font-bold">{averageScore}%</span>
            <span className="text-slate-400">avg score</span>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Main Component ───
function CandidateReviewCard({ 
  interview, 
  index,
  onDelete 
}: CandidateReviewCardProps): React.ReactElement {
  
  const candidates: Candidate[] = interview?.candidates || [];
  const candidateCount: number = candidates.length || interview?._count?.candidates || 0;
  
  const formattedDate: string = moment(
    interview?.created_at || interview?.createdAt
  ).format("MMM DD, YYYY");

  const isNew: boolean = moment().diff(moment(interview?.created_at || interview?.createdAt), 'days') < 2;

  return (
    <div
      key={index}
      className="group relative w-full bg-white border border-slate-200 rounded-xl p-6 
        hover:shadow-lg hover:shadow-blue-500/5 hover:border-blue-200 
        transition-all duration-300 overflow-hidden"
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      {/* New badge */}
      {isNew && (
        <div className="absolute top-3 right-3">
          <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider animate-pulse">
            New
          </span>
        </div>
      )}
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">

        {/* ─── Left Side: Job Info ─── */}
        <div className="flex-1 min-w-0">
          {/* Top Badges */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
              Live Results
            </span>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <CalendarDays size={14} />
              {formattedDate}
            </div>
          </div>

          {/* Job Position */}
          <h2 className="text-xl font-bold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors line-clamp-1 mb-2">
            {interview?.jobPosition || "Untitled Position"}
          </h2>

          {/* Stats Row */}
          <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap mb-3">
            <div className="flex items-center gap-1.5">
              <Briefcase size={14} className="text-slate-400" />
              <span>{interview?.duration || 0} mins</span>
            </div>
            <div className="w-px h-4 bg-slate-200" />
            <div className={`flex items-center gap-1.5 font-medium ${
              candidateCount > 0 ? "text-emerald-600" : "text-slate-400"
            }`}>
              <Users size={14} />
              <span>
                {candidateCount > 0 
                  ? `${candidateCount} Candidate${candidateCount !== 1 ? 's' : ''}`
                  : "No candidates yet"
                }
              </span>
            </div>
          </div>

          {/* Candidate Stats (if any) */}
          {candidates.length > 0 && (
            <CandidateStats candidates={candidates} />
          )}
        </div>

        {/* ─── Right Side: Action Buttons ─── */}
        <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-[200px] shrink-0">
          <Link
            href={`/scheduled-interview/${interview?.interviewLink}/details`}
            className="w-full block"
          >
            <Button
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white 
                flex items-center justify-center gap-2 transition-all duration-300 
                rounded-xl group/btn shadow-sm hover:shadow-md hover:shadow-blue-500/20"
            >
              <span className="font-medium">Review Candidates</span>
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
            </Button>
          </Link>
          
          {/* Quick Actions */}
          {candidates.length > 0 && (
            <div className="flex gap-2">
              <Link
                href={`/scheduled-interview/${interview?.interviewLink}/details`}
                className="flex-1"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs border-slate-200 hover:bg-slate-50 rounded-lg"
                >
                  View Details
                </Button>
              </Link>
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(interview?.id || "")}
                  className="text-xs border-red-200 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CandidateReviewCard;