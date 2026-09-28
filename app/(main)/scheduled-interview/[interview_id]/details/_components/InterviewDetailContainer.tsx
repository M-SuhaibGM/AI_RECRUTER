"use client";

import React, { useState, useCallback, memo } from "react";
import {
  Calendar, Clock, Briefcase, FileText, HelpCircle,
  Copy, Share2, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import type { InterviewDetailView } from "@/actions/interview-detail";

// ─── Hoisted formatter — replaces moment.js ───
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

interface Question {
  question?: string;
  answer?: string;
  type?: string;
  difficulty?: string;
}

interface Props {
  interviewDetail: InterviewDetailView & {
    type?: string | string[];
    questions?: Question[];
  };
}

// ─── Helpers ───
function getAssessmentType(type: string | string[] | undefined): string {
  if (!type) return "Standard";
  if (Array.isArray(type)) return type.length > 0 ? type[0] : "Standard";
  return type;
}

// ─── Question Type Badge ───
const QuestionTypeBadge: React.FC<{ type?: string }> = memo(({ type }) => {
  if (!type) return null;

  const typeStyles: Record<string, string> = {
    technical: "bg-blue-100 text-blue-700",
    behavioral: "bg-purple-100 text-purple-700",
    situational: "bg-orange-100 text-orange-700",
    experience: "bg-emerald-100 text-emerald-700",
  };

  return (
    <span
      className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
        typeStyles[type.toLowerCase()] || "bg-slate-100 text-slate-600"
      }`}
    >
      {type}
    </span>
  );
});
QuestionTypeBadge.displayName = "QuestionTypeBadge";

// ─── Stat Card ───
const StatCard: React.FC<{ label: string; value: string; icon: React.ReactNode }> = memo(
  ({ label, value, icon }) => (
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
        {label}
      </p>
      <div className="flex items-center gap-2 text-slate-700 font-bold">
        {icon}
        <span className="truncate">{value}</span>
      </div>
    </div>
  )
);
StatCard.displayName = "StatCard";

// ─── Main ───
function InterviewDetailContainer({ interviewDetail }: Props) {
  const [copied, setCopied] = useState(false);

  const questions = interviewDetail.questions ?? [];
  const assessmentType = getAssessmentType(interviewDetail.type);
  const formattedDate = DATE_FORMATTER.format(new Date(interviewDetail.createdAt));

  const handleCopyLink = useCallback(async () => {
    const url = `${process.env.NEXT_PUBLIC_HOST_URL}/interview/${interviewDetail.interviewLink}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Interview link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }, [interviewDetail.interviewLink]);

  return (
    <Accordion
      type="single"
      collapsible
      className="w-full mt-6"
      defaultValue="interview-details"
    >
      <AccordionItem value="interview-details" className="border-none">
        {/* Header */}
        <AccordionTrigger className="group p-6 bg-white border border-blue-100 rounded-3xl hover:no-underline hover:bg-blue-50/50 transition-colors shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full text-left gap-4 pr-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-linear-to-br from-blue-600 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-100">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                  {interviewDetail.jobPosition}
                </h2>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">
                  Active Interview Session
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 rounded-full text-xs font-semibold text-slate-500 shadow-sm">
                <Clock className="h-3.5 w-3.5 text-blue-500" />
                {interviewDetail.duration} Mins
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 rounded-full text-xs font-semibold text-slate-500 shadow-sm">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                {formattedDate}
              </div>
              {questions.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-xs font-semibold text-blue-600 shadow-sm">
                  <HelpCircle className="h-3.5 w-3.5" />
                  {questions.length} Question{questions.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        </AccordionTrigger>

        {/* Content */}
        <AccordionContent className="mt-2 p-8 bg-white border border-blue-50 rounded-3xl shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <StatCard
              label="Time Limit"
              value={`${interviewDetail.duration} Minutes`}
              icon={<Clock className="h-4 w-4 text-blue-600" />}
            />
            <StatCard
              label="Created At"
              value={formattedDate}
              icon={<Calendar className="h-4 w-4 text-blue-600" />}
            />
            <StatCard
              label="Assessment Type"
              value={assessmentType}
              icon={<FileText className="h-4 w-4 text-blue-600" />}
            />
          </div>

          <div className="mb-8">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 rounded-xl"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy Interview Link"}
            </Button>
          </div>

          <hr className="border-slate-100 mb-8" />

          <div className="space-y-3 mb-8">
            <h3 className="flex items-center gap-2 font-bold text-slate-800">
              <FileText className="h-4 w-4 text-blue-600" />
              Job Description
            </h3>
            <div className="bg-blue-50/30 p-5 rounded-2xl border border-blue-50">
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                {interviewDetail.jobDescription || "No description provided."}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-bold text-slate-800">
              <HelpCircle className="h-4 w-4 text-blue-600" />
              Pre-set Interview Questions
              {questions.length > 0 && (
                <span className="text-sm font-normal text-slate-400">
                  ({questions.length})
                </span>
              )}
            </h3>

            {questions.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {questions.map((item, index) => (
                  <div
                    key={index}
                    className="group flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-colors cursor-default"
                  >
                    <span className="shrink-0 w-7 h-7 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-600 font-medium group-hover:text-slate-900 transition-colors">
                        {item.question || `Question ${index + 1}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.type && <QuestionTypeBadge type={item.type} />}
                        {item.difficulty && (
                          <span className="text-[10px] text-slate-400">
                            {item.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl">
                <HelpCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">
                  No questions have been configured for this interview.
                </p>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default memo(InterviewDetailContainer);