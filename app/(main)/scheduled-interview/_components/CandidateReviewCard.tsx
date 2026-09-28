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
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import React, { memo, useMemo } from "react";

// ─── Hoisted formatter — replaces moment.js ───
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

// ─── Type Definitions ───
interface Candidate {
  id: string;
  userName?: string | null;
  userEmail?: string | null;
  completionStatus?: string | null;
  createdAt?: string | Date;
  score?: number;
}

interface Interview {
  id?: string;
  jobPosition?: string;
  duration?: number | string;
  createdAt?: string | Date;
  created_at?: string | Date;
  interviewLink?: string;
  jobDescription?: string;
  candidates?: Candidate[];
  _count?: { candidates: number };
}

interface CandidateReviewCardProps {
  interview: Interview;
  viewDetail?: boolean;
  onDelete?: (interviewId: string) => void;
}

// ─── Status Badge ───
const STATUS_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; label: string }
> = {
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

const StatusBadge: React.FC<{ status?: string | null }> = memo(({ status }) => {
  if (!status) return null;
  const config = STATUS_CONFIG[status.toLowerCase()] ?? STATUS_CONFIG.pending;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.color}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
});
StatusBadge.displayName = "StatusBadge";

// ─── Candidate Stats ───
const CandidateStats: React.FC<{ candidates: Candidate[] }> = memo(({ candidates }) => {
  // ✅ Memoize inside — stable across renders
  const { completed, averageScore } = useMemo(() => {
    let completed = 0;
    let scoreSum = 0;

    for (const c of candidates) {
      if (c.completionStatus?.toLowerCase() === "completed") completed++;
      scoreSum += c.score ?? 0;
    }

    return {
      completed,
      averageScore: candidates.length > 0 ? Math.round(scoreSum / candidates.length) : 0,
    };
  }, [candidates]);

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
});
CandidateStats.displayName = "CandidateStats";

// ─── Main Component ───
function CandidateReviewCard({
  interview,
  onDelete,
}: CandidateReviewCardProps): React.ReactElement {
  const candidates = interview?.candidates ?? [];
  const candidateCount = candidates.length || interview?._count?.candidates || 0;

  // ✅ Memoize derived values
  const { formattedDate, isNew } = useMemo(() => {
    const rawDate = interview?.created_at ?? interview?.createdAt;
    if (!rawDate) return { formattedDate: "—", isNew: false };

    const date = new Date(rawDate);
    const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);

    return {
      formattedDate: DATE_FORMATTER.format(date),
      isNew: diffDays < 2,
    };
  }, [interview?.created_at, interview?.createdAt]);

  return (
    <div className="group relative w-full bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg hover:shadow-blue-500/5 hover:border-blue-200 transition-[box-shadow,border-color] duration-300 overflow-hidden">
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-linear-to-r from-blue-50/0 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* New badge */}
      {isNew && (
        <div className="absolute top-3 right-3">
          <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider">
            New
          </span>
        </div>
      )}

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
              Live Results
            </span>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <CalendarDays size={14} />
              {formattedDate}
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors line-clamp-1 mb-2">
            {interview?.jobPosition || "Untitled Position"}
          </h2>

          <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap mb-3">
            <div className="flex items-center gap-1.5">
              <Briefcase size={14} className="text-slate-400" />
              <span>{interview?.duration || 0} mins</span>
            </div>
            <div className="w-px h-4 bg-slate-200" />
            <div
              className={`flex items-center gap-1.5 font-medium ${candidateCount > 0 ? "text-emerald-600" : "text-slate-400"
                }`}
            >
              <Users size={14} />
              <span>
                {candidateCount > 0
                  ? `${candidateCount} Candidate${candidateCount !== 1 ? "s" : ""}`
                  : "No candidates yet"}
              </span>
            </div>
          </div>

          {candidates.length > 0 && <CandidateStats candidates={candidates} />}
        </div>

        {/* Right */}
        <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-50 shrink-0">
          {/* ✅ Button asChild */}
          <Button
            asChild
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl group/btn shadow-sm hover:shadow-md hover:shadow-blue-500/20 transition-colors"
          >
            <Link
              href={`/scheduled-interview/${interview?.interviewLink}/details`}
              className="flex items-center justify-center gap-2"
            >
              <span className="font-medium">Review Candidates</span>
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </Button>

          {candidates.length > 0 && (
            <div className="flex gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="flex-1 text-xs border-slate-200 hover:bg-slate-50 rounded-lg"
              >
                <Link href={`/scheduled-interview/${interview?.interviewLink}/details`}>
                  View Details
                </Link>
              </Button>
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

// ✅ Memoize — prevents re-render during parent search filter
export default memo(CandidateReviewCard);