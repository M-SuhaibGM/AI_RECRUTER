import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

// ─── Type Definitions ───
interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// ─── Helper Functions ───
function safeParse(value: string | null): any {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return value; }
}

// ─── GET Handler ───
export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const requestStartTime = Date.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized access" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id: interviewLink } = await params;

    if (!interviewLink) {
      return new Response(JSON.stringify({ error: "Interview link is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✅ Fetch interview
    const interview = await prisma.interview.findFirst({
      where: { interviewLink, userEmail: session.user.email },
    });

    if (!interview) {
      return new Response(JSON.stringify({ error: "Interview not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✅ Fetch candidates with raw query to avoid TiDB JSON issue
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

    const result = {
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
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("Fetch Interview Detail Error:", err.message);

    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ─── DELETE Handler ───
export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized access" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id: interviewId } = await params;

    if (!interviewId) {
      return new Response(JSON.stringify({ error: "Interview ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId, userEmail: session.user.email },
    });

    if (!interview) {
      return new Response(JSON.stringify({ error: "Interview not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Delete in transaction
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.candidateDetails.deleteMany({ where: { interviewId } });
      await tx.interview.delete({ where: { id: interviewId } });
    });

    return new Response(JSON.stringify({ success: true, message: "Interview deleted successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("Delete Error:", err.message);
    return new Response(JSON.stringify({ error: "Failed to delete interview" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ─── PATCH Handler ───
export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized access" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id: interviewId } = await params;
    const updateData = await req.json();

    const { jobPosition, duration, jobDescription } = updateData;

    if (!jobPosition || !duration || !jobDescription) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const updated = await prisma.interview.updateMany({
      where: { id: interviewId, userEmail: session.user.email },
      data: { jobPosition, duration, jobDescription },
    });

    if (updated.count === 0) {
      return new Response(JSON.stringify({ error: "Interview not found or unauthorized" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Interview updated" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("Update Error:", err.message);
    return new Response(JSON.stringify({ error: "Failed to update interview" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}