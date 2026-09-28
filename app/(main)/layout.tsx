import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserCredits } from "@/actions/user";
import DashboardClientShell from "./provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  // Fetch credits on the server — no loading state, no client fetch
  const initialCredits = session?.user?.id
    ? await getUserCredits()
    : 0;

  return (
    <DashboardClientShell initialCredits={initialCredits}>
      <div className="p-10 mt-15">{children}</div>
    </DashboardClientShell>
  );
}