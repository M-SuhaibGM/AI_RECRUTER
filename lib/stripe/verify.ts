import "server-only";
import Stripe from "stripe";
import { prisma as db } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-06-20" as any,
});

interface VerifyArgs {
    sessionId: string;
    userEmail: string; // ✅ Match your schema — email-based
}

interface VerifyResult {
    alreadyProcessed: boolean;
    creditsAdded: number;
}

export async function verifyStripeSession({
    sessionId,
    userEmail,
}: VerifyArgs): Promise<VerifyResult> {
    // ✅ Idempotency — has this Stripe session already been recorded?
    const existing = await db.payment.findUnique({
        where: { stripeSessionId: sessionId },
    });

    if (existing) {
        return { alreadyProcessed: true, creditsAdded: 0 };
    }

    // ✅ Verify with Stripe — the source of truth
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (checkoutSession.payment_status !== "paid") {
        throw new Error("Payment not completed");
    }

    const sessionEmail = checkoutSession.metadata?.userEmail;

    if (!sessionEmail || sessionEmail !== userEmail) {
        throw new Error("Session does not belong to this user");
    }

    const creditsToAdd = Number(checkoutSession.metadata?.credits || 0);
    if (!creditsToAdd || creditsToAdd <= 0) {
        throw new Error("Invalid credits amount in session metadata");
    }

    // ✅ Stripe returns cents; store as your schema expects (Float)
    const amountInDollars = (checkoutSession.amount_total || 0) / 100;

    // ✅ Atomically: update user credits + record the payment
    await db.$transaction([
        db.user.update({
            where: { email: userEmail }, // ✅ Match your User model — use id if you have it
            data: { credits: { increment: creditsToAdd } },
        }),
        db.payment.create({
            data: {
                stripeSessionId: sessionId,
                userEmail,                    // ✅ Field name matches schema
                creditsAdded: creditsToAdd,   // ✅ Field name matches schema
                amount: amountInDollars,      // ✅ Converted from cents
            },
        }),
    ]);

    return { alreadyProcessed: false, creditsAdded: creditsToAdd };
}