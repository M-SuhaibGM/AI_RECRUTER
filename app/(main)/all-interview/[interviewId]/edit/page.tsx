import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import EditInterviewClient from "../component/EditInterviewClient";

export default function EditInterviewPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  return (
    <Suspense fallback={<EditFormSkeleton />}>
      <EditInterviewData params={params} />
    </Suspense>
  );
}

async function EditInterviewData({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;

  // ✅ Auth
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/auth/login");

  // ✅ Fetch + ownership check in a single query
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    select: {
      id: true,
      jobPosition: true,
      jobDescription: true,
      duration: true,
      userEmail: true,
    },
  });

  if (!interview || interview.userEmail !== session.user.email) {
    notFound();
  }

  return (
    <EditInterviewClient
      interviewId={interview.id}
      initialData={{
        jobPosition: interview.jobPosition ?? "",
        duration: interview.duration ?? "",
        jobDescription: interview.jobDescription ?? "",
      }}
    />
  );
}

function EditFormSkeleton() {
  return (
    <div className="max-w-3xl mx-auto p-6 bg-white border rounded-xl shadow-md mt-10 animate-pulse">
      <div className="h-8 w-64 bg-slate-200 rounded mb-6" />
      <div className="space-y-5">
        <div className="h-12 bg-slate-100 rounded-xl" />
        <div className="h-12 bg-slate-100 rounded-xl" />
        <div className="h-40 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}