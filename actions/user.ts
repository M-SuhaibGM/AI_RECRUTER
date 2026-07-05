// app/actions/user.ts
"use server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

// ─── Type Definitions ───
interface UserCredits {
  credits: number;
}

interface DeleteResult {
  success: boolean;
  message: string;
}

// ─── Get User Credits ───
export async function getUserCredits(): Promise<number> {
  try {
    // 1. Verify authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.error("Unauthorized access to getUserCredits");
      return 0;
    }

    // 2. Fetch user credits
    const user: UserCredits | null = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });

    // 3. Return credits or 0
    return user?.credits || 0;

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to fetch user credits:", errorMessage);
    return 0;
  }
}
// ─── Delete Interview ───
export async function deleteInterview(interviewId: string): Promise<DeleteResult> {
  try {
    // 1. Verify authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return { success: false, message: "Unauthorized access" };
    }

    // 2. Validate interview ID
    if (!interviewId) {
      return { success: false, message: "Interview ID is required" };
    }

    // 3. Verify ownership before deletion
    const interview = await prisma.interview.findFirst({
      where: {
        id: interviewId,
        userEmail: session.user.email,
      },
      select: { id: true },
    });

    if (!interview) {
      return { success: false, message: "Interview not found or unauthorized" };
    }

    // 4. Delete interview and related data in transaction
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Delete related candidates first
      await tx.candidateDetails.deleteMany({
        where: { interviewId },
      });

      // Delete the interview
      await tx.interview.delete({
        where: { id: interviewId },
      });
    });

    return { success: true, message: "Interview deleted successfully" };
  } catch (error: unknown) {
    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return { success: false, message: "Interview not found" };
      }
      return { success: false, message: "Database error occurred" };
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Delete interview error:", errorMessage);

    return { success: false, message: "Failed to delete interview" };
  }
}

