"use client";

import Image from "next/image";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { CoinsIcon, LogOut, User, Zap } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useCredits } from "@/context/CreditsContext"; // ✅

export default function WelcomeContainer() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user;
  
  // ✅ Read from context — no fetching!
  const { credits: liveCredits } = useCredits();

  // ✅ Only listen for updates (still useful for cross-tab sync)
  useEffect(() => {
    const handleCreditsUpdated = () => {
      // Context is managed by the provider — refetch by refreshing the page
      // OR you can add a `refetch` function to the context
      router.refresh();
    };
    window.addEventListener("credits-updated", handleCreditsUpdated);
    return () => window.removeEventListener("credits-updated", handleCreditsUpdated);
  }, [router]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  if (status === "loading") {
    return (
      <div className="fixed top-0 right-0 left-0 md:left-[var(--sidebar-width)] z-50 border-b border-blue-100 bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 md:py-4">
          <div className="flex justify-between items-center gap-3">
            <Skeleton className="h-9 w-40 bg-slate-100" />
            <Skeleton className="h-9 w-9 rounded-full bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const firstName = user?.name?.split(" ")[0] || "User";

  return (
    <div className="fixed top-0 right-0 left-0 md:left-[var(--sidebar-width)] z-50 border-b border-blue-100 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 md:py-4">
        <div className="flex justify-between items-center gap-3">
          <div className="min-w-0 flex-1 flex items-center gap-3">
            <SidebarTrigger className="lg:hidden md:block text-primary font-bold mb-0 shrink-0" />
            <div className="min-w-0 flex-1 space-y-0.5 md:space-y-1">
              <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                <h2 className="text-base sm:text-lg md:text-2xl font-extrabold text-slate-800 truncate">
                  Welcome back, <span className="text-blue-600">{firstName}!</span>
                </h2>
                <Zap className="w-4 h-4 md:w-5 md:h-5 text-amber-400 fill-amber-400 shrink-0" />
              </div>
              <p className="hidden md:block text-slate-500 text-sm md:text-base font-medium">
                Manage your AI interviews and track candidate progress.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <Link href="/billing" aria-label={`Credits: ${liveCredits}`}>
              <div className="flex sm:hidden items-center gap-1.5 px-2.5 py-2 bg-white border border-blue-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group">
                <div className="bg-blue-600 p-1 rounded-md group-hover:rotate-12 transition-transform">
                  <CoinsIcon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs font-bold text-slate-700">{liveCredits}</span>
              </div>
              <div className="hidden sm:flex items-center gap-3 px-4 py-2.5 bg-white border border-blue-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group">
                <div className="bg-blue-600 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
                  <CoinsIcon className="h-4 w-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    Credits
                  </span>
                  <span className="text-sm font-bold text-slate-700">{liveCredits}</span>
                </div>
              </div>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Open profile menu"
                  className="p-1 border-2 border-transparent hover:border-blue-600 rounded-full transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Image
                    src={user?.image || "/avatar.jpg"}
                    alt={user?.name || "User avatar"}
                    width={44}
                    height={44}
                    className="rounded-full select-none shadow-md ring-2 ring-white w-9 h-9 md:w-11 md:h-11"
                    priority
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-2xl border-blue-50 mt-2">
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold leading-none text-slate-800">{user?.name || "User"}</p>
                    <p className="text-xs leading-none text-slate-500 truncate">{user?.email || ""}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-blue-50" />
                <DropdownMenuItem className="flex items-center gap-2 p-3 rounded-xl cursor-pointer hover:bg-blue-50 text-slate-600 focus:bg-blue-50">
                  <Link href="/settings" className="flex items-center gap-2 w-full">
                    <User className="w-4 h-4" /> Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2 p-3 rounded-xl cursor-pointer text-red-600 hover:bg-red-50 focus:bg-red-50"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}