"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import axios from "axios";

interface PayButtonProps {
  amount: number;
  credits: number;
  className?: string;
}

const PayButton: React.FC<PayButtonProps> = ({ amount, credits, className }) => {
  const { data: session } = useSession();
  const user = session?.user;
  const [loading, setLoading] = useState<boolean>(false);

  // ─── Handle Checkout ───
  const handleCheckout = async (): Promise<void> => {
    if (!user?.email) {
      toast.error("Please sign in to continue.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("/api/checkout", {
        amount,
        credits,
        email: user.email,
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Payment initiation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading}
      className={`w-full bg-blue-600 cursor-pointer text-white rounded-md font-medium 
        hover:bg-blue-700 shadow-lg shadow-blue-100 
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-300 active:scale-95
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