import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

// ─── Type Definitions ───
// ✅ Better to define explicit types rather than relying on Prisma types
// This ensures type safety even if Prisma schema changes
interface CandidateDetails {
  id: string;
  interviewId: string;
  userName: string;
  userEmail: string;
  feedback: any; // JsonValue
  exitReason: string | null;
  completionStatus: string | null;
  progressAtExit: number | null;
  createdAt: Date;
  tabSwitches: number;
  securityFlags: any; // JsonValue | null
}

interface InterviewDetails {
  id: string;
  userEmail: string;
  createdAt: Date;
  jobPosition: string;
  jobDescription: string;
  duration: string;
  interviewLink: string;
  questions: any; // JsonValue
  type: any; // JsonValue
  candidates: CandidateDetails[];
}

// ─── GET Handler ───
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ✅ Use the defined type
    const interviews: InterviewDetails[] = await prisma.interview.findMany({
      where: {
        userEmail: session.user.email,
      },
      include: {
        candidates: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(interviews);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Fetch Reports Error:", err.message);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}