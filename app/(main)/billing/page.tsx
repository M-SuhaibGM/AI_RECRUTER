import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyStripeSession } from "@/lib/stripe/verify";
import BillingClient from "./_components/BillingClient";
import { getUserCredits } from "@/actions/user";

function BillingSkeleton() {
  return (
    <div className="p-4 md:p-6 bg-slate-50 h-[70vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading billing...</p>
      </div>
    </div>
  );
}

// ✅ Plain, resolved shape — this is what BillingData receives
type BillingSearchParams = {
  success?: string;
  session_id?: string;
};

async function BillingData({
  searchParams,
}: {
  searchParams: BillingSearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");

  // ✅ Already resolved — no await here
  if (searchParams.success === "true" && searchParams.session_id) {
    await verifyStripeSession({
      sessionId: searchParams.session_id,
      userEmail: session.user.email!,
    });
    // Clean URL by redirecting to /billing (no query params)
    redirect("/billing");
  }

  const credits = await getUserCredits();

  return <BillingClient initialCredits={credits} />;
}

export default async function BillingPage({
  searchParams,
}: {
  // ✅ Next.js 15: searchParams is a Promise
  searchParams: Promise<BillingSearchParams>;
}) {
  // ✅ Await it ONCE at the top-level page
  const params = await searchParams;

  return (
    <Suspense fallback={<BillingSkeleton />}>
      <BillingData searchParams={params} />
    </Suspense>
  );
}