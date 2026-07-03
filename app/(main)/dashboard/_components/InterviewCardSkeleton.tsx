// components/InterviewCardSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

export default function InterviewCardSkeleton() {
  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] animate-pulse">
      {/* Top Section: Date & AI Badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>

      {/* Job Title */}
      <div className="space-y-2 mb-4">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between py-4 border-y border-slate-100 mb-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-14" />
          </div>
        </div>
        
        <Skeleton className="h-8 w-px" />
        
        <div className="flex flex-col gap-2 items-end">
          <Skeleton className="h-3 w-16" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
      </div>

      {/* Action Button */}
      <Skeleton className="h-12 w-full rounded-xl mt-2" />
    </div>
  );
}