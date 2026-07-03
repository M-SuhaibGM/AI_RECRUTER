"use client";
import { 
  Calendar, 
  Clock, 
  Briefcase, 
  FileText, 
  HelpCircle, 
  ChevronDown,
  Copy,
  ExternalLink,
  Share2,
  Check
} from "lucide-react";
import moment from "moment";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { useState } from "react";

// ─── Type Definitions ───
interface Question {
  question?: string;
  answer?: string;
  type?: string;
  difficulty?: string;
}

interface InterviewDetail {
  id?: string;
  jobPosition?: string;
  duration?: number | string;
  created_at?: string | Date;
  createdAt?: string | Date;
  jobDescription?: string;
  type?: string | string[];
  questions?: Question[];
  interviewLink?: string;
  userEmail?: string;
  candidates?: any[];
}

interface InterviewDetailContainerProps {
  interviewDetail: InterviewDetail | null;
}

// ─── Helper Functions ───
function formatDate(date: string | Date | undefined): string {
  if (!date) return "N/A";
  return moment(date).format("DD MMM, YYYY");
}

function getAssessmentType(type: string | string[] | undefined): string {
  if (!type) return "Standard";
  if (Array.isArray(type)) return type[0] || "Standard";
  return type;
}

// ─── Question Type Badge ───
interface QuestionTypeBadgeProps {
  type?: string;
}

const QuestionTypeBadge: React.FC<QuestionTypeBadgeProps> = ({ type }) => {
  if (!type) return null;

  const typeStyles: Record<string, string> = {
    technical: "bg-blue-100 text-blue-700",
    behavioral: "bg-purple-100 text-purple-700",
    situational: "bg-orange-100 text-orange-700",
    experience: "bg-emerald-100 text-emerald-700",
  };

  return (
    <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
      typeStyles[type.toLowerCase()] || "bg-slate-100 text-slate-600"
    }`}>
      {type}
    </span>
  );
};

// ─── Loading Skeleton ───
const InterviewDetailSkeleton: React.FC = () => (
  <div className="w-full bg-white border border-blue-50 rounded-3xl p-8 mt-6 shadow-sm animate-pulse">
    <div className="flex justify-between items-center mb-6">
      <Skeleton className="h-8 w-1/3 bg-slate-100 rounded-lg" />
      <div className="flex gap-4">
        <Skeleton className="h-5 w-24 bg-slate-100 rounded-full" />
        <Skeleton className="h-5 w-24 bg-slate-100 rounded-full" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-6 mb-8">
      {[1, 2, 3].map((i: number) => (
        <Skeleton key={i} className="h-20 bg-slate-50 rounded-2xl" />
      ))}
    </div>
    <Skeleton className="h-32 w-full bg-slate-50 rounded-2xl" />
  </div>
);

// ─── Main Component ───
function InterviewDetailContainer({ 
  interviewDetail 
}: InterviewDetailContainerProps): React.ReactElement {
  const [copied, setCopied] = useState<boolean>(false);

  // Loading state
  if (!interviewDetail) {
    return <InterviewDetailSkeleton />;
  }

  const questions: Question[] = interviewDetail?.questions || [];
  const assessmentType: string = getAssessmentType(interviewDetail?.type);
  const formattedDate: string = formatDate(
    interviewDetail?.created_at || interviewDetail?.createdAt
  );

  // Copy interview link
  const handleCopyLink = async (): Promise<void> => {
    const url = `${process.env.NEXT_PUBLIC_HOST_URL}/interview/${interviewDetail?.interviewLink}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Interview link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Accordion type="single" collapsible className="w-full mt-6" defaultValue="interview-details">
      <AccordionItem value="interview-details" className="border-none">
        {/* ─── HEADER SECTION ─── */}
        <AccordionTrigger className="group p-6 bg-white border border-blue-100 rounded-3xl hover:no-underline hover:bg-blue-50/50 transition-all shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full text-left gap-4 pr-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-100">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                  {interviewDetail?.jobPosition || "Untitled Position"}
                </h2>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">
                  Active Interview Session
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 rounded-full text-xs font-semibold text-slate-500 shadow-sm">
                <Clock className="h-3.5 w-3.5 text-blue-500" />
                {interviewDetail?.duration || 0} Mins
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 rounded-full text-xs font-semibold text-slate-500 shadow-sm">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                {formattedDate}
              </div>
              {questions.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-xs font-semibold text-blue-600 shadow-sm">
                  <HelpCircle className="h-3.5 w-3.5" />
                  {questions.length} Question{questions.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </AccordionTrigger>

        {/* ─── CONTENT SECTION ─── */}
        <AccordionContent className="mt-2 p-8 bg-white border border-blue-50 rounded-3xl shadow-sm">
          {/* Detailed Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <StatCard
              label="Time Limit"
              value={`${interviewDetail?.duration || 0} Minutes`}
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

          {/* Share Link Button */}
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

          {/* Job Description */}
          <div className="space-y-3 mb-8">
            <h3 className="flex items-center gap-2 font-bold text-slate-800">
              <FileText className="h-4 w-4 text-blue-600" />
              Job Description
            </h3>
            <div className="bg-blue-50/30 p-5 rounded-2xl border border-blue-50">
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                {interviewDetail?.jobDescription || "No description provided."}
              </p>
            </div>
          </div>

          {/* Questions Section */}
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
                {questions.map((item: Question, index: number) => (
                  <div
                    key={index}
                    className="group flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all cursor-default"
                  >
                    <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-600 font-medium group-hover:text-slate-900 transition-colors">
                        {item?.question || `Question ${index + 1}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {item?.type && <QuestionTypeBadge type={item.type} />}
                        {item?.difficulty && (
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

// ─── Stat Card Sub-Component ───
interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon }) => (
  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
      {label}
    </p>
    <div className="flex items-center gap-2 text-slate-700 font-bold">
      {icon}
      <span className="truncate">{value}</span>
    </div>
  </div>
);

export default InterviewDetailContainer;