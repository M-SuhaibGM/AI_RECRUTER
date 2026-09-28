import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserPayments } from "@/actions/payment-actions";
import { getUserConfig } from "@/actions/user";
import SettingsClient from "./_components/SettingsClient";
import SettingsSkeleton from "./_components/SettingsSkeleton";

async function SettingsData() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/auth/login");

  // ✅ Fetch both in parallel
  const [config, paymentsResult] = await Promise.all([
    getUserConfig(session.user.email),
    getUserPayments(),
  ]);

  const payments = paymentsResult.success ? paymentsResult.payments : [];

  return (
    <SettingsClient
      user={{
        name: session.user.name ?? "User",
        email: session.user.email,
        image: session.user.image ?? null,
      }}
      initialConfig={config}
      initialPayments={payments}
    />
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsData />
    </Suspense>
  );
}