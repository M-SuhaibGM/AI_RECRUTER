"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

// ─── Type Definitions ───
interface CopyLinkButtonProps {
  url: string;
  variant?: "default" | "compact" | "icon";
  className?: string;
  onCopy?: () => void;
}

// ─── Main Component ───
export default function CopyLinkButton({ 
  url, 
  variant = "default",
  className = "",
  onCopy 
}: CopyLinkButtonProps): React.ReactElement {
  const [copied, setCopied] = useState<boolean>(false);
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const timeoutRef = useRef<number | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      setCopied(false);
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // ─── Handle Copy ───
  const handleCopy = useCallback(async (): Promise<void> => {
    if (isCopying || !url) return;
    
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      
      toast.success("Link copied to clipboard!", {
        description: "You can now share this interview link with candidates.",
        duration: 3000,
        position: "bottom-right",
      });

      // Callback after successful copy
      onCopy?.();
      
      // Reset copied state after 2 seconds
      timeoutRef.current = window.setTimeout(() => {
        setCopied(false);
        timeoutRef.current = null;
      }, 2000);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Failed to copy link:", error.message);
      
      // Fallback for older browsers
      toast.error("Failed to copy link", {
        description: "Please try again or copy the link manually.",
        action: {
          label: "Retry",
          onClick: () => handleCopy(),
        },
      });
    } finally {
      setIsCopying(false);
    }
  }, [url, isCopying, onCopy]);

  // ─── Compact Variant ───
  if (variant === "compact") {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={isCopying || !url}
        onClick={handleCopy}
        className={`gap-2 transition-all ${
          copied 
            ? "bg-green-50 text-green-600 border-green-200" 
            : "text-blue-600 border-blue-100 hover:bg-blue-50"
        } ${className}`}
        aria-label={copied ? "Link copied" : "Copy link"}
      >
        {isCopying ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : copied ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
        <span className="text-xs font-medium">
          {copied ? "Copied!" : "Copy"}
        </span>
      </Button>
    );
  }

  // ─── Icon Only Variant ───
  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        disabled={isCopying || !url}
        onClick={handleCopy}
        className={`h-9 w-9 transition-all ${
          copied 
            ? "text-green-600 hover:bg-green-50" 
            : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
        } ${className}`}
        aria-label={copied ? "Link copied" : "Copy link"}
      >
        {isCopying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : copied ? (
          <Check className="w-4 h-4" />
        ) : (
          <Link2 className="w-4 h-4" />
        )}
      </Button>
    );
  }

  // ─── Default Full Variant ───
  return (
    <Button
      variant="outline"
      disabled={isCopying || !url}
      onClick={handleCopy}
      className={`w-full py-5 border-blue-100 bg-blue-50/30 text-blue-600 
        hover:bg-blue-600 hover:text-white hover:border-blue-600 
        rounded-xl font-bold transition-all flex gap-2 group/btn
        disabled:opacity-50 disabled:cursor-not-allowed
        ${copied 
          ? "bg-green-50 text-green-600 border-green-200 hover:bg-green-600 hover:text-white hover:border-green-600" 
          : ""
        } ${className}`}
      aria-label={copied ? "Link copied to clipboard" : "Copy interview link to clipboard"}
    >
      {isCopying ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Copying...
        </>
      ) : copied ? (
        <>
          <Check className="w-4 h-4 scale-110 transition-transform" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
          Copy Interview Link
        </>
      )}
    </Button>
  );
}