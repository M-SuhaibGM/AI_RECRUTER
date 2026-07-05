import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

// ─── Type Definitions ───
interface InterviewListItem {
  id: string;
  jobPosition: string;
  duration: number | string;
  interviewLink: string;
  createdAt: Date;
  questions: any;
  _count: {
    candidates: number;
  };
}

interface SuccessResponse extends Array<InterviewListItem> { }

interface ErrorResponse {
  error: string;
  details?: string;
}

// ─── Helper Functions ───
function logFetchEvent(event: string, details: Record<string, any>): void {
  const timestamp = new Date().toISOString();
}

// ─── GET Handler ───
export async function GET(
  req: NextRequest
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
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

    const userEmail = session.user.email;

    logFetchEvent("Fetching interviews", { userEmail });

    // 2. Fetch interviews from database
    const interviews: InterviewListItem[] = await prisma.interview.findMany({
      where: {
        userEmail,
      },
      select: {
        id: true,
        jobPosition: true,
        duration: true,
        interviewLink: true,
        createdAt: true,
        questions: true,
        _count: {
          select: { candidates: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const processingTime = Date.now() - requestStartTime;

    logFetchEvent("Interviews fetched successfully", {
      userEmail,
      totalInterviews: interviews.length,
      totalCandidates: interviews.reduce(
        (sum, interview) => sum + (interview._count?.candidates || 0),
        0
      ),
      processingTimeMs: processingTime,
    });

    // 3. Return interviews
    return NextResponse.json(interviews);

  } catch (error: unknown) {
    const processingTime = Date.now() - requestStartTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    console.error("Fetch Interviews Error:", {
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