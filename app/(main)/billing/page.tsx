// app/(main)/billing/page.tsx
import { Suspense } from "react";
import Billing from "./_components/BillingContent";

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="p-4 md:p-6 bg-slate-50 h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading billing...</p>
        </div>
      </div>
    }>
      <Billing />
    </Suspense>
  );
}