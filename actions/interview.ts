"use server";

import { prisma as db } from "@/lib/db";
import { unstable_cache } from "next/cache";

export const getInterviewsForUser = unstable_cache(
  async (email: string) => {
    // ✅ Step 1: Fetch interviews by the direct userEmail field
    const interviews = await db.interview.findMany({
      where: { userEmail: email },
      select: {
        id: true,
        jobPosition: true,
        duration: true,
        createdAt: true,
        interviewLink: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (interviews.length === 0) return [];

    // ✅ Step 2: Count candidates per interview with raw SQL
    //    (TiDB-friendly — uses CAST where needed, no JSON parsing here)
    const interviewLinks = interviews
      .map((i) => i.interviewLink)
      .filter((l): l is string => Boolean(l));

    if (interviewLinks.length === 0) {
      return interviews.map((i) => ({
        id: i.id,
        jobPosition: i.jobPosition,
        duration: i.duration,
        createdAt: i.createdAt.toISOString(),
        interviewLink: i.interviewLink,
        _count: { candidates: 0 },
      }));
    }

    // ✅ Single batched count query — one round-trip
    const placeholders = interviewLinks.map(() => "?").join(",");
    const counts = await db.$queryRawUnsafe<{ interview_id: string; count: number }[]>(
      `SELECT interview_id, COUNT(*) as count
       FROM candidate_details
       WHERE interview_id IN (${placeholders})
       GROUP BY interview_id`,
      ...interviewLinks
    );

    // ✅ Build a lookup map for O(1) access
    const countMap = new Map(counts.map((c) => [c.interview_id, Number(c.count)]));

    return interviews.map((i) => ({
      id: i.id,
      jobPosition: i.jobPosition,
      duration: i.duration,
      createdAt: i.createdAt.toISOString(),
      interviewLink: i.interviewLink,
      _count: { candidates: countMap.get(i.interviewLink ?? "") ?? 0 },
    }));
  },
  ["interviews-by-user"],
  { revalidate: 60, tags: ["interviews"] }
);