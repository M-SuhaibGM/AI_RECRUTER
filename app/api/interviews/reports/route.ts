import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

// ─── GET Handler ───
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const interviews = await prisma.interview.findMany({
      where: { userEmail: session.user.email },
      orderBy: { createdAt: "desc" },
    });

    const result = [];
    
    for (const interview of interviews) {
      try {
        // Raw query to avoid TiDB JSON parsing issues
        const candidates = await prisma.$queryRawUnsafe<any[]>(
          `SELECT 
            id, 
            interview_id as interviewId, 
            userName, 
            userEmail, 
            CAST(feedback AS CHAR) as feedback,
            exit_reason as exitReason, 
            completion_status as completionStatus, 
            progress_at_exit as progressAtExit, 
            created_at as createdAt, 
            tab_switches as tabSwitches, 
            CAST(security_flags AS CHAR) as securityFlags
          FROM candidate_details 
          WHERE interview_id = ? 
          ORDER BY created_at DESC`,
          interview.interviewLink
        );

        // Safely parse JSON fields
        const safeParse = (value: string | null): any => {
          if (!value) return null;
          try { return JSON.parse(value); } catch { return value; }
        };

        result.push({
          id: interview.id,
          userEmail: interview.userEmail,
          createdAt: interview.createdAt,
          jobPosition: interview.jobPosition,
          jobDescription: interview.jobDescription,
          duration: interview.duration,
          interviewLink: interview.interviewLink,
          questions: interview.questions,
          type: interview.type,
          candidates: candidates.map((c: any) => ({
            id: c.id,
            interviewId: c.interviewId,
            userName: c.userName || "",
            userEmail: c.userEmail || "",
            feedback: safeParse(c.feedback),
            exitReason: c.exitReason || null,
            completionStatus: c.completionStatus || null,
            progressAtExit: c.progressAtExit || 0,
            createdAt: c.createdAt,
            tabSwitches: c.tabSwitches || 0,
            securityFlags: safeParse(c.securityFlags),
          })),
        });
      } catch {
        // Return interview without candidates if fetch fails
        result.push({
          id: interview.id,
          userEmail: interview.userEmail,
          createdAt: interview.createdAt,
          jobPosition: interview.jobPosition,
          jobDescription: interview.jobDescription,
          duration: interview.duration,
          interviewLink: interview.interviewLink,
          questions: interview.questions,
          type: interview.type,
          candidates: [],
        });
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("Fetch Reports Error:", err.message);
    
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}