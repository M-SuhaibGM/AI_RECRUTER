import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createInterviewPayloadSchema } from "@/lib/validations/interview";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = createInterviewPayloadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Please provide valid interview details." },
        { status: 400 }
      );
    }

    const { jobPosition, jobDescription, duration, questions, type, interview_link } = validation.data;
    const result = await prisma.$transaction(async (tx) => {
      const newInterview = await tx.interview.create({
        data: {
          jobPosition,
          jobDescription,
          duration,
          interviewLink: interview_link,
          questions: JSON.stringify(questions),
          type: JSON.stringify(type),
          userEmail: session.user.email,
        },
      });

      const updatedUser = await tx.user.update({
        where: { email: session.user.email },
        data: {
          credits: {
            decrement: 1,
          },
        },
      });

      if (updatedUser.credits < 0) {
        throw new Error("Insufficient credits");
      }

      return newInterview;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("API Error:", error);
    if (error instanceof Error) {
      console.error("API Error stack:", error.stack);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const interviews = await prisma.interview.findMany({
    where: { userEmail: session.user.email },
    select: { id: true, jobPosition: true, interviewLink: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(interviews);
}