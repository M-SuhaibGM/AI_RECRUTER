import InterviewCardGridSkeleton from "./_components/InterviewCardGridSkeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-4 w-96 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-40 bg-white border border-slate-100 rounded-2xl animate-pulse" />
        <div className="h-40 bg-white border border-slate-100 rounded-2xl animate-pulse" />
      </div>

      <div className="mt-6 space-y-4">
        <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
        <InterviewCardGridSkeleton count={3} />
      </div>
    </div>
  );
}