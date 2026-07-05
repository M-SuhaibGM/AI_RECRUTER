import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// ─── Type Definitions ───
interface Question {
  question?: string;
  answer?: string;
  type?: string;
}

interface InterviewDetails {
  jobPosition: string;
  jobDescription: string;
  duration: number | string;
  type: any;
  questions: Question[] | any;
}

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

interface SuccessResponse extends InterviewDetails {}

interface ErrorResponse {
  error: string;
  details?: string;
}

// ─── Helper Functions ───
function logFetchEvent(event: string, details: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📋 ${event}:`, JSON.stringify(details, null, 2));
}

function sanitizeInterviewLink(link: string): string {
  // Remove any URL parts if full URL is provided
  return link.trim().split("/").pop() || link;
}

// ─── GET Handler ───
export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  const requestStartTime = Date.now();

  try {
    // 1. Extract and validate interview link
    const { id: interviewLink } = await params;

    if (!interviewLink) {
      return NextResponse.json(
        { error: "Interview link is required" },
        { status: 400 }
      );
    }

    // 2. Sanitize the interview link
    const sanitizedLink = sanitizeInterviewLink(interviewLink);

    if (!sanitizedLink) {
      return NextResponse.json(
        { error: "Invalid interview link format" },
        { status: 400 }
      );
    }

    logFetchEvent("Fetching interview details", {
      interviewLink: sanitizedLink,
    });

    // 3. Fetch interview from database
    const interview = await prisma.interview.findUnique({
      where: {
        interviewLink: sanitizedLink,
      },
      select: {
        jobPosition: true,
        jobDescription: true,
        duration: true,
        type: true,
        questions: true,
        interviewLink: true,
        createdAt: true,
      },
    });

    // 4. Check if interview exists
    if (!interview) {
      logFetchEvent("Interview not found", {
        interviewLink: sanitizedLink,
      });

      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // 5. Parse questions if stored as JSON string
    let parsedQuestions = interview.questions;
    if (typeof interview.questions === "string") {
      try {
        parsedQuestions = JSON.parse(interview.questions);
      } catch {
        parsedQuestions = [];
      }
    }

    const processingTime = Date.now() - requestStartTime;

    logFetchEvent("Interview fetched successfully", {
      interviewLink: sanitizedLink,
      jobPosition: interview.jobPosition,
      questionCount: Array.isArray(parsedQuestions) ? parsedQuestions.length : 0,
      processingTimeMs: processingTime,
    });

    // 6. Return interview details
    return NextResponse.json({
      jobPosition: interview.jobPosition,
      jobDescription: interview.jobDescription,
      duration: interview.duration,
      type: interview.type,
      questions: parsedQuestions,
      interviewLink: interview.interviewLink,
      createdAt: interview.createdAt,
    });

  } catch (error: unknown) {
    const processingTime = Date.now() - requestStartTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("Fetch Interview Error:", {
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