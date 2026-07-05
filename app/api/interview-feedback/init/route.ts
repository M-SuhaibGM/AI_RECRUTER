import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

// ─── Type Definitions ───
interface InitializeCandidateRequest {
  interviewId: string;
  userName: string;
  userEmail: string;
  browser?: string;
  platform?: string;
  userAgent?: string;
  screenResolution?: string;
  language?: string;
  timezone?: string;
}

interface SecurityFlags {
  timestamps: string[];
  browser: string;
  platform: string;
  userAgent?: string;
  screenResolution?: string;
  language?: string;
  timezone?: string;
  initializedAt?: string;
  lastAccessAt?: string;
  accessCount?: number;
  ipAddress?: string;
  [key: string]: any;
}

interface CandidateDetails {
  id: string;
  interviewId: string;
  userName: string;
  userEmail: string;
  completionStatus: string;
  exitReason: string;
  tabSwitches: number;
  progressAtExit: number | null;
  securityFlags: SecurityFlags ;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Constants ───
const MAX_INITIALIZATION_ATTEMPTS = 5;
const INITIALIZATION_WINDOW_MS = 60 * 1000; // 1 minute

// ─── In-memory rate limiting (use Redis in production) ───
const initializationAttempts = new Map<string, { count: number; resetAt: number }>();

// ─── Helper Functions ───
function logInitializationEvent(event: string, details: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const emoji = event.includes("Error") ? "❌" : "🚀";
  console.log(`[${timestamp}] ${emoji} ${event}:`, JSON.stringify(details, null, 2));
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = initializationAttempts.get(key);

  if (!record || now > record.resetAt) {
    initializationAttempts.set(key, { count: 1, resetAt: now + INITIALIZATION_WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_INITIALIZATION_ATTEMPTS) {
    return false;
  }

  record.count++;
  return true;
}

function sanitizeString(input: string, maxLength: number = 255): string {
  return input.trim().substring(0, maxLength);
}

function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function getBrowserInfo(userAgent: string | undefined): string {
  if (!userAgent) return "Unknown";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  return "Other";
}

function getPlatformInfo(userAgent: string | undefined): string {
  if (!userAgent) return "Unknown";
  if (userAgent.includes("Windows")) return "Windows";
  if (userAgent.includes("Mac")) return "macOS";
  if (userAgent.includes("Linux")) return "Linux";
  if (userAgent.includes("Android")) return "Android";
  if (userAgent.includes("iPhone") || userAgent.includes("iPad")) return "iOS";
  return "Other";
}

function getClientIP(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
         req.headers.get("x-real-ip") || 
         "Unknown";
}

// ─── POST Handler ───
export async function POST(
  req: NextRequest
): Promise<NextResponse> {
  const requestStartTime = Date.now();

  try {
    // 1. Parse request body
    let body: InitializeCandidateRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { 
      interviewId, 
      userName, 
      userEmail,
      browser: requestBrowser,
      platform: requestPlatform,
      userAgent,
      screenResolution,
      language,
      timezone,
    } = body;

    // 2. Validate required fields
    if (!interviewId || !userName?.trim() || !userEmail) {
      return NextResponse.json(
        { error: "interviewId, userName, and userEmail are required" },
        { status: 400 }
      );
    }

    // 3. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // 4. Rate limiting
    const clientIP = getClientIP(req);
    const rateLimitKey = `${clientIP}:${interviewId}`;
    
    if (!checkRateLimit(rateLimitKey)) {
      logInitializationEvent("Rate limit exceeded", { clientIP, interviewId });
      return NextResponse.json(
        { error: "Too many initialization attempts. Please try again later." },
        { status: 429 }
      );
    }

    // 5. Sanitize inputs
    const sanitizedUserName = sanitizeString(userName, 100);
    const sanitizedEmail = sanitizeEmail(userEmail);
    const detectedBrowser = requestBrowser || getBrowserInfo(userAgent);
    const detectedPlatform = requestPlatform || getPlatformInfo(userAgent);

    logInitializationEvent("Initializing candidate session", {
      interviewId,
      userName: sanitizedUserName,
      email: sanitizedEmail,
      browser: detectedBrowser,
      platform: detectedPlatform,
      clientIP,
    });

    // 6. Use transaction for idempotency
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Check if interview exists
      const interview = await tx.interview.findUnique({
        where: { id: interviewId },
        select: { id: true, interviewLink: true, jobPosition: true },
      });

      if (!interview) {
        throw new Error("INTERVIEW_NOT_FOUND");
      }

      // Find existing candidate
      let candidate = await tx.candidateDetails.findFirst({
        where: {
          interviewId,
          userEmail: sanitizedEmail,
        },
      });

      let isNew = false;

      if (!candidate) {
        // Create new candidate
        isNew = true;
        
        const initialSecurityFlags: SecurityFlags = {
          timestamps: [],
          browser: detectedBrowser,
          platform: detectedPlatform,
          userAgent: userAgent || "",
          screenResolution: screenResolution || "",
          language: language || "",
          timezone: timezone || "",
          initializedAt: new Date().toISOString(),
          accessCount: 1,
          ipAddress: clientIP,
        };

        candidate = await tx.candidateDetails.create({
          data: {
            interviewId,
            userName: sanitizedUserName,
            userEmail: sanitizedEmail,
            completionStatus: "In Progress",
            exitReason: "Started",
            tabSwitches: 0,
            progressAtExit: 0,
            securityFlags: initialSecurityFlags,
          },
        });
      } else {
        // Update existing candidate
        const existingFlags: SecurityFlags = 
          (candidate.securityFlags as SecurityFlags) || {
            timestamps: [],
            browser: "",
            platform: "",
          };

        await tx.candidateDetails.update({
          where: { id: candidate.id },
          data: {
            securityFlags: {
              ...existingFlags,
              browser: detectedBrowser || existingFlags.browser,
              platform: detectedPlatform || existingFlags.platform,
              userAgent: userAgent || existingFlags.userAgent,
              screenResolution: screenResolution || existingFlags.screenResolution,
              language: language || existingFlags.language,
              timezone: timezone || existingFlags.timezone,
              lastAccessAt: new Date().toISOString(),
              accessCount: ((existingFlags.accessCount as number) || 0) + 1,
              ipAddress: clientIP,
            },
          },
        });
      }

      return { candidate, isNew, interview };
    });

    const processingTime = Date.now() - requestStartTime;

    logInitializationEvent("Candidate initialized successfully", {
      candidateId: result.candidate.id,
      isNew: result.isNew,
      interviewLink: result.interview.interviewLink,
      processingTimeMs: processingTime,
    });

    return NextResponse.json({
      success: true,
      candidateId: result.candidate.id,
      tabSwitches: result.candidate.tabSwitches || 0,
      isNew: result.isNew,
      interviewLink: result.interview.interviewLink,
    });

  } catch (error: unknown) {
    // Handle known errors
    if (error instanceof Error && error.message === "INTERVIEW_NOT_FOUND") {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Candidate already initialized" },
          { status: 409 }
        );
      }
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Initialize Candidate Error:", errorMessage);

    return NextResponse.json(
      { error: "Failed to initialize candidate session" },
      { status: 500 }
    );
  }
}