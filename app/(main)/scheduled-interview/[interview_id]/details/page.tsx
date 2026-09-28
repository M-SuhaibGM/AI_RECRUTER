import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInterviewDetail } from "@/actions/interview-detail";
import InterviewDetailsClient from "./_components/InterviewDetailsClient";
import LoadingSkeleton from "./_components/LoadingSkeleton";

interface PageProps {
  params: Promise<{ interview_id: string }>;
}

export default function InterviewDetailsPage({ params }: PageProps) {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <InterviewDetailsData params={params} />
    </Suspense>
  );
}

async function InterviewDetailsData({ params }: PageProps) {
  const { interview_id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/auth/login");

  // ✅ Server action handles ownership check
  const interview = await getInterviewDetail(interview_id, session.user.email);
  if (!interview) notFound();

  return <InterviewDetailsClient interviewDetail={interview} />;
}