"use client";

import React, { useMemo, useCallback, memo } from "react";
import {
  SearchX, Trophy, Download, Users, Calendar,
  AlertTriangle, CheckCircle2, XCircle, Shield,
  TrendingUp, Minus, FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import CandidateFeedbackDialog from "./CandidateFeedbackDialog";
import type { CandidateView } from "@/actions/interview-detail";

// ─── Hoisted date formatter ───
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

// ─── Types ───
interface FeedbackRating {
  technicalSkills?: number;
  communication?: number;
  problemSolving?: number;
  experience?: number;
}

interface FeedbackShape {
  feedback?: { rating?: FeedbackRating; summary?: string; recommendation?: string };
  rating?: FeedbackRating;
}

// ✅ Extract score — single source of truth (matches server action)
function getAverageScore(feedback: unknown): number {
  if (!feedback || typeof feedback !== "object") return 0;
  const f = feedback as FeedbackShape;
  const rating = f.feedback?.rating ?? f.rating;
  if (!rating) return 0;
  const sum =
    (rating.technicalSkills ?? 0) +
    (rating.communication ?? 0) +
    (rating.problemSolving ?? 0) +
    (rating.experience ?? 0);
  return sum / 4;
}

interface Props {
  candidate: CandidateView[] | null;
}

// ─── Status Badge ───
const StatusBadge: React.FC<{
  status: string | number | null | undefined;
  type: "status" | "exit" | "tabs" | "progress";
  tabSwitches?: number;
}> = memo(({ status, type, tabSwitches }) => {
  // Tab switches
  if (type === "tabs") {
    const switches = tabSwitches ?? 0;
    return switches > 0 ? (
      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md mt-1 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" /> {switches} switch{switches !== 1 ? "es" : ""}
      </span>
    ) : (
      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 flex items-center gap-1">
        <Shield className="w-3 h-3" /> 0 switches
      </span>
    );
  }

  // Progress
  if (type === "progress") {
    const progress = Number(status) || 0;
    const config =
      progress === 100
        ? { color: "text-emerald-600 bg-emerald-50", icon: <CheckCircle2 className="w-3 h-3" />, label: "100% Complete" }
        : progress >= 75
          ? { color: "text-blue-600 bg-blue-50", icon: <TrendingUp className="w-3 h-3" />, label: `${progress}%` }
          : progress >= 50
            ? { color: "text-amber-600 bg-amber-50", icon: <Minus className="w-3 h-3" />, label: `${progress}%` }
            : progress > 0
              ? { color: "text-orange-600 bg-orange-50", icon: <AlertTriangle className="w-3 h-3" />, label: `${progress}%` }
              : { color: "text-red-600 bg-red-50", icon: <XCircle className="w-3 h-3" />, label: "0% (Early Exit)" };

    return (
      <span className={`text-xs font-bold px-2 py-0.5 rounded-md mt-1 flex items-center gap-1 ${config.color}`}>
        {config.icon} {config.label}
      </span>
    );
  }

  // Status / Exit
  const isSuccess = status === "Success" || status === "Completed";
  return (
    <span
      className={`text-xs font-bold px-2 py-0.5 rounded-md mt-1 flex items-center gap-1 ${isSuccess ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"
        }`}
    >
      {isSuccess ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {status || "Unknown"}
    </span>
  );
});
StatusBadge.displayName = "StatusBadge";

// ─── Rank Badge ───
const RANK_STYLES = [
  { color: "bg-amber-100 text-amber-700", label: "🥇" },
  { color: "bg-slate-200 text-slate-700", label: "🥈" },
  { color: "bg-orange-50 text-orange-700", label: "🥉" },
];

const RankBadge: React.FC<{ index: number }> = memo(({ index }) => {
  const rank = RANK_STYLES[index];
  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${rank?.color || "text-slate-400"
        }`}
    >
      {rank?.label || index + 1}
    </span>
  );
});
RankBadge.displayName = "RankBadge";

// ─── Empty State ───
const EmptyState: React.FC = memo(() => (
  <div className="p-20 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 bg-white mt-5">
    <div className="p-4 bg-slate-50 rounded-full mb-4">
      <SearchX className="w-12 h-12 text-slate-300" />
    </div>
    <h3 className="text-xl font-bold text-slate-800">No Candidate Records</h3>
    <p className="text-sm text-slate-500 mt-1">
      Candidates who complete the interview will appear here.
    </p>
  </div>
));
EmptyState.displayName = "EmptyState";

// ─── Main ───
function CandidateList({ candidate }: Props) {


  const safeCandidate = useMemo(() => candidate ?? [], [candidate]);

  // ✅ Memoize ranked list — runs unconditionally
  const rankedCandidates = useMemo(
    () =>
      [...safeCandidate].sort(
        (a, b) => getAverageScore(b.feedback) - getAverageScore(a.feedback)
      ),
    [safeCandidate]
  );

  // ✅ Pre-compute scores — avoids N× repeated calls
  const scoresMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of safeCandidate) {
      map.set(c.id, getAverageScore(c.feedback));
    }
    return map;
  }, [safeCandidate]);


  // ✅ Lazy-load jsPDF — runs unconditionally
  const downloadPDF = useCallback(async () => {
    if (safeCandidate.length === 0) return;
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Candidate Ranking Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${DATE_FORMATTER.format(new Date())}`, 14, 30);
    doc.text(`Total Candidates: ${safeCandidate.length}`, 14, 37);

    const tableRows = rankedCandidates.map((c, index) => [
      index + 1,
      (c.userName || "UNKNOWN").toUpperCase(),
      c.userEmail || "N/A",
      `${(scoresMap.get(c.id) ?? 0).toFixed(1)}/10`,
      DATE_FORMATTER.format(new Date(c.createdAt)),
    ]);

    autoTable(doc, {
      startY: 42,
      head: [["Rank", "Full Name", "Email Address", "AI Score", "Interview Date"]],
      body: tableRows,
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 10 },
    });

    doc.save("Candidate_Ranking_Report.pdf");
    toast.success("Report downloaded");
  }, [rankedCandidates, scoresMap, safeCandidate.length]);


  if (!candidate) return null;
  if (candidate.length === 0) return <EmptyState />;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
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
              Total <span className="text-blue-600 font-bold">{candidate.length}</span>{" "}
              participant{candidate.length !== 1 ? "s" : ""} screened by AI
            </p>
          </div>
        </div>

        {/* Ranking Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-6 py-6 rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-transform">
              <Trophy className="h-5 w-5" /> Generate Ranking
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col p-0 border-none">
            <DialogHeader className="p-8 bg-linear-to-r from-blue-600 to-indigo-600 text-white">
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
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="w-[100px] font-bold text-slate-800">Rank</TableHead>
                      <TableHead className="font-bold text-slate-800">Candidate</TableHead>
                      <TableHead className="font-bold text-slate-800 hidden md:table-cell">Email</TableHead>
                      <TableHead className="text-right font-bold text-slate-800">AI Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankedCandidates.map((c, index) => (
                      <TableRow
                        key={c.id}
                        className="hover:bg-blue-50/30 transition-colors border-slate-50"
                      >
                        <TableCell className="py-4">
                          <RankBadge index={index} />
                        </TableCell>
                        <TableCell className="font-bold text-slate-700">
                          {(c.userName || "UNKNOWN").toUpperCase()}
                        </TableCell>
                        <TableCell className="text-slate-400 hidden md:table-cell text-sm">
                          {c.userEmail || "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                            {(scoresMap.get(c.id) ?? 0).toFixed(1)}/10
                          </span>
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

      {/* Candidate List */}
      <div className="grid gap-3">
        {candidate.map((c) => (
          <div
            key={c.id}
            className="group p-5 flex flex-col md:flex-row justify-between items-center bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 transition-[border-color,box-shadow] duration-300 gap-4"
          >
            <div className="flex items-center gap-5 w-full md:w-auto">
              <div className="h-12 w-12 flex items-center justify-center bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-100 transform group-hover:scale-110 transition-transform select-none">
                {c.userName?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="font-bold text-slate-800 uppercase tracking-tight text-base truncate">
                  {c.userName || "Unknown User"}
                </h2>
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span className="text-xs font-medium">
                    {DATE_FORMATTER.format(new Date(c.createdAt))}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between w-full md:w-auto md:gap-8 border-t md:border-t-0 pt-4 md:pt-0 flex-wrap">
              <div className="flex flex-col items-start md:items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Status
                </span>
                <StatusBadge status={c.completionStatus} type="status" />
              </div>
              <div className="flex flex-col items-start md:items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Progress at Exit
                </span>
                <StatusBadge status={c.progressAtExit} type="progress" />
              </div>
              <div className="flex flex-col items-start md:items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Exit Reason
                </span>
                <StatusBadge status={c.exitReason} type="exit" />
              </div>
              <div className="flex flex-col items-start md:items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Tab Switches
                </span>
                <StatusBadge status={null} type="tabs" tabSwitches={c.tabSwitches} />
              </div>
              <CandidateFeedbackDialog candidate={c} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(CandidateList);