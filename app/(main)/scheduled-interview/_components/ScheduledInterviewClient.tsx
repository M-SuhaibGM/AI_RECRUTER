"use client";

import React, { useState, useMemo, useCallback, useDeferredValue } from "react";
import {
    Video, RefreshCw, Search, Download, TrendingUp, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import CandidateReviewCard from "./CandidateReviewCard";

// ─── Types ───
interface Candidate {
    id: string;
    userName: string | null;
    userEmail: string | null;
    score: number;
    completionStatus: string | null;
    createdAt: string;
    tabSwitches: number;
}

interface Report {
    id: string;
    jobPosition: string;
    interviewLink?: string;
    candidates: Candidate[];
}

interface Props {
    initialReports: Report[];
}

// ─── Sub-components ───
function StatsCard({ label, value, icon, color }: {
    label: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
}) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
            <div>
                <p className="text-xs text-slate-500 font-medium">{label}</p>
                <p className="text-lg font-bold text-slate-800">{value}</p>
            </div>
        </div>
    );
}

// ─── Main ───
export default function ScheduledInterviewClient({ initialReports }: Props) {
    const router = useRouter();
    const [reports] = useState(initialReports);
    const [searchQuery, setSearchQuery] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);


    // ✅ useDeferredValue — defers expensive filtering during typing
    const deferredQuery = useDeferredValue(searchQuery);

    // ✅ Memoized filter — only recomputes when query or reports change
    const filteredReports = useMemo(() => {
        const q = deferredQuery.trim().toLowerCase();
        if (!q) return reports;

        return reports.filter((r) => {
            if (r.jobPosition.toLowerCase().includes(q)) return true;
            return r.candidates.some(
                (c) =>
                    c.userName?.toLowerCase().includes(q) ||
                    c.userEmail?.toLowerCase().includes(q)
            );
        });
    }, [deferredQuery, reports]);

    // ✅ Correct weighted average — not average of averages
    const stats = useMemo(() => {
        let totalCandidates = 0;
        let scoreSum = 0;

        for (const r of reports) {
            for (const c of r.candidates) {
                totalCandidates++;
                scoreSum += c.score;
            }
        }

        return {
            totalInterviews: reports.length,
            totalCandidates,
            averageScore: totalCandidates > 0 ? Math.round(scoreSum / totalCandidates) : 0,
        };
    }, [reports]);

    // ✅ Debounced search — update query immediately, filter lazily
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    }, []);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => setIsRefreshing(false), 500);
        toast.success("Reports refreshed");
    }, [router]);

    const handleExport = useCallback(() => {
        toast.info("Export feature coming soon!");
    }, []);

    return (
        <div className="mt-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="font-bold text-2xl text-slate-800">Interview Reports</h2>
                    <p className="text-slate-500 text-sm">
                        Review candidate performance and AI-generated feedback.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" /> Export
                    </Button>
                    <Button
                        onClick={handleRefresh}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats */}
            {reports.length > 0 && (
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatsCard
                        label="Total Interviews"
                        value={stats.totalInterviews}
                        icon={<Video className="h-4 w-4 text-blue-600" />}
                        color="bg-blue-50"
                    />
                    <StatsCard
                        label="Total Candidates"
                        value={stats.totalCandidates}
                        icon={<Users className="h-4 w-4 text-emerald-600" />}
                        color="bg-emerald-50"
                    />
                    <StatsCard
                        label="Avg. Score"
                        value={`${stats.averageScore}%`}
                        icon={<TrendingUp className="h-4 w-4 text-purple-600" />}
                        color="bg-purple-50"
                    />
                </div>
            )}

            {/* Search */}
            {reports.length > 0 && (
                <div className="mt-5 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Search by position or candidate..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="pl-10"
                    />
                </div>
            )}

            {/* Content */}
            {reports.length === 0 ? (
                <div className="mt-5 p-10 flex flex-col gap-4 items-center border border-dashed rounded-2xl bg-slate-50">
                    <div className="p-3 bg-slate-100 rounded-full">
                        <Video className="h-12 w-12 text-slate-300" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-slate-600 font-medium">
                            No candidate reports available yet.
                        </h2>
                        <p className="text-sm text-slate-400 mt-1 max-w-sm">
                            Create an interview and invite candidates to see their reports.
                        </p>
                    </div>
                    <Button asChild className="bg-blue-600 hover:bg-blue-700 shadow-md gap-2">
                        <Link href="/dashboard/create-interview">
                            <Video className="h-4 w-4" /> + Create Your First Interview
                        </Link>
                    </Button>
                </div>
            ) : filteredReports.length === 0 ? (
                <div className="mt-5 p-10 flex flex-col gap-4 items-center border border-dashed rounded-2xl bg-slate-50">
                    <Search className="h-12 w-12 text-slate-300" />
                    <div className="text-center">
                        <h2 className="text-slate-600 font-medium">No results found</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            No interviews or candidates matching &ldquo;{searchQuery}&rdquo;
                        </p>
                    </div>
                    <Button onClick={() => setSearchQuery("")} variant="outline">
                        Clear Search
                    </Button>
                </div>
            ) : (
                <div className="mt-5 space-y-4">
                    {filteredReports.map((report) => (
                        <CandidateReviewCard
                            key={report.id}
                            interview={report}
                            //   candidates={report.candidates}
                            viewDetail={true}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}