"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import axios, { AxiosError } from "axios";

// ─── Type Definitions ───
interface PayButtonProps {
  amount: number;
  credits: number;
  className?: string;
}

interface CheckoutResponse {
  url: string;
}

interface AddCreditsResponse {
  success: boolean;
  message?: string;
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

// ─── PayButton Component ───
const PayButton: React.FC<PayButtonProps> = ({ amount, credits, className }) => {
  const { data: session, update } = useSession();
  const user = session?.user;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<boolean>(false);
  const verifyCalledRef = useRef<boolean>(false);



  // ─── Verify Payment and Add Credits ───
  const verifyAndAddCredits = useCallback(async (sessionId: string): Promise<void> => {
    setLoading(true);
    try {
      const result = await axios.post<AddCreditsResponse>("/api/add-credits", { sessionId });

      if (result.data.success) {
        // Update session to reflect new credits
        await update();

        // Dispatch custom event for credits update
        window.dispatchEvent(new CustomEvent("credits-updated"));

        toast.success(`${credits} credits added successfully! 🎉`, {
          description: "Your credits have been added to your account.",
          duration: 5000,
        });

        // Redirect to billing page after a short delay
        setTimeout(() => {
          router.replace("/billing");
        }, 1500);
      }
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;

      // 400 = not paid yet, ignore silently
      if (error?.response?.status !== 400) {
        console.error("Error verifying payment:", error);
        toast.error("Could not verify payment.", {
          description: error?.response?.data?.message || "Please try again or contact support.",
        });
      }
    } finally {
      setLoading(false);

      // Clean up URL parameters
      if (verifyCalledRef.current) {
        router.replace("/billing");
      }
    }
  }, [credits, update, router]);


  // ─── Verify Payment on Return from Stripe ───
  useEffect(() => {
    const success = searchParams.get("success");
    const sessionId = searchParams.get("session_id");

    // Guard: only run once per page load and ensure user email exists
    if (success === "true" && sessionId && user?.email && !verifyCalledRef.current) {
      verifyCalledRef.current = true;
      verifyAndAddCredits(sessionId);
    }
  }, [searchParams, user?.email, verifyAndAddCredits]);



  // ─── Handle Checkout ───
  const handleCheckout = async (): Promise<void> => {
    if (!user?.email) {
      toast.error("Please sign in to continue.", {
        description: "You need to be logged in to make a purchase.",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post<CheckoutResponse>("/api/checkout", {
        amount,
        credits,
        email: user.email,
      });

      if (response.data.url) {
        // Redirect to Stripe checkout
        window.location.href = response.data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      console.error("Checkout error:", error);

      toast.error("Payment initiation failed.", {
        description: error?.response?.data?.message || "Please try again later.",
      });
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