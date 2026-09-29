import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInterviewsForUser } from "@/actions/interview";
import DashboardClient from "./_components/DashboardClient";
import CreateOptions from "./_components/CreateOptions";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) return null;

  const interviews = await getInterviewsForUser(session.user.email);

  return (
    <div className="space-y-6">
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

      <CreateOptions />

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">
          Recent Interviews
        </h3>

        <DashboardClient initialInterviews={interviews} />
      </div>
    </div>
  );
}