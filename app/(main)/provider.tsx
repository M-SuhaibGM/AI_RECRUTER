"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import React from "react";
import { AppSidebar } from "../../components/ui/AppSidebar";
import WelcomeContainer from "./dashboard/_components/WelcomeContainer";
import { CreditsProvider } from "@/context/CreditsContext";

interface DashboardClientShellProps {
  children: React.ReactNode;
  initialCredits: number;
}

export default function DashboardClientShell({
  children,
  initialCredits,
}: DashboardClientShellProps) {
  return (
    <CreditsProvider initialCredits={initialCredits}>
      <SidebarProvider className="bg-slate-300">
        <AppSidebar />
        <div className="w-full">
          <WelcomeContainer />
          {children}
        </div>
      </SidebarProvider>
    </CreditsProvider>
  );
}