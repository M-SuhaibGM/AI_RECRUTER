"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CopyLinkButtonProps {
  url: string;
  variant?: "default" | "compact" | "icon";
  className?: string;
  onCopy?: () => void;
}

export default function CopyLinkButton({
  url,
  variant = "default",
  className = "",
  onCopy,
}: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  // ✅ Only clear the timer on unmount — never call setState
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // ✅ Reset copied state if URL changes
  useEffect(() => {
    setCopied(false);
  }, [url]);

  const handleCopy = useCallback(async () => {
    if (isCopying || !url) return;

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onCopy?.();

      toast.success("Link copied!", {
        description: "Share this with your candidate.",
        duration: 3000,
      });

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setCopied(false);
        timeoutRef.current = null;
      }, 2000);
    } catch (err) {
      console.error("Copy failed:", err);
      toast.error("Failed to copy link");
    } finally {
      setIsCopying(false);
    }
  }, [url, isCopying, onCopy]);

  // ─── Variants (unchanged) ───
  if (variant === "compact") {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={isCopying || !url}
        onClick={handleCopy}
        className={`gap-2 transition-colors ${
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
        <span className="text-xs font-medium">{copied ? "Copied!" : "Copy"}</span>
      </Button>
    );
  }

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        disabled={isCopying || !url}
        onClick={handleCopy}
        className={`h-9 w-9 transition-colors ${
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

  return (
    <Button
      variant="outline"
      disabled={isCopying || !url}
      onClick={handleCopy}
      className={`w-full py-5 border-blue-100 bg-blue-50/30 text-blue-600 
        hover:bg-blue-600 hover:text-white hover:border-blue-600 
        rounded-xl font-bold transition-colors flex gap-2 group/btn
        disabled:opacity-50 disabled:cursor-not-allowed
        ${
          copied
            ? "bg-green-50 text-green-600 border-green-200 hover:bg-green-600 hover:text-white hover:border-green-600"
            : ""
        } ${className}`}
      aria-label={copied ? "Link copied to clipboard" : "Copy interview link"}
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