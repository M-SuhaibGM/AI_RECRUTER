"use server";

import { prisma } from "@/lib/db";

export interface CandidateView {
    id: string;
    interviewId: string;
    userName: string | null;
    userEmail: string | null;
    feedback: unknown;
    exitReason: string | null;
    completionStatus: string | null;
    progressAtExit: number | null;
    createdAt: string;
    tabSwitches: number;
    securityFlags: unknown;
    score: number;
}

export interface InterviewDetailView {
    id: string;
    jobPosition: string;
    duration: string;
    createdAt: string;
    questions?: any;
    interviewLink: string;
    jobDescription: string | null;
    userEmail: string;
    candidates: CandidateView[];
}

// ✅ Extract score once on the server
function extractScore(feedback: unknown): number {
    if (!feedback || typeof feedback !== "object") return 0;
    const f = feedback as Record<string, unknown>;
    const score = f.overallScore ?? f.score ?? f.rating;
    return typeof score === "number" ? Math.round(score) : 0;
}

export async function getInterviewDetail(
    interviewId: string,
    userEmail: string
): Promise<InterviewDetailView | null> {
    const interview = await prisma.interview.findUnique({
        where: { interviewLink: interviewId },
        select: {
            id: true,
            jobPosition: true,
            duration: true,
            createdAt: true,
            interviewLink: true,
            jobDescription: true,
            questions: true,
            userEmail: true,
            candidates: {
                select: {
                    id: true,
                    interviewId: true,
                    userName: true,
                    userEmail: true,
                    feedback: true,
                    exitReason: true,
                    completionStatus: true,
                    progressAtExit: true,
                    createdAt: true,
                    tabSwitches: true,
                    securityFlags: true,
                },
                orderBy: { createdAt: "desc" },
            },
        },
    });

    // ✅ Ownership check inside the action — cannot be bypassed
    if (!interview || interview.userEmail !== userEmail) {
        return null;
    }

    return {
        id: interview.id,
        jobPosition: interview.jobPosition ?? "Untitled",
        duration: interview.duration ?? "0",
        createdAt: interview.createdAt.toISOString(),
        interviewLink: interview.interviewLink ?? "",
        jobDescription: interview.jobDescription,
        questions: interview.questions,
        userEmail: interview.userEmail,
        candidates: interview.candidates.map((c) => ({
            id: c.id,
            interviewId: c.interviewId,
            userName: c.userName,
            userEmail: c.userEmail,
            feedback: c.feedback,
            exitReason: c.exitReason,
            completionStatus: c.completionStatus,
            progressAtExit: c.progressAtExit,
            createdAt: c.createdAt.toISOString(),
            tabSwitches: c.tabSwitches,
            securityFlags: c.securityFlags,
            score: extractScore(c.feedback),
        })),
    };
}