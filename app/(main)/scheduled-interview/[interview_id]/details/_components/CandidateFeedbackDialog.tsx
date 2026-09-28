import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import SelectionLetterDialog from "./SelectionLetterDialog";
import {
  FileText,
  Award,
  BarChart3,
  UserCheck,
  MessageSquare,
  Shield,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Activity
} from "lucide-react";

// ─── Type Definitions ───
interface FeedbackRating {
  technicalSkills: number;
  communication: number;
  problemSolving: number;
  experience: number;
}

interface Feedback {
  rating?: FeedbackRating;
  summary?: string;
  recommendation?: string | boolean;
  recommendationMsg?: string;
}

interface SecurityFlags {
  platform?: string;
  browser?: string;
  timestamps?: string[];
  [key: string]: any;
}

interface Candidate {
  id?: string;
  userName?: string;
  userEmail?: string;
  feedback?: Feedback | any;
  exitReason?: string | null;
  completionStatus?: string | null;
  progressAtExit?: number | null;
  tabSwitches?: number;
  securityFlags?: SecurityFlags | any;
  score?: number;
}

interface CandidateFeedbackDialogProps {
  candidate: Candidate;
}

interface SkillItem {
  label: string;
  val: number;
}

// ─── Main Component ───
function CandidateFeedbackDialog({ candidate }: CandidateFeedbackDialogProps): React.ReactElement {
  const feedback: Feedback | null = candidate?.feedback?.feedback || candidate?.feedback || null;

  const numericAvgRating: number = feedback?.rating
    ? (feedback.rating.technicalSkills +
      feedback.rating.communication +
      feedback.rating.problemSolving +
      feedback.rating.experience) / 4
    : 0;

  const avgRating: string = numericAvgRating.toFixed(1);
  const hasNoRating: boolean = numericAvgRating === 0;
  const isRecommended: boolean = feedback?.recommendation === "Yes" || feedback?.recommendation === true;

  const skills: SkillItem[] = [
    { label: "Technical Skills", val: feedback?.rating?.technicalSkills || 0 },
    { label: "Communication", val: feedback?.rating?.communication || 0 },
    { label: "Problem Solving", val: feedback?.rating?.problemSolving || 0 },
    { label: "Experience", val: feedback?.rating?.experience || 0 },
  ];

  const getInitials = (): string => {
    if (!candidate?.userName) return "U";
    return candidate.userName.charAt(0).toUpperCase();
  };

  const formatTimestamp = (time: string): string => {
    return new Date(time).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ✅ Progress & Completion helpers
  const progressAtExit: number = candidate?.progressAtExit ?? 0;
  const completionStatus: string = candidate?.completionStatus || "Unknown";
  const isCompleted: boolean = completionStatus === "Success" || completionStatus === "Completed";
  const isEarlyExit: boolean = progressAtExit > 0 && progressAtExit < 100;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-blue-200 text-blue-600 hover:bg-blue-50 cursor-pointer flex gap-2 rounded-xl transition-all"
        >
          <FileText className="w-4 h-4" />
          View Report
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border-none outline-none">
        {/* ─── Header ─── */}
        <DialogHeader className="p-6 bg-linear-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Award className="w-5 h-5" /> Interview Performance Report
            </DialogTitle>
          </div>
          <DialogDescription className="text-blue-100 mt-1">
            Detailed AI-generated assessment for the candidate.
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 max-h-[80vh] overflow-y-auto">
          {/* ─── Candidate Profile Summary ─── */}
          <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 bg-blue-600 flex items-center justify-center rounded-2xl text-white font-bold text-xl shadow-lg shadow-blue-200">
                {getInitials()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                  {candidate?.userName?.toUpperCase() || "UNKNOWN USER"}
                </h2>
                <p className="text-sm text-slate-500">{candidate?.userEmail}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Overall Score</p>
              <h2 className="text-3xl font-black text-blue-600">
                {avgRating}
                <span className="text-slate-300 text-sm font-normal">/10</span>
              </h2>
            </div>
          </div>

          {/* ✅ COMPLETION STATUS & PROGRESS AT EXIT */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Completion Status */}
            <div className={`p-4 rounded-2xl border ${isCompleted ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Completion Status</p>
              <div className="flex items-center gap-2">
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className={`text-sm font-extrabold ${isCompleted ? "text-emerald-700" : "text-red-700"}`}>
                  {completionStatus}
                </span>
              </div>
              {candidate?.exitReason && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Exit Reason: <span className="font-semibold">{candidate.exitReason}</span>
                </p>
              )}
            </div>

            {/* Progress at Exit */}
            <div className={`p-4 rounded-2xl border ${progressAtExit === 100 ? "bg-emerald-50 border-emerald-200" : progressAtExit >= 50 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Progress at Exit</p>
              <div className="flex items-center gap-2 mb-2">
                <Activity className={`w-5 h-5 ${progressAtExit === 100 ? "text-emerald-600" : progressAtExit >= 50 ? "text-amber-600" : "text-red-600"}`} />
                <span className={`text-sm font-extrabold ${progressAtExit === 100 ? "text-emerald-700" : progressAtExit >= 50 ? "text-amber-700" : "text-red-700"}`}>
                  {progressAtExit}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-2 rounded-full overflow-hidden bg-slate-200">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressAtExit}%`,
                    background: progressAtExit === 100
                      ? "linear-gradient(90deg, #059669, #10b981)"
                      : progressAtExit >= 50
                        ? "linear-gradient(90deg, #d97706, #f59e0b)"
                        : "linear-gradient(90deg, #dc2626, #ef4444)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* ─── Skills Grid or Exit Message ─── */}
          {hasNoRating ? (
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl mb-8">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-700 mb-1">Interview Not Completed</h3>
                  <p className="text-sm text-amber-600">
                    The candidate exited the interview early
                    {candidate?.exitReason && (
                      <span className="font-semibold"> due to: {candidate.exitReason}</span>
                    )}.
                    No performance data is available.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4">
                <BarChart3 className="w-4 h-4 text-blue-600" /> Skills Assessment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {skills.map((skill: SkillItem) => (
                  <div key={skill.label} className="space-y-2">
                    <div className="flex justify-between text-sm font-semibold text-slate-700">
                      <span>{skill.label}</span>
                      <span className="text-blue-600">{skill.val}/10</span>
                    </div>
                    <Progress value={skill.val * 10} className="h-2 bg-blue-50 [&>div]:bg-blue-600" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Performance Summary ─── */}
          <div className="mb-8">
            <h3 className={`flex items-center gap-2 font-bold mb-3 ${hasNoRating ? "text-red-600" : "text-slate-800"}`}>
              <MessageSquare className={`w-4 h-4 ${hasNoRating ? "text-red-500" : "text-blue-600"}`} />
              Performance Summary
            </h3>
            {hasNoRating ? (
              <div className="p-5 bg-red-50 border border-red-100 rounded-2xl">
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-red-600 text-sm leading-relaxed">
                    No summary available because the candidate exited the interview before completion.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl">
                <p className="text-slate-600 text-sm leading-relaxed italic">
                  &ldquo;{feedback?.summary || "No summary provided."}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* ─── Security & Anti-Cheat Summary ─── */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 mb-8">
            <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4">
              <Shield className="w-4 h-4 text-blue-600" /> Security & Tab Tracking
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tab Switches Count</span>
                <span className={`text-lg font-extrabold mt-1 ${(candidate?.tabSwitches || 0) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {candidate?.tabSwitches || 0} switch{(candidate?.tabSwitches || 0) !== 1 ? 'es' : ''}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidate Device / OS</span>
                <span className="font-semibold text-slate-700 mt-1">{candidate?.securityFlags?.platform || "Unknown"}</span>
              </div>
              <div className="flex flex-col md:col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Browser Agent</span>
                <span className="text-xs text-slate-600 mt-1 font-mono break-all bg-white p-2 rounded-lg border border-slate-200">
                  {candidate?.securityFlags?.browser || "Unknown"}
                </span>
              </div>
            </div>
            {candidate?.securityFlags?.timestamps && Array.isArray(candidate.securityFlags.timestamps) && candidate.securityFlags.timestamps.length > 0 && (
              <div className="mt-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Tab Switch Timestamps</span>
                <div className="max-h-24 overflow-y-auto space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                  {candidate.securityFlags.timestamps.map((time: string, idx: number) => (
                    <div key={idx} className="text-xs text-slate-600 flex justify-between font-mono">
                      <span className="font-bold text-red-500">Switch #{idx + 1}</span>
                      <span>{formatTimestamp(time)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── Recommendation Section ─── */}
          {!hasNoRating && (
            <div className={`p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-center gap-4 ${isRecommended ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg mt-1 ${isRecommended ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`font-bold text-sm uppercase tracking-wider ${isRecommended ? "text-emerald-700" : "text-rose-700"}`}>
                    AI Recommendation
                  </h2>
                  <p className={`text-sm mt-1 leading-snug ${isRecommended ? "text-emerald-800" : "text-rose-800"}`}>
                    {feedback?.recommendationMsg || "No recommendation message available."}
                  </p>
                </div>
              </div>
              <div className="shrink-0 w-full md:w-auto">
                <SelectionLetterDialog
                  candidate={candidate}
                  recommendation={feedback?.recommendation != null ? String(feedback.recommendation) : ""}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CandidateFeedbackDialog;