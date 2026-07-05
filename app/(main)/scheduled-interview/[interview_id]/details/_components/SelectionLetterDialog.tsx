import React, { useState, ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Send, Mail, Building2, FileText, User, Award } from "lucide-react";

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
  recommendation?: string;
  recommendationMsg?: string;
}

interface Candidate {
  id?: string;
  userName?: string;
  userEmail?: string;
  feedback?: Feedback | any;
  score?: number;
}

interface SelectionLetterDialogProps {
  candidate: Candidate;
  recommendation?: string;
}

interface EmailPayload {
  email: string | undefined;
  subject: string;
  message: string;
  company: string;
}

// ─── Main Component ───
function SelectionLetterDialog({ 
  candidate, 
  recommendation 
}: SelectionLetterDialogProps): React.ReactElement {
  const [companyName, setCompanyName] = useState<string>("Our Company");
  const [loading, setLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Calculate average score safely
  const feedback: Feedback | null = candidate?.feedback?.feedback || candidate?.feedback || null;
  const ratings = feedback?.rating;
  const avgScore: number = ratings
    ? (ratings.technicalSkills || 0) + 
      (ratings.communication || 0) + 
      (ratings.problemSolving || 0) + 
      (ratings.experience || 0)
    : 0;
  const avgScoreDisplay: string = ratings 
    ? (avgScore / 4).toFixed(1) 
    : "0.0";

  // Determine letter type based on recommendation
  const isRejected: boolean = recommendation === "No" || recommendation === "Reject";
  const isSelected: boolean = !isRejected && recommendation !== undefined;

  // Generate letter template
  const generateLetterTemplate = (): string => {
    if (isRejected) {
      return `Dear ${candidate?.userName || "Candidate"},

Thank you for taking the time to complete our AI-powered interview assessment for the position at ${companyName}.

After careful review of your performance, we regret to inform you that we will not be moving forward with your application at this time. Your overall score was ${avgScoreDisplay}/10.

We appreciate your interest in ${companyName} and encourage you to apply for future positions that match your skills and experience.

Best regards,
The Recruitment Team at ${companyName}`;
    }

    return `Dear ${candidate?.userName || "Candidate"},

We are pleased to inform you that after reviewing your assessment, where you scored ${avgScoreDisplay}/10, we would like to move forward with your application at ${companyName}.

We were particularly impressed with your performance${
      feedback?.summary ? `:\n\n"${feedback.summary}"` : "."
    }

Next steps will be communicated to you shortly. Congratulations on your achievement!

Best regards,
The Recruitment Team at ${companyName}`;
  };

  const letterTemplate: string = generateLetterTemplate();

  // Handle company name change
  const handleCompanyNameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setCompanyName(e.target.value);
  };

  // Send email
  const sendEmail = async (): Promise<void> => {
    if (!candidate?.userEmail) {
      toast.error("Candidate email not found");
      return;
    }

    setLoading(true);
    try {
      const emailPayload: EmailPayload = {
        email: candidate.userEmail,
        subject: `${isRejected ? "Application Update" : "Congratulations!"} - ${companyName}`,
        message: letterTemplate,
        company: companyName,
      };

      const response: Response = await fetch("/api/send_email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to send email");
      }

      toast.success(
        isRejected 
          ? "Rejection letter sent successfully!" 
          : "Selection letter sent successfully!",
        {
          description: `Email sent to ${candidate.userEmail}`,
        }
      );
      
      setIsOpen(false);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Nodemailer Error:", err.message);
      toast.error("Failed to send email", {
        description: "Please check your server configuration.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className={`gap-2 px-4 py-2 rounded-xl text-white font-medium transition-all active:scale-95 ${
            isRejected 
              ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200" 
              : isSelected
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200"
                : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
          }`}
        >
          <Send className="h-4 w-4" />
          {isRejected ? "Send Rejection" : "Send Offer"}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl rounded-3xl p-0 overflow-hidden border-none max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className={`p-6 text-white shrink-0 ${
          isRejected 
            ? "bg-gradient-to-r from-red-600 to-rose-600" 
            : "bg-gradient-to-r from-emerald-600 to-teal-600"
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">
                {isRejected ? "Draft Rejection Letter" : "Draft Selection Letter"}
              </DialogTitle>
              <p className="text-sm opacity-80 mt-1">
                {isRejected 
                  ? "Notify the candidate about the decision."
                  : "Customize and send the offer letter."
                }
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Candidate Info Card */}
          <div className="flex items-center gap-3 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center rounded-xl text-white font-bold shadow-md">
              {candidate?.userName?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">
                {candidate?.userName || "Unknown Candidate"}
              </p>
              <p className="text-xs text-slate-500 truncate">{candidate?.userEmail}</p>
            </div>
            <div className="shrink-0">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
                isRejected 
                  ? "bg-red-100 text-red-600" 
                  : "bg-emerald-100 text-emerald-600"
              }`}>
                <Award className="h-3.5 w-3.5" />
                {avgScoreDisplay}/10
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Letter Preview - Takes 3 columns */}
            <div className="lg:col-span-3 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Letter Preview
                </span>
              </div>
              <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Email Header Bar */}
                <div className="bg-slate-100 px-5 py-2.5 border-b border-slate-200 flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-medium">To:</span>
                    <span>{candidate?.userEmail || "candidate@email.com"}</span>
                  </div>
                </div>
                {/* Letter Content */}
                <div className="p-6 text-sm leading-relaxed text-slate-700 whitespace-pre-line overflow-y-auto max-h-[400px] font-sans">
                  {letterTemplate}
                </div>
              </div>
            </div>

            {/* Controls - Takes 2 columns */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* Company Name Input */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <label 
                  htmlFor="company" 
                  className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  Company Name
                </label>
                <Input
                  id="company"
                  value={companyName}
                  onChange={handleCompanyNameChange}
                  placeholder="Enter company name"
                  className="rounded-xl bg-white" type={undefined}                />
                <p className="text-[10px] text-slate-400 mt-2">
                  This will appear in the letter header and signature.
                </p>
              </div>

              {/* Letter Info */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Letter Type</span>
                  <span className={`font-bold ${isRejected ? "text-red-600" : "text-emerald-600"}`}>
                    {isRejected ? "Rejection" : "Selection"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Candidate Score</span>
                  <span className="font-bold text-blue-600">{avgScoreDisplay}/10</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Recipient</span>
                  <span className="font-medium text-slate-700 truncate max-w-[150px]">
                    {candidate?.userEmail || "N/A"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-auto">
                <Button 
                  onClick={sendEmail} 
                  disabled={loading}
                  className={`w-full gap-2 rounded-xl h-12 text-sm font-bold ${
                    isRejected 
                      ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200" 
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200"
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Email
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl h-10"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SelectionLetterDialog;