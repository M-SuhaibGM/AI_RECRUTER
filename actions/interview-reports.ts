"use server";

import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";

interface ReportShape {
    id: string;
    jobPosition: string;
    interviewLink?: string;
    candidates: {
        id: string;
        userName: string | null;
        userEmail: string | null;
        score: number;
        completionStatus: string | null;
        createdAt: string;
        tabSwitches: number;
    }[];
}

export const getCandidateReports = unstable_cache(
    async (userEmail: string): Promise<ReportShape[]> => {
        const interviews = await prisma.interview.findMany({
            where: { userEmail },
            select: {
                id: true,
                jobPosition: true,
                interviewLink: true,
                candidates: {
                    select: {
                        id: true,
                        userName: true,
                        userEmail: true,
                        feedback: true,
                        completionStatus: true,
                        createdAt: true,
                        tabSwitches: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return interviews.map((iv) => ({
            id: iv.id,
            jobPosition: iv.jobPosition ?? "Untitled",
            interviewLink: iv.interviewLink,
            candidates: iv.candidates.map((c) => ({
                id: c.id,
                userName: c.userName,
                userEmail: c.userEmail,
                // ✅ Extract score from feedback JSON at server time
                score: extractScore(c.feedback),
                completionStatus: c.completionStatus,
                createdAt: c.createdAt.toISOString(),
                tabSwitches: c.tabSwitches,
            })),
        }));
    },
    ["candidate-reports"],
    { revalidate: 30, tags: ["reports"] }
);

// ✅ Extract score once on the server
function extractScore(feedback: unknown): number {
    if (!feedback || typeof feedback !== "object") return 0;
    const f = feedback as Record<string, unknown>;
    const score = f.overallScore ?? f.score ?? f.rating;
    return typeof score === "number" ? Math.round(score) : 0;
}