"use client";

import { ArrowLeft, Clock, Copy, Check, List, Mail, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type InterviewFormValues } from "@/lib/validations/interview";

type InterviewLinkProps = {
  interview_id?: string;
  formData: InterviewFormValues;
};

const HOST_URL = process.env.NEXT_PUBLIC_HOST_URL || "";

function InterviewLink({ interview_id, formData }: InterviewLinkProps) {
  const [copied, setCopied] = useState(false);

  // ✅ Memoize URL — no reason to compute on every render
  const url = useMemo(
    () => (interview_id ? `${HOST_URL}/interview/${interview_id}` : ""),
    [interview_id]
  );

  // ✅ Stabilized copy handler with visual feedback
  const onCopyLink = useCallback(async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }, [url]);

  // ✅ Guard against missing interview_id
  if (!interview_id) {
    return (
      <div className="mt-10 flex flex-col items-center justify-center">
        <p className="text-slate-500">
          Interview not found. Please create a new one.
        </p>
        <Link href="/dashboard/create-interview" className="mt-4">
          <Button>
            <Plus /> Create New Interview
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-col items-center justify-center">
      <Image
        src="/check.png"
        alt="successfully created"
        height={50}
        width={50}
        className="h-12.5 w-12.5"
        priority
      />

      <h2 className="mt-4 text-lg font-bold">Your AI Interview is Ready!!!</h2>
      <p className="mt-3">Share this link with your candidates to start the interview process.</p>

      <div className="mt-6 w-full rounded-lg bg-white p-7">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Interview Link</h2>
          <h2 className="rounded-md bg-blue-50 p-1 px-2 text-primary">
            Valid for 30 Days
          </h2>
        </div>

        <div className="mt-2 flex items-center gap-4">
          <Input
            type="text"
            className="w-full"
            value={url}
            readOnly
            onFocus={(e) => e.target.select()}
            aria-label="Interview link"
          />
          <Button
            onClick={onCopyLink}
            className="cursor-pointer min-w-30"
            aria-label="Copy interview link"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Link
              </>
            )}
          </Button>
        </div>

        <hr className="my-5" />

        <div className="flex gap-5">
          <h2 className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" /> {formData.duration}
          </h2>
          <h2 className="flex items-center gap-2 text-sm text-gray-500">
            <List className="h-4 w-4" /> 10 Questions
          </h2>
        </div>
      </div>

      <div className="mt-7 w-full rounded-lg bg-white p-5">
        <h2 className="font-bold">Share Via</h2>
        <div className="mt-3 flex gap-7">
          {/* ✅ Button asChild — no nested <a><button> */}
          <Button asChild variant="outline">
            <Link href="/communication" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 flex w-full justify-between gap-5">
        <Button asChild variant="outline">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </Button>

        <Button asChild>
          <Link href="/dashboard/create-interview" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create New Interview
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default InterviewLink;