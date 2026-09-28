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
    questions: any;      // ✅ was: unknown
    type?: string | string[];
    interviewLink: string;
    jobDescription: string | null;
    userEmail: string;
    candidates: CandidateView[];
}

// ─── Safe JSON parse (TiDB returns JSON columns as strings) ───
function safeParse(value: string | null): unknown {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

// ─── Extract score from parsed feedback ───
function extractScore(feedback: unknown): number {
    if (!feedback || typeof feedback !== "object") return 0;
    const f = feedback as Record<string, unknown>;

    // Direct numeric fields
    const direct = f.overallScore ?? f.score;
    if (typeof direct === "number") return Math.round(direct);

    // Nested rating shape: { feedback: { rating: {...} } }
    const nested = f.feedback as Record<string, unknown> | undefined;
    const rating = (nested?.rating ?? f.rating) as Record<string, number> | undefined;

    if (rating) {
        const sum =
            (rating.technicalSkills ?? 0) +
            (rating.communication ?? 0) +
            (rating.problemSolving ?? 0) +
            (rating.experience ?? 0);
        return Math.round(sum / 4);
    }

    return 0;
}

// ─── Raw candidate row from TiDB ───
interface RawCandidateRow {
    id: string;
    interviewId: string;
    userName: string | null;
    userEmail: string | null;
    feedback: string | null;
    exitReason: string | null;
    completionStatus: string | null;
    progressAtExit: number | string | null;
    createdAt: string | Date;
    tabSwitches: number | string;
    securityFlags: string | null;
}

export async function getInterviewDetail(
    interviewId: string,
    userEmail: string
): Promise<InterviewDetailView | null> {
    // ✅ Step 1: Fetch interview WITHOUT the candidates relation
    //    (that's the part that breaks on TiDB)
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
        },
    });

    // ✅ Ownership check
    if (!interview || interview.userEmail !== userEmail) {
        return null;
    }

    // ✅ Step 2: Fetch candidates with raw SQL + CAST for JSON columns
    let candidates: CandidateView[] = [];

    if (interview.interviewLink) {
        try {
            const rows = await prisma.$queryRawUnsafe<RawCandidateRow[]>(
                `SELECT
          id,
          interview_id           AS interviewId,
          userName,
          userEmail,
          CAST(feedback AS CHAR) AS feedback,
          exit_reason            AS exitReason,
          completion_status      AS completionStatus,
          progress_at_exit       AS progressAtExit,
          created_at             AS createdAt,
          tab_switches           AS tabSwitches,
          CAST(security_flags AS CHAR) AS securityFlags
        FROM candidate_details
        WHERE interview_id = ?
        ORDER BY created_at DESC`,
                interview.interviewLink
            );

            candidates = rows.map((c) => {
                const parsedFeedback = safeParse(c.feedback);
                return {
                    id: c.id,
                    interviewId: c.interviewId,
                    userName: c.userName,
                    userEmail: c.userEmail,
                    feedback: parsedFeedback,
                    exitReason: c.exitReason,
                    completionStatus: c.completionStatus,
                    progressAtExit:
                        c.progressAtExit == null ? null : Number(c.progressAtExit),
                    createdAt:
                        c.createdAt instanceof Date
                            ? c.createdAt.toISOString()
                            : String(c.createdAt),
                    tabSwitches: Number(c.tabSwitches) || 0,
                    securityFlags: safeParse(c.securityFlags),
                    score: extractScore(parsedFeedback),
                };
            });
        } catch (err) {
            console.error("[getInterviewDetail] Raw candidate query failed:", err);
            candidates = [];
        }
    }

    // ✅ Step 3: Return the assembled view
    return {
        id: interview.id,
        jobPosition: interview.jobPosition ?? "Untitled",
        duration: interview.duration ?? "0",
        createdAt: interview.createdAt.toISOString(),
        interviewLink: interview.interviewLink ?? "",
        jobDescription: interview.jobDescription,
        questions: interview.questions,
        userEmail: interview.userEmail,
        candidates,
    };
}