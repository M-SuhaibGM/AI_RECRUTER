import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

// ─── Type Definitions ───
interface InterviewData {
  id: string;
  jobPosition: string;
  duration: string;
  jobDescription: string;
  interviewLink: string;
  questions: any;
  type: any;
  createdAt: Date;
  userEmail: string;
}

interface UpdateInterviewRequest {
  jobPosition: string;
  duration: string;
  jobDescription: string;
}

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

interface SuccessResponse {
  id?: string;
  jobPosition?: string;
  duration?: string;
  jobDescription?: string;
  message?: string;
  [key: string]: any;
}

interface ErrorResponse {
  message: string;
  details?: string;
}

// ─── Helper Functions ───
function logApiEvent(event: string, details: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const emoji = event.includes("Error") ? "❌" : event.includes("PUT") ? "✏️" : "📋";
}

function sanitizeString(input: string, maxLength: number = 500): string {
  return input.trim().substring(0, maxLength);
}

function validateUpdateData(data: UpdateInterviewRequest): string[] {
  const errors: string[] = [];

  if (!data.jobPosition || data.jobPosition.trim().length === 0) {
    errors.push("Job position is required");
  } else if (data.jobPosition.trim().length < 2) {
    errors.push("Job position must be at least 2 characters");
  }

  if (!data.duration || data.duration.trim().length === 0) {
    errors.push("Duration is required");
  }

  if (!data.jobDescription || data.jobDescription.trim().length === 0) {
    errors.push("Job description is required");
  } else if (data.jobDescription.trim().length < 10) {
    errors.push("Job description must be at least 10 characters");
  }

  return errors;
}

// ─── GET Handler ───
export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  const requestStartTime = Date.now();

  try {
    // 1. Extract and validate interview ID
    const { id: interviewId } = await params;

    if (!interviewId) {
      return NextResponse.json(
        { message: "Interview ID is required" },
        { status: 400 }
      );
    }

    logApiEvent("Fetching interview for edit", { interviewId });

    // 2. Fetch interview from database
    const interview: InterviewData | null = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: {
        id: true,
        jobPosition: true,
        duration: true,
        jobDescription: true,
        interviewLink: true,
        questions: true,
        type: true,
        createdAt: true,
        userEmail: true,
      },
    });

    // 3. Check if interview exists
    if (!interview) {
      logApiEvent("Interview not found", { interviewId });
      
      return NextResponse.json(
        { message: "Interview record not found" },
        { status: 404 }
      );
    }

    const processingTime = Date.now() - requestStartTime;

    logApiEvent("Interview fetched for edit", {
      interviewId,
      jobPosition: interview.jobPosition,
      processingTimeMs: processingTime,
    });

    // 4. Return interview data
    return NextResponse.json(interview, { status: 200 });

  } catch (error: unknown) {
    const processingTime = Date.now() - requestStartTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("API GET Error:", {
      message: errorMessage,
      processingTimeMs: processingTime,
    });

    return NextResponse.json(
      { 
        message: "Failed to fetch interview details",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

// ─── PUT Handler ───
export async function PUT(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  const requestStartTime = Date.now();

  try {
    // 1. Extract interview ID
    const { id: interviewId } = await params;

    if (!interviewId) {
      return NextResponse.json(
        { message: "Interview ID is required" },
        { status: 400 }
      );
    }

    // 2. Parse request body
    let body: UpdateInterviewRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { jobPosition, duration, jobDescription } = body;

    // 3. Validate required fields
    const validationErrors = validateUpdateData(body);

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          message: "Validation failed",
          details: validationErrors.join(", "),
        },
        { status: 400 }
      );
    }

    // 4. Sanitize inputs
    const sanitizedData = {
      jobPosition: sanitizeString(jobPosition, 200),
      duration: sanitizeString(duration, 50),
      jobDescription: sanitizeString(jobDescription, 5000),
    };

    logApiEvent("Updating interview", {
      interviewId,
      updates: {
        jobPosition: sanitizedData.jobPosition,
        duration: sanitizedData.duration,
      },
    });

    // 5. Check if interview exists
    const existingInterview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: { id: true, jobPosition: true },
    });

    if (!existingInterview) {
      logApiEvent("Interview not found for update", { interviewId });
      
      return NextResponse.json(
        { message: "Interview record not found" },
        { status: 404 }
      );
    }

    // 6. Update interview
    const updatedInterview = await prisma.interview.update({
      where: { id: interviewId },
      data: sanitizedData,
      select: {
        id: true,
        jobPosition: true,
        duration: true,
        jobDescription: true,
      },
    });

    const processingTime = Date.now() - requestStartTime;

    logApiEvent("Interview updated successfully", {
      interviewId,
      previousPosition: existingInterview.jobPosition,
      newPosition: updatedInterview.jobPosition,
      processingTimeMs: processingTime,
    });

    // 7. Return updated interview
    return NextResponse.json(
      {
        message: "Interview updated successfully",
        ...updatedInterview,
      },
      { status: 200 }
    );

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
          { message: "Interview record not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { message: "Database error occurred" },
        { status: 500 }
      );
    }

    // Handle validation errors
    if (error instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json(
        { message: "Invalid data format provided" },
        { status: 400 }
      );
    }

    // Generic error
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("API PUT Error:", {
      message: errorMessage,
      processingTimeMs: processingTime,
    });

    return NextResponse.json(
      { 
        message: "Failed to update interview",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}