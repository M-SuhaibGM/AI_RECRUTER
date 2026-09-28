"use server";

import { prisma as db } from "@/lib/db"; // adjust to your db client (prisma/drizzle)
import { unstable_cache } from "next/cache";

// Cached version — revalidates every 60s
export const getInterviewsForUser = unstable_cache(
    async (email: string) => {
        // Replace this with your actual DB query
        const interviews = await db.interview.findMany({
            where: { user: { email } },
            include: { _count: { select: { candidates: true } } },
            orderBy: { createdAt: "desc" },
        });

        return interviews.map((i) => ({
            id: i.id,
            jobPosition: i.jobPosition,
            duration: i.duration,
            createdAt: i.createdAt.toISOString(),
            interviewLink: i.interviewLink,
            _count: i._count,
        }));
    },
    ["interviews-by-user"],
    { revalidate: 60, tags: ["interviews"] }
);