"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Download, RefreshCw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import InterviewDetailContainer from "./InterviewDetailContainer";
import CandidateList from "./CandidateList";
import type { InterviewDetailView } from "@/actions/interview-detail";

interface Props {
  interviewDetail: InterviewDetailView;
}

export default function InterviewDetailsClient({ interviewDetail }: Props) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // ─── Handlers ───
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    router.refresh();
    // Brief visual feedback — router.refresh() doesn't return a promise
    setTimeout(() => {
      setRefreshing(false);
      toast.success("Data refreshed");
    }, 500);
  }, [router]);

  const handleExport = useCallback(() => {
    toast.info("Export feature coming soon!");
  }, []);

  const handleShare = useCallback(async () => {
    const url = `${process.env.NEXT_PUBLIC_HOST_URL}/interview/${interviewDetail.interviewLink}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Interview link copied!");
    } catch {
      toast.error("Failed to copy link");
    }
  }, [interviewDetail.interviewLink]);

  return (
    <div className="space-y-8 h-[78vh] overflow-y-auto pr-2 scrollbar-thin">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Link
              href="/scheduled-interview"
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Back to reports"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </Link>
            <h2 className="font-bold text-2xl text-slate-800">
              Interview Analytics
            </h2>
          </div>
          <p className="text-sm text-slate-500 ml-9">
            Review job details and candidate performance reports.
          </p>
        </div>

        <div className="flex items-center gap-2 ml-9 sm:ml-0">
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
            <Share2 className="w-4 h-4" /> Share
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" /> Export
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

      {/* ─── Content ─── */}
      <div className="grid grid-cols-1 gap-6">
        {/* Job info + questions */}
        <InterviewDetailContainer interviewDetail={interviewDetail} />

        {/* Candidates */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-700">
              Candidate Reports
              {interviewDetail.candidates.length > 0 && (
                <span className="text-sm font-normal text-slate-400 ml-2">
                  ({interviewDetail.candidates.length})
                </span>
              )}
            </h3>
          </div>
          <CandidateList candidate={interviewDetail.candidates} />
        </div>
      </div>
    </div>
  );
}