"use client";
import moment from "moment";
import React from "react";
import CandidateFeedbackDialog from "./CandidateFeedbackDialog";
import {
  SearchX,
  Trophy,
  Download,
  UserCheck,
  FileSpreadsheet,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  TrendingUp,
  Minus
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Type Definitions ───
interface FeedbackRating {
  technicalSkills: number;
  communication: number;
  problemSolving: number;
  experience: number;
}

interface Feedback {
  feedback?: {
    rating?: FeedbackRating;
    summary?: string;
    recommendation?: string;
    recommendationMsg?: string;
  };
  requestID?: string | null;
  rating?: FeedbackRating;
}

interface SecurityFlags {
  platform?: string;
  browser?: string;
  timestamps?: string[];
}

interface Candidate {
  id?: string;
  userName?: string;
  userEmail?: string;
  feedback?: Feedback | null;
  exitReason?: string | null;
  completionStatus?: string | null;
  progressAtExit?: number | null;
  createdAt?: string | Date;
  created_at?: string | Date;
  tabSwitches?: number;
  securityFlags?: SecurityFlags;
  score?: number;
}

interface CandidateListProps {
  candidate: Candidate[] | null;
}

// ─── Helper Functions ───
function getAverageScore(feedbackData: Feedback | null | undefined): number {
  if (!feedbackData || feedbackData.requestID === null || feedbackData === null) {
    return 0;
  }

  const rating = feedbackData?.feedback?.rating || feedbackData?.rating;

  if (!rating) {
    return 0;
  }

  const avg: number =
    (rating.technicalSkills || 0) +
    (rating.communication || 0) +
    (rating.problemSolving || 0) +
    (rating.experience || 0);

  return avg / 4;
}

function formatDate(date: string | Date | undefined): string {
  if (!date) return "N/A";
  return moment(date).format("DD MMM, YYYY");
}

// ─── Status Badge Component ───
interface StatusBadgeProps {
  status: string | null | undefined | number;
  type: "status" | "exit" | "tabs" | "progress";
  tabSwitches?: number;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type, tabSwitches }) => {
  // Tab switches
  if (type === "tabs") {
    const switches = tabSwitches || 0;
    return switches > 0 ? (
      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md mt-1 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" /> {switches} switch{switches !== 1 ? 'es' : ''}
      </span>
    ) : (
      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 flex items-center gap-1">
        <Shield className="w-3 h-3" /> 0 switches
      </span>
    );
  }

  // Progress at exit
  if (type === "progress") {
    const progress = Number(status) || 0;

    if (progress === 100) {
      return (
        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> 100% Complete
        </span>
      );
    } else if (progress >= 75) {
      return (
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mt-1 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> {progress}%
        </span>
      );
    } else if (progress >= 50) {
      return (
        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md mt-1 flex items-center gap-1">
          <Minus className="w-3 h-3" /> {progress}%
        </span>
      );
    } else if (progress > 0) {
      return (
        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md mt-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> {progress}%
        </span>
      );
    } else {
      return (
        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md mt-1 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> 0% (Early Exit)
        </span>
      );
    }
  }

  // Completion status & exit reason
  const isSuccess: boolean = status === "Success" || status === "Completed";

  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-md mt-1 flex items-center gap-1 ${isSuccess
      ? "text-emerald-600 bg-emerald-50"
      : "text-red-600 bg-red-50"
      }`}>
      {isSuccess ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : (
        <XCircle className="w-3 h-3" />
      )}
      {status || "Unknown"}
    </span>
  );
};

// ─── Rank Badge Component ───
interface RankBadgeProps {
  index: number;
}

const RankBadge: React.FC<RankBadgeProps> = ({ index }) => {
  const rankStyles: Record<number, string> = {
    0: "bg-amber-100 text-amber-700",
    1: "bg-slate-200 text-slate-700",
    2: "bg-orange-50 text-orange-700",
  };

  const rankLabels: Record<number, string> = {
    0: "🥇",
    1: "🥈",
    2: "🥉",
  };

  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${rankStyles[index] || "text-slate-400"
      }`}>
      {rankLabels[index] || index + 1}
    </span>
  );
};

