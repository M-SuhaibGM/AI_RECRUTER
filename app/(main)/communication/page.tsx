import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInterviewsForUser } from "@/actions/interview";
import CommunicationClient from "./_components/CommunicationClient";

export default async function CommunicationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const interviews = await getInterviewsForUser(session.user.email);

  return <CommunicationClient initialInterviews={interviews} />;
}