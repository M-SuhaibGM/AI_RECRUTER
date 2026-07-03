"use client";
import Image from "next/image";
import React from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { getUserCredits } from "@/actions/user";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { CoinsIcon, LogOut, User, Zap } from "lucide-react";

// ─── Type Definitions ───
interface UserSession {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

// ─── WelcomeContainer Component ───
export default function WelcomeContainer() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user: UserSession | undefined = session?.user;
  const [liveCredits, setLiveCredits] = useState<number>(0);

  // Fetch credits function
  const fetchCredits = async (): Promise<void> => {
    try {
      const credits: number = await getUserCredits();
      setLiveCredits(credits);
    } catch (error) {
      console.error("Failed to fetch credits:", error);
      setLiveCredits(0);
    }
  };

  // Initial fetch when user is available
  useEffect(() => {
    if (user?.id) {
      fetchCredits();
    }
  }, [user]);

  // Credits update listener
  useEffect(() => {
    if (!user?.id) return;

    fetchCredits();

    const handleCreditsUpdated = (): void => {
      fetchCredits();
    };

    window.addEventListener("credits-updated", handleCreditsUpdated);

    return () => {
      window.removeEventListener("credits-updated", handleCreditsUpdated);
    };
  }, [user]);

  // Handle logout
  const handleLogout = async (): Promise<void> => {
    await signOut({ callbackUrl: "/" });
  };

  // Loading state with skeleton
  if (status === "loading") {
    return (
      <div className="fixed top-0 w-[82vw]  right-0 z-50 border-b border-blue-100 bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="space-y-3">
              <Skeleton className="h-6 w-48 bg-slate-100" />
              <Skeleton className="h-4 w-64 bg-slate-100" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-11 w-32 rounded-xl bg-slate-100" />
              <Skeleton className="h-11 w-11 rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle case where no user is logged in
  if (!user) return null;

  // Get first name for greeting
  const firstName: string = user?.name?.split(" ")[0] || "User";

  return (
    <div className="fixed top-0 w-[82vw] right-0 z-50 border-b border-blue-100 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          {/* LEFT SECTION */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">
                Welcome back, <span className="text-blue-600">{firstName}!</span>
              </h2>
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            <p className="text-slate-500 text-sm md:text-base font-medium">
              Manage your AI interviews and track candidate progress.
            </p>
          </div>

          {/* RIGHT SECTION */}
          <div className="flex items-center gap-4">
            {/* CREDITS PILL */}
            <Link href="/billing">
              <div className="hidden sm:flex items-center gap-3 px-4 py-2.5 bg-white border border-blue-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group">
                <div className="bg-blue-600 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
                  <CoinsIcon className="h-4 w-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    Credits
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    {liveCredits}
                  </span>
                </div>
              </div>
            </Link>

            {/* PROFILE DROPDOWN */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 border-2 border-transparent hover:border-blue-600 rounded-full transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  <Image
                    src={user?.image || "/avatar.jpg"}
                    alt={user?.name || "User avatar"}
                    width={44}
                    height={44}
                    className="rounded-full select-none shadow-md ring-2 ring-white"
                    priority
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 p-2 rounded-2xl shadow-2xl border-blue-50 mt-2"
              >
                <DropdownMenuLabel className="font-normal p-3" inset={undefined}>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold leading-none text-slate-800">
                      {user?.name || "User"}
                    </p>
                    <p className="text-xs leading-none text-slate-500 truncate">
                      {user?.email || ""}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-blue-50" />
                <DropdownMenuItem className="flex items-center gap-2 p-3 rounded-xl cursor-pointer hover:bg-blue-50 text-slate-600 focus:bg-blue-50" inset={undefined}>
                  <Link href="/settings" className="flex items-center gap-2 w-full">
                    <User className="w-4 h-4" /> Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2 p-3 rounded-xl cursor-pointer text-red-600 hover:bg-red-50 focus:bg-red-50" inset={undefined}                >
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