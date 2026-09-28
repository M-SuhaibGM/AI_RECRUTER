"use client";
import { SidebarProvider } from "@/components/ui/sidebar";
import React from "react";
import { AppSidebar } from "../../components/ui/AppSidebar";
import WelcomeContainer from "./dashboard/_components/WelcomeContainer";

function DashboardProvider({ children }) {
  return (
    <SidebarProvider className={" bg-slate-300"} open={undefined} onOpenChange={undefined} style={undefined} >
      <AppSidebar />
      <div className="w-full">
        {/* <SidebarTrigger className="lg:hidden md:block text-primary font-bold mb-4" onClick={undefined} /> */}
        <WelcomeContainer />
        {children}
      </div>
    </SidebarProvider>
  );
}

export default DashboardProvider;
