import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

// ─── Type Definitions ───
interface Candidate {
  id: string;
  interviewId: string;
  userName: string;
  userEmail: string;
  feedback: any;
  exitReason: string | null;
  completionStatus: string | null;
  progressAtExit: number | null;
  createdAt: Date;
  tabSwitches: number;
  securityFlags: any;
}

interface InterviewDetail {
  id: string;
  userEmail: string;
  createdAt: Date;
  jobPosition: string;
  jobDescription: string;
  duration: string;
  interviewLink: string;
  questions: any;
  type: any;
  candidates: Candidate[];
}

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// ─── Helper Functions ───
function logApiEvent(event: string, details: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const emoji = event.includes("Error") ? "❌" : event.includes("DELETE") ? "🗑️" : "📋";
}

// ─── GET Handler ───
export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const requestStartTime = Date.now();

  try {
    // 1. Verify authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    // 2. Extract and validate interview link
    const { id: interviewLink } = await params;

    if (!interviewLink) {
      return NextResponse.json(
        { error: "Interview link is required" },
        { status: 400 }
      );
    }

    logApiEvent("Fetching interview detail", {
      interviewLink,
      userEmail: session.user.email,
    });

    // 3. Fetch interview with candidates
    const interview: InterviewDetail | null = await prisma.interview.findFirst({
      where: {
        interviewLink,
        userEmail: session.user.email,
      },
      include: {
        candidates: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    // 4. Check if interview exists
    if (!interview) {
      logApiEvent("Interview not found", { interviewLink });
      
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    const processingTime = Date.now() - requestStartTime;

    logApiEvent("Interview fetched successfully", {
      interviewId: interview.id,
      interviewLink,
      candidateCount: interview.candidates.length,
      processingTimeMs: processingTime,
    });

    // 5. Return interview details
    return NextResponse.json(interview);

  } catch (error: unknown) {
    const processingTime = Date.now() - requestStartTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("Fetch Interview Detail Error:", {
      message: errorMessage,
      processingTimeMs: processingTime,
    });

    return NextResponse.json(
      { 
        error: "Internal Server Error",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

// ─── DELETE Handler ───
export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const requestStartTime = Date.now();

  try {
    // 1. Verify authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    // 2. Extract interview ID
    const { id: interviewId } = await params;

    if (!interviewId) {
      return NextResponse.json(
        { error: "Interview ID is required" },
        { status: 400 }
      );
    }

    logApiEvent("Deleting interview", {
      interviewId,
      userEmail: session.user.email,
    });

    // 3. Verify ownership before deletion
    const interview = await prisma.interview.findUnique({
      where: {
        id: interviewId,
        userEmail: session.user.email,
      },
      select: {
        id: true,
        jobPosition: true,
        _count: {
          select: {
            candidates: true,
          },
        },
      },
    });

    if (!interview) {
      logApiEvent("Interview not found for deletion", {
        interviewId,
        userEmail: session.user.email,
      });

      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // 4. Delete interview and related candidates in a transaction
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Delete all related candidates first
      await tx.candidateDetails.deleteMany({
        where: {
          interviewId,
        },
      });

      // Then delete the interview
      await tx.interview.delete({
        where: {
          id: interviewId,
        },
      });
    });

    const processingTime = Date.now() - requestStartTime;

    logApiEvent("Interview deleted successfully", {
      interviewId,
      jobPosition: interview.jobPosition,
      deletedCandidates: interview._count.candidates,
      processingTimeMs: processingTime,
    });

    // 5. Return success response
    return NextResponse.json({
      success: true,
      message: "Interview deleted successfully",
      deletedCandidates: interview._count.candidates,
    });

  } catch (error: unknown) {
    const processingTime = Date.now() - requestStartTime;
    
    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Prisma Error:", {
        code: error.code,
        message: error.message,
        processingTimeMs: processingTime,
      });

      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Interview not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: "Database error occurred" },
        { status: 500 }
      );
    }

    // Generic error
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Delete Interview Error:", {
      message: errorMessage,
      processingTimeMs: processingTime,
    });

    return NextResponse.json(
      { 
        error: "Failed to delete interview",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

// ─── PATCH Handler (Optional - for partial updates) ───
export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const requestStartTime = Date.now();

  try {
    // 1. Verify authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    // 2. Extract interview ID
    const { id: interviewId } = await params;

    if (!interviewId) {
      return NextResponse.json(
        { error: "Interview ID is required" },
        { status: 400 }
      );
    }

    // 3. Parse update data
    const updateData = await req.json();

    // 4. Validate update fields
    const allowedFields = [
      "jobPosition",
      "jobDescription",
      "duration",
      "questions",
      "type",
    ];

    const sanitizedData: Record<string, any> = {};
    for (const key of Object.keys(updateData)) {
      if (allowedFields.includes(key)) {
        sanitizedData[key] = updateData[key];
      }
    }

    if (Object.keys(sanitizedData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // 5. Update interview
    const updated = await prisma.interview.updateMany({
      where: {
        id: interviewId,
        userEmail: session.user.email,
      },
      data: sanitizedData,
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: "Interview not found or unauthorized" },
        { status: 404 }
      );
    }

    const processingTime = Date.now() - requestStartTime;

    logApiEvent("Interview updated successfully", {
      interviewId,
      updatedFields: Object.keys(sanitizedData),
      processingTimeMs: processingTime,
    });

    return NextResponse.json({
      success: true,
      message: "Interview updated successfully",
    });

  } catch (error: unknown) {
    const processingTime = Date.now() - requestStartTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("Update Interview Error:", {
      message: errorMessage,
      processingTimeMs: processingTime,
    });

    return NextResponse.json(
      { error: "Failed to update interview" },
      { status: 500 }
    );
  }
}