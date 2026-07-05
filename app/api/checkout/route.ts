import Stripe from "stripe";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ─── Type Definitions ───
interface CheckoutRequest {
  amount: number;
  credits: number;
  email?: string;
  planName?: string;
}

interface CheckoutSuccessResponse {
  url: string;
  sessionId?: string;
}

interface CheckoutErrorResponse {
  error: string;
  code?: string;
  details?: string;
}

interface StripeMetadata {
  email: string;
  credits: string;
  amount: string;
  planName?: string;
  userId?: string;
  createdAt: string;
}

// ─── Initialize Stripe ───
const stripeApiKey: string = process.env.STRIPE_SECRET_KEY || "";

if (!stripeApiKey) {
  console.error("⚠️ STRIPE_SECRET_KEY is not set in environment variables");
}

const stripe = new Stripe(stripeApiKey, {
  apiVersion: "2026-02-25.clover",
  typescript: true,
  maxNetworkRetries: 3,
});

// ─── Helper Functions ───
function logCheckoutEvent(event: string, details: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const emoji = event.includes("Error") ? "❌" : "💳";
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function getPlanFromAmount(amount: number, credits: number): string {
  if (amount === 5 && credits === 20) return "Basic";
  if (amount === 12 && credits === 50) return "Standard";
  if (amount === 25 && credits === 120) return "Pro";
  return "Custom";
}

// ─── POST Handler ───
export async function POST(
  req: NextRequest
): Promise<NextResponse<CheckoutSuccessResponse | CheckoutErrorResponse>> {
  const requestStartTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || undefined;

    let body: CheckoutRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { amount, credits, email: requestEmail, planName } = body;
    const email = requestEmail || session?.user?.email || "";

    // Validate required fields
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    if (!credits || credits <= 0 || !Number.isInteger(credits)) {
      return NextResponse.json(
        { error: "Credits must be a positive integer" },
        { status: 400 }
      );
    }

    const baseUrl: string = process.env.NEXT_PUBLIC_BASE_URL || "";
    if (!baseUrl) {
      console.error("⚠️ NEXT_PUBLIC_BASE_URL is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const detectedPlan = planName || getPlanFromAmount(amount, credits);

    const metadata: StripeMetadata = {
      email,
      credits: credits.toString(),
      amount: amount.toString(),
      planName: detectedPlan,
      userId: userId || "",
      createdAt: new Date().toISOString(),
    };

    logCheckoutEvent("Creating checkout session", {
      email,
      plan: detectedPlan,
      amount: `$${amount.toFixed(2)}`,
      credits,
      userId: userId || "guest",
    });

    // ✅ FIXED: Removed automatic_tax and tax_id_collection
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${credits} Interview Credits`,
              description: `${detectedPlan} Plan - ${credits} AI-powered interview credits`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/billing?canceled=true`,
      customer_email: email,
      metadata: metadata as unknown as Record<string, string>,
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      // ❌ REMOVED THESE:
      // automatic_tax: { enabled: true },
      // tax_id_collection: { enabled: true },
      // invoice_creation: { enabled: true },
    });

    const processingTime = Date.now() - requestStartTime;

    logCheckoutEvent("Checkout session created successfully", {
      sessionId: checkoutSession.id,
      plan: detectedPlan,
      amount: `$${amount}`,
      credits,
      processingTimeMs: processingTime,
    });

    return NextResponse.json({
      url: checkoutSession.url || "",
      sessionId: checkoutSession.id,
    });

  } catch (error: unknown) {
    const processingTime = Date.now() - requestStartTime;

    if (error instanceof Stripe.errors.StripeError) {
      logCheckoutEvent("Stripe Error", {
        type: error.type,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        processingTimeMs: processingTime,
      });

      let statusCode = 500;
      let clientMessage = "Payment service error";

      switch (error.type) {
        case "StripeCardError":
          statusCode = 400;
          clientMessage = error.message;
          break;
        case "StripeInvalidRequestError":
          statusCode = 400;
          clientMessage = "Invalid payment request";
          break;
        case "StripeAPIError":
          statusCode = 502;
          clientMessage = "Payment service temporarily unavailable";
          break;
        case "StripeConnectionError":
          statusCode = 502;
          clientMessage = "Unable to connect to payment service";
          break;
        case "StripeRateLimitError":
          statusCode = 429;
          clientMessage = "Too many requests. Please try again.";
          break;
        case "StripeAuthenticationError":
          statusCode = 500;
          clientMessage = "Payment service configuration error";
          break;
      }

      return NextResponse.json(
        {
          error: clientMessage,
          code: error.code || "STRIPE_ERROR",
          details: process.env.NODE_ENV === "development" ? error.message : undefined,
        },
        { status: statusCode }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Failed to create checkout session";
    logCheckoutEvent("Unexpected Error", {
      message: errorMessage,
      processingTimeMs: processingTime,
    });

    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}