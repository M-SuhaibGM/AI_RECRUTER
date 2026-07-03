import { ArrowLeft, Clock, Copy, List, Mail, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type InterviewFormValues } from "@/lib/validations/interview";

type InterviewLinkProps = {
  interview_id?: string;
  formData: InterviewFormValues;
};

function InterviewLink({ interview_id, formData }: InterviewLinkProps) {
  const GetInterviewUrl = () => `${process.env.NEXT_PUBLIC_HOST_URL}/interview/${interview_id}`;

  const url = GetInterviewUrl();

  const onCopyLink = async () => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  return (
    <div className="mt-10 flex flex-col items-center justify-center">
      <Image src="/check.png" alt="successfully created" height={200} width={200} className="h-[50px] w-[50px]" />
      <h2 className="mt-4 text-lg font-bold">Your AI Interview is Ready!!!</h2>
      <p className="mt-3">Share this link with your candidates to start the interview process.</p>
      <div className="mt-6 w-full rounded-lg bg-white p-7">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Interview Link</h2>
          <h2 className="rounded-md bg-blue-50 p-1 px-2 text-primary">Valid for 30 Days</h2>
        </div>
        <div className="mt-2 flex items-center gap-4">
          <Input type="text" className="w-full" value={url} disabled />
          <Button onClick={() => void onCopyLink()} className="cursor-pointer">
            <Copy />
            Copy Link
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
          <Button variant="outline" className="">
            <Link href="/communication" className="flex items-center gap-2">
              <Mail />
              Email
            </Link>
          </Button>
        </div>
      </div>
      <div className="mt-6 flex w-full justify-between gap-5">
        <Link href="/dashboard">
          <Button variant="outline" className="">
            <ArrowLeft />
            Back to Dashboard
          </Button>
        </Link>
        <Link href="/dashboard/create-interview">
          <Button className="">
            <Plus />
            Create New Interview
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default InterviewLink;
