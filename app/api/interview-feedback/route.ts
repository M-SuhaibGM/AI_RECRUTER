import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    console.log("📥 Interview feedback received:", JSON.stringify(body).substring(0, 200));

    const {
      interviewId,
      userName,
      userEmail,
      feedback,
      exitReason,
      progressAtExit,
      completionStatus,
      tabSwitches,
      securityFlags,
    } = body;

    // ✅ Validate required fields
    if (!interviewId || !userEmail) {
      console.error("❌ Missing required fields:", { interviewId, userEmail });
      return NextResponse.json(
        { error: "Missing required fields: interviewId and userEmail are required" },
        { status: 400 }
      );
    }

    // ✅ Check if candidate exists
    const existing = await prisma.candidateDetails.findFirst({
      where: { interviewId, userEmail },
    });

    let result: any;
    // Create
    result = await prisma.candidateDetails.create({
      data: {
        interviewId,
        userName: userName || "Unknown",
        userEmail,
        feedback: feedback || {},
        exitReason: exitReason || "Started",
        progressAtExit: progressAtExit || 0,
        completionStatus: completionStatus || "Incomplete",
        tabSwitches: Number(tabSwitches) || 0,
        securityFlags: securityFlags || {},
      },
    });
    console.log("✅ Candidate created:", result.id);
    return NextResponse.json({ success: true, data: result });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Interview Feedback Error:", err.message);
    return NextResponse.json(
      { error: "Failed to save feedback", details: err.message },
      { status: 500 }
    );
  }
}