import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInterviewsForUser } from "@/actions/interview";
import AllInterviewClient from "./_components/AllInterviewList";

export const dynamic = "force-dynamic"; // always fresh data

export default function AllInterviewPage() {
  return (
    <Suspense fallback={<AllInterviewSkeleton />}>
      <AllInterviewData />
    </Suspense>
  );
}

async function AllInterviewData() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/auth/login");

  const interviews = await getInterviewsForUser(session.user.email);

  return <AllInterviewClient interviews={interviews} />;
}

// ✅ Inline skeleton (no dynamic import needed for such a small component)
function AllInterviewSkeleton() {
  return (
    <div className="bg-white border rounded-[30px] shadow-sm overflow-hidden flex flex-col" style={{ height: "80vh" }}>
      <div className="p-6 border-b bg-white shrink-0">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
      </div>
      <div className="flex-1 p-6 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}