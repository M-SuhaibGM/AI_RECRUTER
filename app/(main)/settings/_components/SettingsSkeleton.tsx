import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsSkeleton() {
  return (
    <div className="bg-slate-50 min-h-[70vh] flex flex-col rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
      {/* Header Skeleton */}
      <div className="p-6 border-b bg-white flex justify-between items-center shrink-0">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* Body Skeleton */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Profile + Plan Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-3">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </section>

          <section className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <div className="p-5 bg-slate-200 rounded-2xl h-[calc(100%-2rem)] space-y-3">
              <Skeleton className="h-3 w-24 bg-slate-300" />
              <Skeleton className="h-6 w-36 bg-slate-300" />
              <Skeleton className="h-5 w-28 rounded-full bg-slate-300" />
            </div>
          </section>
        </div>

        {/* AI Agent Config Skeleton */}
        <section className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          </div>

          <Skeleton className="h-10 w-48 rounded-lg" />
        </section>

        {/* Transaction History Skeleton */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b">
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-4" />
                ))}
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 grid grid-cols-4 gap-4">
                  <Skeleton className="h-4" />
                  <Skeleton className="h-4" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security Notice Skeleton */}
        <section className="p-4 bg-slate-100 rounded-2xl flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded-full shrink-0" />
          <Skeleton className="h-4 flex-1" />
        </section>
      </div>

      {/* Footer Skeleton */}
      <div className="p-4 bg-white border-t shrink-0">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}