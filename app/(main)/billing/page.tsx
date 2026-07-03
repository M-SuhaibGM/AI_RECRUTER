"use client";
import { ArrowRight, CreditCard, Check, Zap, ShieldCheck, Trophy, LucideIcon } from "lucide-react";
import React, { useEffect, useState, useCallback } from "react";
import PayButton from "./_components/PayButton";
import { useSession } from "next-auth/react";
import { getUserCredits } from "@/actions/user";

// ─── Type Definitions ───
interface Plan {
  name: string;
  price: string;
  interviews: number;
  icon: LucideIcon;
  recommended?: boolean;
  features: string[];
}

interface SkeletonCardProps {
  recommended?: boolean;
}

// ─── Plans Data ───
const plans: Plan[] = [
  {
    name: "Basic",
    price: "5",
    interviews: 20,
    icon: Zap,
    features: ["Templates", "Email support", "AI Voice"],
  },
  {
    name: "Standard",
    price: "12",
    interviews: 50,
    icon: ShieldCheck,
    recommended: true,
    features: ["All templates", "Priority support", "Analytics", "Custom Links"],
  },
  {
    name: "Pro",
    price: "25",
    interviews: 120,
    icon: Trophy,
    features: ["Unlimited", "24/7 support", "Advanced Analytics", "Teams"],
  },
];

// ─── Skeleton Components ───

function SkeletonCard({ recommended }: SkeletonCardProps): React.ReactElement {
  return (
    <div className={`relative flex flex-col p-4 bg-white rounded-2xl border animate-pulse ${
      recommended ? "border-blue-200 shadow-md ring-2 ring-blue-50" : "border-slate-100"
    }`}>
      {recommended && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-blue-200 text-transparent text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-tighter">
          Popular
        </div>
      )}
      {/* Icon */}
      <div className="w-8 h-8 rounded-lg bg-slate-200 mb-3 mt-4" />
      {/* Title */}
      <div className="h-4 w-20 bg-slate-200 rounded mb-2" />
      {/* Price */}
      <div className="h-7 w-14 bg-slate-200 rounded mb-1.5" />
      {/* Interviews */}
      <div className="h-3 w-24 bg-blue-100 rounded mb-4" />
      {/* Features */}
      <div className="flex-1 space-y-2 mb-4">
        {[1, 2, 3].map((i: number) => (
          <div key={i} className="h-3 bg-slate-100 rounded w-full" />
        ))}
      </div>
      {/* Button */}
      <div className="h-9 w-full bg-slate-200 rounded-xl mt-auto" />
    </div>
  );
}

function SkeletonBalance(): React.ReactElement {
  return (
    <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm h-full flex flex-col justify-center animate-pulse">
      <div className="h-4 w-32 bg-slate-200 rounded mb-1" />
      <div className="h-3 w-24 bg-slate-100 rounded mb-4" />
      <div className="bg-blue-200 rounded-xl p-4">
        <div className="h-3 w-16 bg-blue-100 rounded mb-2" />
        <div className="h-9 w-20 bg-blue-100 rounded mb-1" />
        <div className="h-2.5 w-16 bg-blue-100 rounded" />
      </div>
    </div>
  );
}

// ─── Main Billing Component ───
function Billing(): React.ReactElement {
  const { data: session } = useSession();
  const user = session?.user;
  const [credits, setLiveCredits] = useState<number | null>(null);
  const [pageReady, setPageReady] = useState<boolean>(false);

  // Fetch credits function
  const fetchCredits = useCallback(async (): Promise<void> => {
    try {
      const c: number = await getUserCredits();
      setLiveCredits(c);
    } catch (error) {
      console.error("Failed to fetch credits:", error);
      setLiveCredits(0);
    } finally {
      setPageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // Initial fetch
    fetchCredits();

    // Re-fetch when PayButton fires the event (after successful payment)
    const handleCreditsUpdated = (): void => {
      fetchCredits();
    };

    window.addEventListener("credits-updated", handleCreditsUpdated);
    
    return () => {
      window.removeEventListener("credits-updated", handleCreditsUpdated);
    };
  }, [user?.id, fetchCredits]);

  const isLoading: boolean = !pageReady || credits === null;

  return (
    <div className="p-4 md:p-6 bg-slate-50 h-[70vh] flex flex-col overflow-hidden">

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-slate-900">Billing & Credits</h1>
        <p className="text-slate-500 text-xs">Manage your usage and top up your credits.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 overflow-hidden min-h-0">

        {/* LEFT: Balance Card */}
        <div className="lg:col-span-1 h-full">
          {isLoading ? (
            <SkeletonBalance />
          ) : (
            <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm relative h-full flex flex-col justify-center">
              <h2 className="font-bold text-base text-slate-800 mb-1">Account Credits</h2>
              <p className="text-[10px] text-slate-500 mb-4">Conduct AI interviews.</p>
              <div className="bg-blue-600 rounded-xl p-4 text-white shadow-lg shadow-blue-200">
                <div className="flex items-center gap-2 mb-1 opacity-80">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Balance</span>
                </div>
                <div className="text-3xl font-black">{credits}</div>
                <p className="text-blue-100 text-[9px] uppercase">Remaining</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Plan Cards */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3 h-full overflow-hidden">
          {isLoading ? (
            // Show skeleton cards while loading
            plans.map((plan: Plan) => (
              <SkeletonCard key={plan.name} recommended={plan.recommended} />
            ))
          ) : (
            plans.map((plan: Plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col p-4 bg-white rounded-2xl border transition-all ${
                  plan.recommended
                    ? "border-blue-600 shadow-md ring-2 ring-blue-50"
                    : "border-slate-200"
                }`}
              >
                {plan.recommended && (
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-tighter shadow-sm z-10">
                    Popular
                  </div>
                )}
                <div className="mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 mt-4 ${
                    plan.recommended ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"
                  }`}>
                    <plan.icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 leading-tight">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-slate-900">${plan.price}</span>
                  </div>
                  <p className="text-blue-600 font-bold text-xs">{plan.interviews} Interviews</p>
                </div>

                <ul className="flex-1 space-y-1.5 mb-4 overflow-hidden">
                  {plan.features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-center gap-2 text-[11px] text-slate-600">
                      <Check className="w-3 h-3 text-blue-600 flex-shrink-0" />
                      <span className="truncate">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  <PayButton
                    amount={Number(plan.price)}
                    credits={plan.interviews}
                    className="w-full py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Billing;