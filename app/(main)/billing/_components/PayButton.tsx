"use client";

import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

interface PayButtonProps {
  amount: number;
  credits: number;
  onSuccess?: (creditsAdded: number) => void;
  className?: string;
}

const PayButton: React.FC<PayButtonProps> = ({
  amount,
  credits,
  onSuccess,
  className,
}) => {
  const { data: session } = useSession();
  const user = session?.user;
  const [loading, setLoading] = useState(false);
  // ✅ Prevent double-clicks even if React hasn't re-rendered yet
  const inFlightRef = useRef(false);

  const handleCheckout = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    if (!user?.email) {
      toast.error("Please sign in to continue.");
      return;
    }

    inFlightRef.current = true;
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, credits, email: user.email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Payment initiation failed.");
      }

      if (data.url) {
        // ✅ Redirect to Stripe
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      toast.error(message);
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [amount, credits, user?.email]);

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading || !user?.email}
      className={`w-full bg-blue-600 cursor-pointer text-white rounded-md font-medium 
        hover:bg-blue-700 shadow-lg shadow-blue-100 
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-300 active:scale-95
        ${className ?? ""}`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="animate-spin w-4 h-4" />
          Processing…
        </span>
      ) : (
        `Buy for $${amount.toFixed(2)}`
      )}
    </Button>
  );
};

export default PayButton;