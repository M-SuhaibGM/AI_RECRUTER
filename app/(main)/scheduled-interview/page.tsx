import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCandidateReports } from "@/actions/interview-reports";
import ScheduledInterviewClient from "./_components/ScheduledInterviewClient";
import CandidateReviewSkeleton from "./_components/loading";

export default function ScheduledInterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="mt-8 space-y-4">
          <CandidateReviewSkeleton />
          <CandidateReviewSkeleton />
          <CandidateReviewSkeleton />
        </div>
      }
    >
      <ReportsData />
    </Suspense>
  );
}

async function ReportsData() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/auth/login?callbackUrl=/scheduled-interview");
  }

  // ✅ Direct DB call via server action
  const reports = await getCandidateReports(session.user.email);

  return <ScheduledInterviewClient initialReports={reports} />;
}