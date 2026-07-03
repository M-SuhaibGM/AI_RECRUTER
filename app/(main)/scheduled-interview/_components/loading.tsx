import React from "react";

function CandidateReviewSkeleton() {
  return (
    <div className="w-full bg-white border border-slate-100 rounded-xl p-6 mb-4 animate-pulse">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        
        {/* Left Side Skeleton */}
        <div className="flex-1">
          <div className="flex gap-3 mb-3">
            <div className="h-5 w-20 bg-slate-200 rounded"></div>
            <div className="h-5 w-24 bg-slate-100 rounded"></div>
          </div>
          <div className="h-7 w-3/4 bg-slate-200 rounded mb-3"></div>
          <div className="flex gap-4">
            <div className="h-4 w-16 bg-slate-100 rounded"></div>
            <div className="h-4 w-32 bg-slate-100 rounded"></div>
          </div>
        </div>

        {/* Right Side Skeleton (Button) */}
        <div className="w-full md:w-[200px]">
          <div className="h-12 w-full bg-slate-200 rounded-lg"></div>
        </div>
        
      </div>
    </div>
  );
}

export default CandidateReviewSkeleton;