"use server";

import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";

export interface ReportCandidate {
    id: string;
    userName: string | null;
    userEmail: string | null;
    score: number;
    completionStatus: string | null;
    createdAt: string;
    tabSwitches: number;
}

export interface ReportShape {
    id: string;
    jobPosition: string;
    interviewLink?: string;
    candidates: ReportCandidate[];
}

// ─── Safe JSON parse (TiDB returns strings for JSON columns) ───
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

    // Try common shapes
    const direct = f.overallScore ?? f.score;
    if (typeof direct === "number") return Math.round(direct);

    // Nested: { feedback: { rating: {...} } }
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

// ─── Raw candidate row shape from TiDB ───
interface RawCandidateRow {
    id: string;
    interviewId: string;
    userName: string | null;
    userEmail: string | null;
    feedback: string | null;
    completionStatus: string | null;
    createdAt: string | Date;
    tabSwitches: number | string;
}

export const getCandidateReports = unstable_cache(
    async (userEmail: string): Promise<ReportShape[]> => {
        const interviews = await prisma.interview.findMany({
            where: { userEmail },
            select: {
                id: true,
                jobPosition: true,
                interviewLink: true,
            },
            orderBy: { createdAt: "desc" },
        });

        if (interviews.length === 0) return [];

        // ✅ Batch-fetch ALL candidates in ONE raw query (instead of N queries)
        const interviewLinks = interviews
            .map((i) => i.interviewLink)
            .filter((l): l is string => Boolean(l));

        if (interviewLinks.length === 0) {
            return interviews.map((iv) => ({
                id: iv.id,
                jobPosition: iv.jobPosition ?? "Untitled",
                interviewLink: iv.interviewLink ?? undefined,
                candidates: [],
            }));
        }

        // ✅ Raw query with IN clause — one round trip
        const placeholders = interviewLinks.map(() => "?").join(",");
        const rows = await prisma.$queryRawUnsafe<RawCandidateRow[]>(
            `SELECT
        id,
        interview_id   AS interviewId,
        userName,
        userEmail,
        CAST(feedback AS CHAR)      AS feedback,
        completion_status           AS completionStatus,
        created_at                  AS createdAt,
        tab_switches                AS tabSwitches
      FROM candidate_details
      WHERE interview_id IN (${placeholders})
      ORDER BY created_at DESC`,
            ...interviewLinks
        );

        // ✅ Group candidates by interviewId (which equals interviewLink)
        const candidatesByLink = new Map<string, ReportCandidate[]>();

        for (const row of rows) {
            const parsed = safeParse(row.feedback);
            const list = candidatesByLink.get(row.interviewId) ?? [];
            list.push({
                id: row.id,
                userName: row.userName,
                userEmail: row.userEmail,
                score: extractScore(parsed),
                completionStatus: row.completionStatus,
                createdAt:
                    row.createdAt instanceof Date
                        ? row.createdAt.toISOString()
                        : String(row.createdAt),
                tabSwitches: Number(row.tabSwitches) || 0,
            });
            candidatesByLink.set(row.interviewId, list);
        }

        return interviews.map((iv) => ({
            id: iv.id,
            jobPosition: iv.jobPosition ?? "Untitled",
            interviewLink: iv.interviewLink ?? undefined,
            candidates: candidatesByLink.get(iv.interviewLink ?? "") ?? [],
        }));
    },
    ["candidate-reports"],
    { revalidate: 30, tags: ["reports"] }
);


