"use server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";

export async function getUserPayments() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return {
        success: false,
        payments: [],
        message: "Unauthorized",
      };
    }

    const payments = await prisma.payment.findMany({
      where: {
        userEmail: session.user.email,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return {
      success: true,
      payments,
    };
  } catch (error) {
    console.error("Error fetching payments:", error);

    return {
      success: false,
      payments: [],
      message: "Failed to fetch payment history.",
    };
  }
}