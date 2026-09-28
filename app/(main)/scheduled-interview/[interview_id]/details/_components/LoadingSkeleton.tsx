import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingSkeleton() {
  return (
    <div className="space-y-2 h-[68vh] overflow-hidden pr-2 animate-pulse">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-50" />
        <Skeleton className="h-4 w-75" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-62.5 rounded-lg" />
        <Skeleton className="h-4 w-87.5 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-6 w-50" />
              <Skeleton className="h-4 w-37.5" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <Skeleton className="h-6 w-45 mb-6" />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-30" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-8 w-25 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}