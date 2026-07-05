import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

// ─── Type Definitions ───
interface SecurityFlags {
  platform?: string;
  browser?: string;
  userAgent?: string;
  timestamps?: string[];
  screenResolution?: string;
  language?: string;
  cookies?: boolean;
  [key: string]: any;
}

interface FeedbackRating {
  technicalSkills?: number;
  communication?: number;
  problemSolving?: number;
  experience?: number;
}

interface FeedbackData {
  rating?: FeedbackRating;
  summary?: string;
  recommendation?: string;
  recommendationMsg?: string;
  strengths?: string[];
  weaknesses?: string[];
  [key: string]: any;
}

interface InterviewFeedbackRequest {
  interviewId: string;
  userName: string;
  userEmail: string;
  feedback?: FeedbackData | any;
  exitReason?: string | null;
  progressAtExit?: number | null;
  completionStatus?: string | null;
  tabSwitches?: number | string;
  securityFlags?: SecurityFlags;
}

interface CandidateDetails {
  id: string;
  interviewId: string;
  userName: string;
  userEmail: string;
  feedback: any;
  exitReason: string | null;
  progressAtExit: number | null;
  completionStatus: string | null;
  tabSwitches: number;
  securityFlags: any;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Constants ───
const ALLOWED_COMPLETION_STATUSES = [
  "Success",
  "Failed",
  "In Progress",
  "Abandoned",
  "Completed",
  "Error",
] as const;

const MAX_TAB_SWITCHES = 1000;
const MAX_PROGRESS = 100;

// ─── Helper Functions ───
function logFeedbackEvent(event: string, details: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const emoji = event.includes("Error") ? "❌" : "📝";
  console.log(`[${timestamp}] ${emoji} ${event}:`, JSON.stringify(details, null, 2));
}

function sanitizeString(input: string, maxLength: number = 255): string {
  return input.trim().substring(0, maxLength);
}

function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function sanitizeNumber(value: number | string | undefined, defaultValue: number = 0, max: number = Infinity): number {
  const num = Number(value);
  if (isNaN(num)) return defaultValue;
  return Math.min(max, Math.max(0, num));
}

// ─── POST Handler ───
export async function POST(
  req: NextRequest
): Promise<NextResponse> {
  const requestStartTime = Date.now();

  try {
    // 1. Parse request body
    let body: InterviewFeedbackRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // 2. Validate required fields
    if (!body.interviewId) {
      return NextResponse.json(
        { error: "interviewId is required" },
        { status: 400 }
      );
    }

    if (!body.userName || body.userName.trim().length === 0) {
      return NextResponse.json(
        { error: "userName is required" },
        { status: 400 }
      );
    }

    if (!body.userEmail) {
      return NextResponse.json(
        { error: "userEmail is required" },
        { status: 400 }
      );
    }

    // 3. Sanitize inputs
    const interviewId = sanitizeString(body.interviewId);
    const userName = sanitizeString(body.userName, 100);
    const userEmail = sanitizeEmail(body.userEmail);
    const exitReason = body.exitReason ? sanitizeString(body.exitReason, 500) : null;
    const progressAtExit = body.progressAtExit !== null && body.progressAtExit !== undefined
      ? sanitizeNumber(body.progressAtExit, 0, MAX_PROGRESS)
      : null;
    const completionStatus = body.completionStatus || null;
    const tabSwitches = sanitizeNumber(body.tabSwitches, 0, MAX_TAB_SWITCHES);
    const securityFlags = body.securityFlags || {};
    const feedback = body.feedback || {};

    // 4. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // 5. Validate completion status
    if (completionStatus && !ALLOWED_COMPLETION_STATUSES.includes(completionStatus as any)) {
      return NextResponse.json(
        { error: `Invalid completionStatus. Allowed: ${ALLOWED_COMPLETION_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    logFeedbackEvent("Processing feedback", {
      interviewId,
      userName,
      email: userEmail,
      completionStatus,
      tabSwitches,
      progressAtExit,
    });

    // 6. Upsert candidate record (create or update)
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Check if candidate exists
      const existing = await tx.candidateDetails.findFirst({
        where: {
          interviewId,
          userEmail,
        },
      });

      if (existing) {
        // Update existing candidate
        const mergedSecurityFlags = {
          ...((existing.securityFlags as SecurityFlags) || {}),
          ...securityFlags,
          timestamps: [
            ...(((existing.securityFlags as SecurityFlags)?.timestamps) || []),
            ...(securityFlags.timestamps || []),
          ],
        };

        return tx.candidateDetails.update({
          where: { id: existing.id },
          data: {
            feedback: feedback || existing.feedback,
            exitReason: exitReason ?? existing.exitReason,
            progressAtExit: progressAtExit ?? existing.progressAtExit,
            completionStatus: completionStatus ?? existing.completionStatus,
            tabSwitches: existing.tabSwitches + tabSwitches,
            securityFlags: mergedSecurityFlags,
          },
        });
      } else {
        // Create new candidate
        return tx.candidateDetails.create({
          data: {
            interviewId,
            userName,
            userEmail,
            feedback,
            exitReason,
            progressAtExit,
            completionStatus,
            tabSwitches,
            securityFlags,
          },
        });
      }
    });

    const processingTime = Date.now() - requestStartTime;

    logFeedbackEvent("Feedback saved successfully", {
      candidateId: result.id,
      processingTimeMs: processingTime,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error: unknown) {
    const processingTime = Date.now() - requestStartTime;
    
    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Prisma Error:", {
        code: error.code,
        processingTimeMs: processingTime,
      });

      switch (error.code) {
        case "P2002":
          return NextResponse.json(
            { error: "Duplicate entry detected" },
            { status: 409 }
          );
        case "P2025":
          return NextResponse.json(
            { error: "Record not found" },
            { status: 404 }
          );
        default:
          return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
          );
      }
    }

    // Handle validation errors
    if (error instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 }
      );
    }

    // Generic error
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Database Save Error:", {
      message: errorMessage,
      processingTimeMs: processingTime,
    });

    return NextResponse.json(
      { error: "Failed to save interview feedback" },
      { status: 500 }
    );
  }
}