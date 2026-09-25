import { Button } from "@/components/ui/button";
import { ArrowRight, Copy, Calendar, Users, Briefcase, Sparkles, Clock, TrendingUp } from "lucide-react";
import moment from "moment";
import Link from "next/link";
import React from "react";
import { toast } from "sonner";

// ─── Type Definitions ───
// ─── Type Definitions ───
interface Interview {
  interviewLink?: string;
  jobPosition?: string;
  created_at?: string | Date;      // snake_case (from raw SQL)
  createdAt?: string | Date;       // camelCase (from Prisma)
  duration?: number | string;
  id?: string;
}

interface InterviewCardProps {
  interview: Interview;
  viewDetail?: boolean;
  index?: number;
  candidateCount?: number;
}

export default function InterviewCard({
  interview,
  viewDetail = false,
  index,
  candidateCount = 0
}: InterviewCardProps) {

  const url: string = (process.env.NEXT_PUBLIC_HOST_URL || "") + "/interview/" + interview?.interviewLink;

  const copyLink = (): void => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!", {
      style: {
        background: "#eff6ff",
        color: "#2563eb",
        border: "1px solid #bfdbfe"
      }
    });
  };



  return (
    <div
      key={index}
      className="group relative bg-white rounded-2xl border border-slate-200 p-6 
        shadow-[0_2px_8px_rgba(0,0,0,0.04)] 
        hover:shadow-[0_20px_50px_rgba(59,130,246,0.15)] 
        hover:border-blue-200 
        hover:-translate-y-1
        transition-all duration-300 
        flex flex-col justify-between h-full
        before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-br before:from-blue-600/0 before:to-indigo-600/0 before:transition-all before:duration-300
        hover:before:from-blue-600/2 hover:before:to-indigo-600/4"
    >
      {/* Glow Effect */}
      <div className="absolute -inset-px rounded-2xl bg-linear-to-br from-blue-500/0 via-transparent to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-all duration-500 blur-xl -z-10" />

      <div className="relative z-10">
        {/* Top Section: Date & AI Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="relative">
            <div className="h-12 w-12 bg-linear-to-br from-blue-600 to-indigo-700 flex items-center justify-center rounded-xl shadow-lg shadow-blue-200 group-hover:shadow-blue-300 transition-shadow duration-300">
              <span className="text-xs font-bold text-white tracking-widest">AI</span>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center shadow-md">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 group-hover:border-blue-100 group-hover:bg-blue-50/50 group-hover:text-blue-600 transition-all duration-300">
            <Calendar className="w-3.5 h-3.5" />
            {moment(interview?.created_at).format("MMM DD, YYYY")}
          </div>
        </div>

        {/* Job Title */}
        <div className="space-y-2 mb-4">
          <h2 className="font-bold text-slate-800 text-xl group-hover:text-blue-600 transition-colors line-clamp-1">
            {interview?.jobPosition || "Untitled Position"}
          </h2>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Briefcase className="w-3.5 h-3.5" />
            <span className="text-slate-400">Standard Interview Mode</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between py-4 border-y border-slate-100 group-hover:border-blue-100/50 transition-colors duration-300 mb-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Duration</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-sm font-bold text-slate-700">
                {interview?.duration || 0} Mins
              </span>
            </div>
          </div>

          <div className="w-px h-8 bg-slate-100 group-hover:bg-blue-100 transition-colors duration-300" />

          <div className="flex flex-col gap-1 items-end">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Submissions</span>
            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm">
              <Users className="w-4 h-4" />
              {candidateCount || 0}
              {candidateCount > 0 && (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="relative z-10 mt-2">
        {!viewDetail ? (
          <Button
            variant="outline"
            className="w-full py-5 border-blue-100 bg-linear-to-r from-blue-50/50 to-indigo-50/50 
              text-blue-600 hover:text-white hover:border-blue-600 
              hover:bg-linear-to-r hover:from-blue-600 hover:to-indigo-600
              rounded-xl font-bold transition-all duration-300 
              flex gap-2 group/btn shadow-sm hover:shadow-lg hover:shadow-blue-500/25"
            onClick={copyLink}
          >
            <Copy className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-300" />
            Copy Interview Link
          </Button>
        ) : (
          <Link
            href={"/scheduled-interview/" + interview?.interviewLink + "/details"}
            className="block"
          >
            <Button
              className="w-full py-5 bg-linear-to-r from-blue-600 to-indigo-600 
                hover:from-blue-700 hover:to-indigo-700 
                text-white rounded-xl font-bold 
                shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-500/30
                flex items-center justify-center gap-2 
                group/btn transition-all duration-300"
            >
              View Full Details
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}