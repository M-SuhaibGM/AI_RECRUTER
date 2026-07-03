"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SideBarOption } from "@/services/Constants";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PlusCircle, Bot } from "lucide-react";

export function AppSidebar() {
  const path = usePathname();
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const handleClick = () => {
    router.replace("/dashboard/create-interview");
  };

  return (
    <Sidebar
      defaultOpen={isDesktop}
      className="border-r border-slate-200 bg-white"
    >
      {/* Header with Logo */}
      <SidebarHeader className="px-6 py-6 flex flex-col items-center">
        <div className="flex  mb-8 items-center gap-2.5 cursor-pointer select-none" onClick={() => router.push("/")}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", boxShadow: "0 4px 14px rgba(37,99,235,.35)" }}>
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-.01em", color: "#0c0f1a" }}>
            <span style={{ color: "#2563eb" }}>AI</span>Recruiter
          </span>
        </div>

        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-100 rounded-xl py-6 flex items-center justify-center gap-2 group transition-all"
          onClick={handleClick}
        >
          <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          <span className="font-bold">Create New</span>
        </Button>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarMenu className="gap-1">
            {SideBarOption.map((option, index) => {
              const isActive = option.path === "/"
                ? path === "/"
                : path.startsWith(option.path);
              return (
                <SidebarMenuItem key={index}>
                  <SidebarMenuButton
                    asChild
                    className={`relative flex items-center h-12 px-4 rounded-xl transition-all duration-200 group
                      ${isActive
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                  >
                    <Link href={option.path} className="flex items-center gap-3 w-full">
                      {/* Active Indicator Pill */}
                      {isActive && (
                        <div className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full" />
                      )}

                      <option.icon
                        className={`w-5 h-5 transition-colors 
                          ${isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`}
                      />

                      <span className="text-[15px]">{option.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-slate-50">
        <div className="bg-slate-50 rounded-2xl p-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Support</p>
          <Link href="/help" className="text-sm text-slate-600 hover:text-blue-600 transition-colors">
            Help Center
          </Link>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}