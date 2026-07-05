import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { CandidateDetails } from "@prisma/client";

// ─── Type Definitions ───
interface TabSwitchRequest {
  candidateId: string;
  browser?: string;
  platform?: string;
  userAgent?: string;
  screenResolution?: string;
  timestamp?: string;
}

interface SecurityFlags {
  browser?: string;
  platform?: string;
  userAgent?: string;
  screenResolution?: string;
  timestamps?: string[];
  [key: string]: any;
}


interface TabSwitchSuccessResponse {
  success: true;
  tabSwitches: number;
  totalViolations: number;
}

interface TabSwitchErrorResponse {
  error: string;
  details?: string;
}

// ─── Constants ───
const MAX_TAB_SWITCHES = 100; // Maximum allowed tab switches before flagging
const VIOLATION_THRESHOLD = 3; // Number of switches before considering it suspicious

// ─── Helper Functions ───
function logSecurityEvent(event: string, details: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const emoji = details.tabSwitches > VIOLATION_THRESHOLD ? "🚨" : "🔒";
}

function sanitizeString(input: string | undefined, maxLength: number = 255): string {
  if (!input) return "";
  return input.trim().substring(0, maxLength);
}

function getBrowserInfo(userAgent: string | undefined): string {
  if (!userAgent) return "Unknown";
  
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  if (userAgent.includes("Opera")) return "Opera";
  
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

// ─── POST Handler ───
export async function POST(
  req: NextRequest
): Promise<NextResponse<TabSwitchSuccessResponse | TabSwitchErrorResponse>> {
  const requestStartTime = Date.now();

  try {
    // 1. Parse request body
    let body: TabSwitchRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { 
      candidateId, 
      browser: requestBrowser, 
      platform: requestPlatform,
      userAgent,
      screenResolution,
      timestamp: requestTimestamp 
    } = body;

    // 2. Validate required fields
    if (!candidateId) {
      return NextResponse.json(
        { error: "candidateId is required" },
        { status: 400 }
      );
    }

    // 3. Get current timestamp
    const currentTimestamp = requestTimestamp || new Date().toISOString();

    // 4. Fetch current candidate record
    const candidate = await prisma.candidateDetails.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        tabSwitches: true,
        securityFlags: true,
        interviewId: true,
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // 5. Parse existing security flags
    const currentFlags: SecurityFlags = 
      (candidate.securityFlags as SecurityFlags) || {};
    
    const currentTimestamps: string[] = currentFlags.timestamps || [];
    
    // 6. Detect browser and platform from user agent if not provided
    const detectedBrowser = requestBrowser || 
      getBrowserInfo(userAgent || currentFlags.userAgent);
    
    const detectedPlatform = requestPlatform || 
      getPlatformInfo(userAgent || currentFlags.userAgent);

    // 7. Update timestamps
    const updatedTimestamps: string[] = [
      ...currentTimestamps,
      currentTimestamp,
    ];

    // 8. Prepare updated security flags
    const updatedSecurityFlags: SecurityFlags = {
      ...currentFlags,
      timestamps: updatedTimestamps,
      browser: detectedBrowser || currentFlags.browser || "Unknown",
      platform: detectedPlatform || currentFlags.platform || "Unknown",
      userAgent: userAgent || currentFlags.userAgent || "",
      screenResolution: screenResolution || currentFlags.screenResolution || "",
      lastSwitchAt: currentTimestamp,
      totalSwitches: updatedTimestamps.length,
    };

    // 9. Update candidate record
    const updated: CandidateDetails = await prisma.candidateDetails.update({
      where: { id: candidateId },
      data: {
        tabSwitches: updatedTimestamps.length,
        securityFlags: updatedSecurityFlags,
      },
    });

    // 10. Check if violations exceed threshold
    const totalViolations = updatedTimestamps.length;
    const isSuspicious = totalViolations > VIOLATION_THRESHOLD;

    const processingTime = Date.now() - requestStartTime;

    logSecurityEvent(
      isSuspicious ? "Suspicious tab activity detected" : "Tab switch recorded",
      {
        candidateId,
        interviewId: candidate.interviewId,
        tabSwitches: totalViolations,
        browser: detectedBrowser,
        platform: detectedPlatform,
        isSuspicious,
        processingTimeMs: processingTime,
      }
    );

    // 11. Return response
    return NextResponse.json({
      success: true,
      tabSwitches: updated.tabSwitches,
      totalViolations,
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
          { error: "Candidate record not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: "Database error occurred" },
        { status: 500 }
      );
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
    console.error("Update Tab Switch Error:", {
      message: errorMessage,
      processingTimeMs: processingTime,
    });

    return NextResponse.json(
      { 
        error: "Failed to update tab switch",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

// ─── GET Handler (Optional - to retrieve tab switch data) ───
export async function GET(
  req: NextRequest
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const candidateId = searchParams.get("candidateId");

    if (!candidateId) {
      return NextResponse.json(
        { error: "candidateId is required" },
        { status: 400 }
      );
    }

    const candidate = await prisma.candidateDetails.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        tabSwitches: true,
        securityFlags: true,
        userName: true,
        userEmail: true,
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    const flags = (candidate.securityFlags as SecurityFlags) || {};
    const timestamps = flags.timestamps || [];

    return NextResponse.json({
      success: true,
      data: {
        candidateId: candidate.id,
        userName: candidate.userName,
        userEmail: candidate.userEmail,
        tabSwitches: candidate.tabSwitches,
        totalViolations: timestamps.length,
        isSuspicious: timestamps.length > VIOLATION_THRESHOLD,
        firstSwitchAt: timestamps[0] || null,
        lastSwitchAt: timestamps[timestamps.length - 1] || null,
        browser: flags.browser || "Unknown",
        platform: flags.platform || "Unknown",
        timestamps,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Fetch Tab Switch Error:", errorMessage);
    
    return NextResponse.json(
      { error: "Failed to fetch tab switch data" },
      { status: 500 }
    );
  }
}