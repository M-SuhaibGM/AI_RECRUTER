// app/api/add-credits/route.ts
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma as db } from "@/lib/db";
import Stripe from "stripe";
import { Prisma } from "@prisma/client";

// ─── Type Definitions ───
interface AddCreditsRequest {
  sessionId: string;
}

interface StripeMetadata {
  email?: string | null;
  credits?: string | null;
  plan?: string | null;
}

interface PaymentRecord {
  id: string;
  stripeSessionId: string;
  userEmail: string;
  amount: number;
  creditsAdded: number;
  createdAt: Date;
}

interface AddCreditsSuccessResponse {
  success: true;
  alreadyProcessed?: boolean;
  creditsAdded: number;
  userEmail?: string;
}

interface AddCreditsErrorResponse {
  error: string;
  code?: string;
}

type AddCreditsResponse = AddCreditsSuccessResponse | AddCreditsErrorResponse;

// ─── Initialize Stripe ───
const stripeApiKey: string = process.env.STRIPE_SECRET_KEY || "";

if (!stripeApiKey) {
  console.error("⚠️ STRIPE_SECRET_KEY is not set in environment variables");
}

const stripe = new Stripe(stripeApiKey, {
  apiVersion: "2026-02-25.clover",
  typescript: true,
});

// ─── Helper Functions ───
function logPaymentEvent(event: string, details: Record<string, any>): void {
  const timestamp = new Date().toISOString();
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ─── POST Handler ───
export async function POST(req: NextRequest): Promise<NextResponse<AddCreditsResponse>> {
  const requestStartTime = Date.now();

  try {
    // 1. Parse and validate request body
    let body: AddCreditsRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { sessionId } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "Valid sessionId is required" },
        { status: 400 }
      );
    }

    logPaymentEvent("Processing payment", { sessionId });

    // 2. Idempotency check — prevent duplicate processing
    const existing: PaymentRecord | null = await db.payment.findUnique({
      where: { stripeSessionId: sessionId },
    });

    if (existing) {
      logPaymentEvent("Payment already processed", {
        sessionId,
        creditsAdded: existing.creditsAdded,
      });

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        creditsAdded: existing.creditsAdded,
      });
    }

    // 3. Retrieve and verify Stripe session
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent', 'line_items'],
      });
    } catch (stripeError: unknown) {
      const err = stripeError as Error;
      logPaymentEvent("Stripe retrieval failed", {
        sessionId,
        error: err.message
      });

      return NextResponse.json(
        { error: "Failed to verify payment with Stripe" },
        { status: 502 }
      );
    }

    // 4. Verify payment status
    if (session.payment_status !== "paid") {
      logPaymentEvent("Payment not completed", {
        sessionId,
        status: session.payment_status,
      });

      return NextResponse.json(
        {
          error: "Payment not completed",
          code: "PAYMENT_NOT_COMPLETED"
        },
        { status: 400 }
      );
    }

    // 5. Extract and validate metadata
    const metadata: StripeMetadata = (session.metadata || {}) as StripeMetadata;
    const userEmail: string = metadata.email ||
      session.customer_email ||
      session.customer_details?.email ||
      "";

    const creditsToAdd: number = parseInt(metadata.credits || "0", 10);
    const amount: number = (session.amount_total || 0) / 100;

    // Validate email
    if (!userEmail || !isValidEmail(userEmail)) {
      logPaymentEvent("Invalid email", { sessionId, userEmail });

      return NextResponse.json(
        { error: "Valid user email is required" },
        { status: 400 }
      );
    }

    // Validate credits
    if (!creditsToAdd || creditsToAdd <= 0) {
      logPaymentEvent("Invalid credits amount", { sessionId, creditsToAdd });

      return NextResponse.json(
        { error: "Invalid credits amount" },
        { status: 400 }
      );
    }

    // 6. Check if user exists
    const user = await db.user.findUnique({
      where: { email: userEmail },
      select: { id: true, email: true, credits: true },
    });

    if (!user) {
      logPaymentEvent("User not found", { userEmail });

      return NextResponse.json(
        { error: "User account not found" },
        { status: 404 }
      );
    }

    // 7. Atomic transaction — update credits and create payment record
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update user credits
      await tx.user.update({
        where: { email: userEmail },
        data: {
          credits: { increment: creditsToAdd }
        },
      });

      // Create payment record
      await tx.payment.create({
        data: {
          stripeSessionId: sessionId,
          userEmail,
          amount,
          creditsAdded: creditsToAdd,
        },
      });
    });

    const processingTime = Date.now() - requestStartTime;

    logPaymentEvent("Payment processed successfully", {
      sessionId,
      userEmail,
      creditsAdded: creditsToAdd,
      amount: `$${amount}`,
      previousCredits: user.credits,
      newCredits: user.credits + creditsToAdd,
      processingTimeMs: processingTime,
    });

    return NextResponse.json({
      success: true,
      creditsAdded: creditsToAdd,
      userEmail,
    });

  } catch (err: unknown) {
    const processingTime = Date.now() - requestStartTime;

    // Handle Prisma unique constraint violation (P2002)
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        logPaymentEvent("Race condition - duplicate payment prevented", {
          processingTimeMs: processingTime,
        });

        return NextResponse.json({
          success: true,
          alreadyProcessed: true,
          creditsAdded: 0,
        });
      }
    }

    // Handle Stripe errors
    if (err instanceof Stripe.errors.StripeError) {
      logPaymentEvent("Stripe error", {
        type: err.type,
        message: err.message,
        processingTimeMs: processingTime,
      });

      return NextResponse.json(
        { error: `Payment verification failed: ${err.message}` },
        { status: 502 }
      );
    }

    // Generic error handling
    const errorMessage = err instanceof Error
      ? err.message
      : "An unexpected error occurred";

    console.error("Payment Sync Error:", {
      error: errorMessage,
      processingTimeMs: processingTime,
    });

    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}