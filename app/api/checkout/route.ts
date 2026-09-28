import Stripe from "stripe";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ─── Server-only config ───
const stripeApiKey = process.env.STRIPE_SECRET_KEY;
const APP_URL = process.env.NEXT_PUBLIC_HOST_URL; // ✅ Same var used elsewhere

if (!stripeApiKey) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}
if (!APP_URL) {
  throw new Error("NEXT_PUBLIC_HOST_URL is not set");
}

const stripe = new Stripe(stripeApiKey, {
  apiVersion: "2024-06-20" as Stripe.LatestApiVersion, // ✅ Match verifier
  typescript: true,
  maxNetworkRetries: 3,
});

// ─── Plan definitions — SINGLE SOURCE OF TRUTH ───
// ✅ Never trust client-sent amounts. Map credits → price here.
const PLAN_MAP: Record<number, { amount: number; name: string }> = {
  20: { amount: 5, name: "Basic" },
  50: { amount: 12, name: "Standard" },
  120: { amount: 25, name: "Pro" },
};

// ─── Types ───
interface CheckoutRequest {
  credits: number;        // ✅ Only accept credits from client
  email?: string;
}

interface CheckoutSuccess {
  url: string;
  sessionId: string;
}

interface CheckoutError {
  error: string;
  code?: string;
}

// ─── Helpers ───
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── POST Handler ───
export async function POST(
  req: NextRequest
): Promise<NextResponse<CheckoutSuccess | CheckoutError>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Please sign in to continue" },
        { status: 401 }
      );
    }

    let body: CheckoutRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { credits, email: requestEmail } = body;
    const userEmail = session.user.email; // ✅ Trust the session, not the request

    // ✅ Validate credits is a valid plan
    if (!credits || !Number.isInteger(credits) || !PLAN_MAP[credits]) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    const plan = PLAN_MAP[credits]; // ✅ Amount comes from server, not client

    // Only allow the request email to differ if it matches the session
    if (requestEmail && requestEmail !== userEmail && !isValidEmail(requestEmail)) {
      return NextResponse.json(
        { error: "Invalid email" },
        { status: 400 }
      );
    }

    // ✅ Metadata keys MUST match verifyStripeSession
    const metadata: Record<string, string> = {
      userEmail,                        // ✅ Matches verifier
      credits: String(credits),         // ✅ Matches verifier
      amount: String(plan.amount),
      planName: plan.name,
      createdAt: new Date().toISOString(),
    };

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${credits} Interview Credits`,
              description: `${plan.name} Plan — ${credits} AI-powered interview credits`,
            },
            unit_amount: Math.round(plan.amount * 100), // ✅ Server-computed amount
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${APP_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/billing?canceled=true`,
      customer_email: userEmail,
      metadata,                         // ✅ All strings, matches verifier
      billing_address_collection: "auto",
      allow_promotion_codes: true,
    });

    if (!checkoutSession.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error: unknown) {
    // ✅ Actually log the error this time
    if (error instanceof Stripe.errors.StripeError) {
      console.error("[checkout] Stripe error:", {
        type: error.type,
        code: error.code,
        message: error.message,
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
        case "StripeConnectionError":
          statusCode = 502;
          clientMessage = "Payment service temporarily unavailable";
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
        },
        { status: statusCode }
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[checkout] Unexpected error:", message);

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}