// ─── Skeleton Component ───
function CandidateListSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-3xl" />
      <div className="space-y-3">
        {[1, 2, 3].map((i: number) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Empty State Component ───
const EmptyState: React.FC = () => (
  <div className="p-20 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 bg-white mt-5">
    <div className="p-4 bg-slate-50 rounded-full mb-4">
      <SearchX className="w-12 h-12 text-slate-300" />
    </div>
    <h3 className="text-xl font-bold text-slate-800">No Candidate Records</h3>
    <p className="text-sm text-slate-500 mt-1">
      Candidates who complete the interview will appear here.
    </p>
  </div>
);

// ─── Main Component ───
function CandidateList({ candidate }: CandidateListProps): React.ReactElement {

  // Loading state
  if (!candidate) {
    return <CandidateListSkeleton />;
  }

  // Empty state
  if (candidate.length === 0) {
    return <EmptyState />;
  }

  // Sort candidates by score (highest first)
  const rankedCandidates: Candidate[] = [...candidate].sort((a: Candidate, b: Candidate) =>
    getAverageScore(b.feedback) - getAverageScore(a.feedback)
  );

  // ─── PDF Export ───
  const downloadPDF = (): void => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text("Candidate Ranking Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${moment().format("LL")}`, 14, 30);
    doc.text(`Total Candidates: ${candidate.length}`, 14, 37);

    // Table rows
    const tableRows: (string | number)[][] = rankedCandidates.map((c: Candidate, index: number) => {
      const rawDate = c.created_at || c.createdAt;
      const formattedDate: string = rawDate
        ? moment(rawDate).format("DD MMM, YYYY")
        : "N/A";

      return [
        index + 1,
        c.userName ? c.userName.toUpperCase() : "UNKNOWN",
        c.userEmail || "N/A",
        `${getAverageScore(c.feedback).toFixed(1)}/10`,
        formattedDate
      ];
    });

    autoTable(doc, {
      startY: 42,
      head: [['Rank', 'Full Name', 'Email Address', 'AI Score', 'Interview Date']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 10 },
    });

    doc.save("Candidate_Ranking_Report.pdf");
  };

  return (
    <div className="w-full space-y-6">
      {/* ─── Header Section ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-blue-50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-2xl">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="font-extrabold text-2xl text-slate-900 tracking-tight">
              Candidate Pool
            </h2>
            <p className="text-sm font-medium text-slate-500">
              Total{" "}
              <span className="text-blue-600 font-bold">{candidate.length}</span>{" "}
              participant{candidate.length !== 1 ? 's' : ''} screened by AI
            </p>
          </div>
        </div>

        {/* Ranking Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-6 py-6 rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-95">
              <Trophy className="h-5 w-5" /> Generate Ranking
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col p-0 border-none">
            <DialogHeader className="p-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 opacity-80" />
                <div>
                  <DialogTitle className="text-2xl font-bold text-white">
                    Performance Ranking
                  </DialogTitle>
                  <DialogDescription className="text-blue-100">
                    Candidates sorted by AI evaluation score.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-auto p-8">
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <Table className={undefined}>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="w-[100px] font-bold text-slate-800">Rank</TableHead>
                      <TableHead className="font-bold text-slate-800">Candidate</TableHead>
                      <TableHead className="font-bold text-slate-800 hidden md:table-cell">Email</TableHead>
                      <TableHead className="text-right font-bold text-slate-800">AI Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className={undefined}>
                    {rankedCandidates.map((c: Candidate, index: number) => (
                      <TableRow
                        key={c.id || index}
                        className="hover:bg-blue-50/30 transition-colors border-slate-50"
                      >
                        <TableCell className="py-4">
                          <RankBadge index={index} />
                        </TableCell>
                        <TableCell className="font-bold text-slate-700">
                          {c.userName?.toUpperCase() || "UNKNOWN"}
                        </TableCell>
                        <TableCell className="text-slate-400 hidden md:table-cell text-sm">
                          {c.userEmail || "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex flex-col items-end">
                            <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                              {getAverageScore(c.feedback).toFixed(1)}/10
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex justify-end gap-3 border-t">
              <Button
                onClick={downloadPDF}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 px-6"
              >
                <Download className="h-4 w-4" /> Export Report
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ─── Candidate List Grid ─── */}
      <div className="grid gap-3">
        {candidate.map((c: Candidate, index: number) => (
          <div
            key={c.id || index}
            className="group p-5 flex flex-col md:flex-row justify-between items-center bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 gap-4"
          >
            {/* Left: Avatar & Info */}
            <div className="flex items-center gap-5 w-full md:w-auto">
              <div className="h-12 w-12 flex items-center justify-center bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-100 transform group-hover:scale-110 transition-transform select-none">
                {c.userName ? c.userName.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="font-bold text-slate-800 uppercase tracking-tight text-base truncate">
                  {c?.userName || "Unknown User"}
                </h2>
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span className="text-xs font-medium">
                    {formatDate(c?.createdAt || c?.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Status & Actions */}
            <div className="flex items-center justify-between w-full md:w-auto md:gap-8 border-t md:border-t-0 pt-4 md:pt-0 flex-wrap">
              {/* Status */}
              <div className="flex flex-col items-start md:items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Status
                </span>
                <StatusBadge status={c?.completionStatus} type="status" />
              </div>
              {/* progress-at exit */}
              <div className="flex flex-col items-start md:items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Progress at Exit
                </span>
                <StatusBadge status={c?.progressAtExit} type="progress" />
              </div>

              {/* Exit Reason */}
              <div className="flex flex-col items-start md:items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Exit Reason
                </span>
                <StatusBadge status={c?.exitReason} type="exit" />
              </div>

              {/* Tab Switches */}
              <div className="flex flex-col items-start md:items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Tab Switches
                </span>
                <StatusBadge
                  status={null}
                  type="tabs"
                  tabSwitches={c?.tabSwitches}
                />
              </div>

              {/* View Report Button */}
              <CandidateFeedbackDialog candidate={c} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CandidateList;