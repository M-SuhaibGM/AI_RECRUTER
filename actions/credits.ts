"use server";
import { prisma as db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface AddCreditsResult {
  success?: boolean;
  newTotal?: number;
  error?: string;
}

export async function addCredits(addedCredits: number): Promise<AddCreditsResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        credits: {
          increment: addedCredits, // Safely adds to existing value
        },
      },
    });

    return { success: true, newTotal: updatedUser.credits };
  } catch (err: unknown) {
    console.error(err);
    return { error: "Failed to update credits in database" };
  }
}