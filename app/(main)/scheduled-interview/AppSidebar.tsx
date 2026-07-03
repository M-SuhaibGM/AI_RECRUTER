"use client";
import { useState, useEffect, useCallback } from "react";
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
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SideBarOption } from "@/services/Constants";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  PlusCircle, 
  Bot, 
  LucideIcon, 
  ChevronLeft,
  PanelLeftClose,
  PanelLeft
} from "lucide-react";
import { useSession } from "next-auth/react";

// ─── Type Definitions ───
interface SidebarOption {
  name: string;
  path: string;
  icon: LucideIcon;
  badge?: number | string;
  disabled?: boolean;
}

interface UserSession {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

// ─── Main Component ───
export function AppSidebar(): React.ReactElement {
  const path: string = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const user: UserSession | undefined = session?.user;
  
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // ─── Check Screen Size ───
  useEffect(() => {
    const checkScreenSize = (): void => {
      const desktop: boolean = window.innerWidth >= 768;
      setIsDesktop(desktop);
      setIsCollapsed(!desktop); // Auto-collapse on mobile
    };
    
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // ─── Keyboard shortcut for collapse ───
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setIsCollapsed(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ─── Handlers ───
  const handleCreateNew = useCallback((): void => {
    router.replace("/dashboard/create-interview");
  }, [router]);

  const handleLogoClick = useCallback((): void => {
    router.push("/");
  }, [router]);

  const toggleCollapse = useCallback((): void => {
    setIsCollapsed(prev => !prev);
  }, []);

  // ─── Get user initials ───
  const getUserInitials = (): string => {
    if (!user?.name) return "U";
    return user.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar
      defaultOpen={isDesktop}
      className={`border-r border-slate-200 bg-white transition-all duration-300 ${
        isCollapsed ? "w-[80px]" : "w-[280px]"
      }`}
    >
      {/* ─── Header with Logo ─── */}
      <SidebarHeader className="px-4 py-6 flex flex-col items-center">
        {/* Logo */}
        <div 
          className={`flex items-center gap-2.5 cursor-pointer select-none mb-8 ${
            isCollapsed ? "justify-center" : ""
          }`}
          onClick={handleLogoClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleLogoClick();
            }
          }}
          aria-label="Go to home page"
        >
          <div 
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ 
              background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", 
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)" 
            }}
          >
            <Bot className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <span 
              style={{ 
                fontFamily: "'Bricolage Grotesque', sans-serif", 
                fontWeight: 800, 
                fontSize: "1.05rem", 
                letterSpacing: "-.01em", 
                color: "#0c0f1a" 
              }}
            >
              <span style={{ color: "#2563eb" }}>AI</span>Recruiter
            </span>
          )}
        </div>

        {/* Create New Button */}
        <Button
          className={`bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-100 rounded-xl py-6 flex items-center justify-center gap-2 group transition-all ${
            isCollapsed ? "w-12 h-12 p-0" : "w-full"
          }`}
          onClick={handleCreateNew}
          aria-label="Create new interview"
          title="Create New Interview"
        >
          <PlusCircle className={`${isCollapsed ? "w-5 h-5" : "w-5 h-5"} group-hover:rotate-90 transition-transform duration-300`} />
          {!isCollapsed && <span className="font-bold">Create New</span>}
        </Button>
      </SidebarHeader>

      {/* ─── Navigation Menu ─── */}
      <SidebarContent className={`px-3 ${isCollapsed ? "px-2" : ""}`}>
        <SidebarGroup className={undefined}>
          {!isCollapsed && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-2">
              Main Menu
            </p>
          )}
          <SidebarMenu className="gap-1">
            {SideBarOption.map((option: SidebarOption, index: number) => {
              const isActive: boolean = option.path === "/"
                ? path === "/"
                : path.startsWith(option.path);
              
              return (
                <SidebarMenuItem key={index} className={undefined}>
                  <SidebarMenuButton
                    asChild
                    className={`relative flex items-center h-12 rounded-xl transition-all duration-200 group
                      ${isCollapsed ? "justify-center px-2" : "px-4"}
                      ${isActive
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}
                      ${option.disabled ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                    title={isCollapsed ? option.name : undefined} tooltip={undefined}                  >
                    <Link 
                      href={option.disabled ? "#" : option.path} 
                      className={`flex items-center gap-3 w-full ${isCollapsed ? "justify-center" : ""}`}
                      aria-current={isActive ? "page" : undefined}
                      onClick={(e: React.MouseEvent) => {
                        if (option.disabled) {
                          e.preventDefault();
                        }
                      }}
                    >
                      {/* Active Indicator Pill */}
                      {isActive && !isCollapsed && (
                        <div className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full" />
                      )}

                      <option.icon
                        className={`w-5 h-5 transition-colors shrink-0
                          ${isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`}
                        aria-hidden="true"
                      />

                      {!isCollapsed && (
                        <>
                          <span className="text-[15px] flex-1">{option.name}</span>
                          {option.badge && (
                            <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                              {option.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* ─── Footer ─── */}
      <SidebarFooter className="p-4 border-t border-slate-50">
        {/* User Info */}
        {user && !isCollapsed && (
          <div className="bg-slate-50 rounded-2xl p-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {getUserInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700 truncate">{user.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Help Center */}
        <div className={`bg-slate-50 rounded-2xl p-4 ${isCollapsed ? "text-center" : ""}`}>
          {!isCollapsed && (
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Support
            </p>
          )}
          <Link 
            href="/help" 
            className={`text-sm text-slate-600 hover:text-blue-600 transition-colors ${isCollapsed ? "block" : ""}`}
          >
            {isCollapsed ? "?" : "Help Center"}
          </Link>
        </div>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
          className="w-full mt-3 text-slate-400 hover:text-slate-600"
          title={isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
        >
          {isCollapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4 mr-2" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}