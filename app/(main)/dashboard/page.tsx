import React, { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // adjust path
import { getInterviewsForUser } from "@/actions/interview"; // create this server action
import DashboardClient from "./_components/DashboardClient";
import InterviewCardGridSkeleton from "./_components/InterviewCardGridSkeleton";
import CreateOptions from "./_components/CreateOptions";

// This is now a Server Component
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // If no user, render nothing (middleware should handle redirect)
  if (!session?.user?.email) return null;

  // Fetch data on the server — no loading spinner needed
  const interviews = await getInterviewsForUser(session.user.email);

  return (
    <div className="space-y-6">
      {/* Header Section — can be server-rendered too */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-bold text-2xl text-slate-900">Dashboard</h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-bold">
              {interviews.length} Active
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Manage your AI-powered interviews and track candidate progress.
          </p>
        </div>
      </div>

      {/* Create Options — can be a client component for interactivity */}
      <CreateOptions />

      {/* Interview Cards Section */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">
          Recent Interviews
        </h3>

        {/* The client component only handles the interactive parts */}
        <Suspense fallback={<InterviewCardGridSkeleton count={3} />}>
          <DashboardClient initialInterviews={interviews} />
        </Suspense>
      </div>
    </div>
  );
}