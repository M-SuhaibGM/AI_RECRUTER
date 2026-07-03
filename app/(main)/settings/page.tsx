"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "next-auth/react";
import { Payment } from "@prisma/client";
import { toast } from "sonner";
import axios from "axios";
import {
  User, Settings2, Mic2, LogOut, History,
  ShieldCheck, Save, Loader2, CreditCard,
  ExternalLink, CheckCircle2, Globe, Volume2,
  AlertTriangle
} from "lucide-react";
import { getUserPayments } from "@/actions/payment-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Type Definitions ───
interface VoiceOption {
  id: string;
  name: string;
  desc: string;
  provider: string;
  tag: string;
  tagColor: string;
}

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

interface UserConfig {
  language: string;
  voiceId: string;
  voiceProvider: string;
}

interface PaymentResponse {
  success: boolean;
  payments: Payment[];
}

interface UserConfigResponse {
  language?: string;
  voiceId?: string;
  voiceProvider?: string;
}

// ✅ FIXED: Working voice IDs with correct providers (2026)
const voiceOptions: VoiceOption[] = [
  { id: "Elliot", name: "Elliot", desc: "Male • Neutral", provider: "vapi", tag: "FREE", tagColor: "bg-emerald-100 text-emerald-700" },
  { id: "Rohan", name: "Rohan", desc: "Male • English", provider: "vapi", tag: "FREE", tagColor: "bg-emerald-100 text-emerald-700" },
  { id: "Hana", name: "Hana", desc: "Female • Soft", provider: "vapi", tag: "FREE", tagColor: "bg-emerald-100 text-emerald-700" },
  { id: "Neha", name: "Neha", desc: "Female • Urdu/Hindi", provider: "vapi", tag: "FREE", tagColor: "bg-emerald-100 text-emerald-700" },
  { id: "Naina", name: "Naina", desc: "Female • South Asian", provider: "vapi", tag: "FREE", tagColor: "bg-emerald-100 text-emerald-700" },
  { id: "Sagar", name: "Sagar", desc: "Male • South Asian", provider: "vapi", tag: "FREE", tagColor: "bg-emerald-100 text-emerald-700" },
  { id: "Cole", name: "Cole", desc: "Male • Professional", provider: "vapi", tag: "FREE", tagColor: "bg-emerald-100 text-emerald-700" },
  { id: "Paige", name: "Paige", desc: "Female • Friendly", provider: "vapi", tag: "FREE", tagColor: "bg-emerald-100 text-emerald-700" },
];

const languageOptions: LanguageOption[] = [
  { code: "en-US", name: "English (US)", flag: "🇺🇸" },
  { code: "hi-IN", name: "Hindi (India)", flag: "🇮🇳" },
  { code: "ur-PK", name: "Urdu (Pakistan)", flag: "🇵🇰" },
];

// ─── SectionLabel Component ───
interface SectionLabelProps {
  icon: React.ReactNode;
  label: string;
  colored?: boolean;
}

function SectionLabel({ icon, label, colored }: SectionLabelProps) {
  return (
    <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5
      ${colored ? "text-blue-600" : "text-slate-400"}`}>
      {icon} {label}
    </h2>
  );
}

// ─── LogoutDialog Component ───
interface LogoutDialogProps {
  onLogout: () => void;
  isLoading?: boolean;
}

function LogoutDialog({ onLogout, isLoading }: LogoutDialogProps) {
  const [open, setOpen] = useState<boolean>(false);

  const handleLogout = (): void => {
    setOpen(false);
    onLogout();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          className="text-red-500 text-xs font-bold gap-2 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-4 h-4" /> Logout
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className={undefined}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">
              Confirm Logout
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-slate-500 leading-relaxed">
            Are you sure you want to log out? You will need to sign in again to access your dashboard, interviews, and settings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 sm:gap-0">
          <AlertDialogCancel 
            disabled={isLoading}
            className="text-sm   mr-2 font-medium border-slate-200 hover:bg-slate-50 transition-all"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLogout}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium gap-2 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Logging out...
              </>
            ) : (
              <>
                Logout
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Skeleton Loading Component ───
function SettingsPageSkeleton() {
  return (
    <div className="bg-slate-50 min-h-[70vh] flex flex-col rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
      
      {/* Header Skeleton */}
      <div className="p-6 border-b bg-white flex justify-between items-center shrink-0">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* Body Skeleton */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Profile + Plan Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card Skeleton */}
          <section className="lg:col-span-2 space-y-3">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </section>

          {/* Plan Card Skeleton */}
          <section className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <div className="p-5 bg-slate-200 rounded-2xl h-[calc(100%-2rem)] space-y-3">
              <Skeleton className="h-3 w-24 bg-slate-300" />
              <Skeleton className="h-6 w-36 bg-slate-300" />
              <Skeleton className="h-5 w-28 rounded-full bg-slate-300" />
            </div>
          </section>
        </div>

        {/* AI Agent Config Skeleton */}
        <section className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>

          {/* Language Picker Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>

          {/* Voice Picker Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          </div>

          {/* Save Button Skeleton */}
          <Skeleton className="h-10 w-48 rounded-lg" />
        </section>

        {/* Transaction History Skeleton */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b">
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-4" />
                ))}
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 grid grid-cols-4 gap-4">
                  <Skeleton className="h-4" />
                  <Skeleton className="h-4" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security Notice Skeleton */}
        <section className="p-4 bg-slate-100 rounded-2xl flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded-full shrink-0" />
          <Skeleton className="h-4 flex-1" />
        </section>
      </div>

      {/* Footer Skeleton */}
      <div className="p-4 bg-white border-t shrink-0">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

// ─── Main SettingsPage Component ───
export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState<boolean>(false);
  const [fetching, setFetching] = useState<boolean>(true);
  const [saved, setSaved] = useState<boolean>(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState<boolean>(true);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  const [config, setConfig] = useState<UserConfig>({
    language: "en-US",
    voiceId: "Elliot",
    voiceProvider: "vapi",
  });

  // Load payment history
  useEffect(() => {
    const loadPayments = async (): Promise<void> => {
      try {
        const res: PaymentResponse = await getUserPayments();
        if (res.success) {
          setPayments(res.payments);
        }
      } catch (error) {
        console.error("Failed to load payments:", error);
      } finally {
        setLoadingPayments(false);
      }
    };

    loadPayments();
  }, []);

  // Fetch user configuration
  useEffect(() => {
    const fetchConfig = async (): Promise<void> => {
      if (!session?.user?.email) return;
      
      try {
        const res = await axios.get<UserConfigResponse>("/api/user-config");
        if (res.data) {
          setConfig({
            language: res.data.language || "en-US",
            voiceId: res.data.voiceId || "Elliot",
            voiceProvider: res.data.voiceProvider || "vapi",
          });
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setFetching(false);
      }
    };

    fetchConfig();
  }, [session]);

  // Handle voice change - auto-update provider
  const handleVoiceChange = (voiceId: string): void => {
    const selected: VoiceOption | undefined = voiceOptions.find((v) => v.id === voiceId);
    setConfig({
      ...config,
      voiceId,
      voiceProvider: selected?.provider || "vapi",
    });
  };

  // Handle language change
  const handleLanguageChange = (languageCode: string): void => {
    setConfig({
      ...config,
      language: languageCode,
    });
  };

  // Save configuration
  const handleSave = async (): Promise<void> => {
    setLoading(true);
    try {
      await axios.put("/api/user-config", config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      
      const voiceName: string | undefined = voiceOptions.find((v) => v.id === config.voiceId)?.name;
      toast.success("Settings saved!", {
        description: `Voice: ${voiceName} • Language: ${config.language}`,
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = (): void => {
    setIsLoggingOut(true);
    
    setTimeout(() => {
      signOut({ callbackUrl: "/" });
    }, 500);
  };

  const selectedVoice: VoiceOption | undefined = voiceOptions.find((v) => v.id === config.voiceId);
  const selectedLang: LanguageOption | undefined = languageOptions.find((l) => l.code === config.language);

  // Skeleton loading state
  if (fetching) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div className="bg-slate-50 min-h-[70vh] flex flex-col rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="p-6 border-b bg-white flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-blue-600" /> Settings
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">Manage your account and AI agent preferences</p>
        </div>
        
        {/* Logout with Confirmation Dialog */}
        <LogoutDialog onLogout={handleLogout} isLoading={isLoggingOut} />
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Profile + Plan row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Profile card */}
          <section className="lg:col-span-2">
            <SectionLabel icon={<User className="w-3.5 h-3.5" />} label="Account Profile" />
            <div className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg shadow-md select-none">
                {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">{session?.user?.name || "User"}</p>
                <p className="text-xs text-slate-400">{session?.user?.email}</p>
              </div>
              <span className="ml-auto text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">
                Active
              </span>
            </div>
          </section>

          {/* Plan card */}
          <section>
            <SectionLabel icon={<CreditCard className="w-3.5 h-3.5" />} label="Active Plan" />
            <div className="p-5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-lg relative overflow-hidden h-[calc(100%-2rem)]">
              <p className="text-[10px] opacity-70 uppercase font-bold tracking-widest">Current Plan</p>
              <p className="text-lg font-black mt-0.5">Pro Recruiter</p>
              <p className="text-[10px] mt-3 bg-white/20 w-fit px-2.5 py-1 rounded-full">Renews Oct 2026</p>
              <CreditCard className="absolute -right-3 -bottom-3 w-20 h-20 opacity-10 rotate-12" />
            </div>
          </section>
        </div>

        {/* ── AI Agent Config ── */}
        <section className="p-6 bg-white rounded-2xl border border-blue-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <SectionLabel icon={<Mic2 className="w-3.5 h-3.5 text-blue-600" />} label="AI Agent Preferences" colored />
            <span className="text-[10px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-bold border border-blue-100">
              VAPI AI
            </span>
          </div>

          {/* Language picker */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" /> Interview Language
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {languageOptions.map((lang: LanguageOption) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all text-sm font-medium
                    ${config.language === lang.code
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200"
                    }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="text-xs leading-tight">{lang.name}</span>
                  {config.language === lang.code && (
                    <CheckCircle2 className="w-4 h-4 text-blue-500 ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Voice picker */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" /> Voice Persona
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {voiceOptions.map((voice: VoiceOption) => (
                <button
                  key={voice.id}
                  onClick={() => handleVoiceChange(voice.id)}
                  className={`flex flex-col gap-1.5 p-3.5 rounded-xl border-2 text-left transition-all
                    ${config.voiceId === voice.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-100 bg-slate-50 hover:border-slate-200"
                    }`}
                >
                  {/* Avatar circle */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${config.voiceId === voice.id ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                    {voice.name.charAt(0)}
                  </div>
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <p className={`text-xs font-bold ${config.voiceId === voice.id ? "text-blue-700" : "text-slate-700"}`}>
                        {voice.name}
                      </p>
                      <p className="text-[10px] text-slate-400">{voice.desc}</p>
                    </div>
                    {config.voiceId === voice.id && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                    )}
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded w-fit ${voice.tagColor}`}>
                    {voice.tag}
                  </span>
                </button>
              ))}
            </div>

            {/* Selected voice summary */}
            {selectedVoice && selectedLang && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3 text-xs text-slate-500">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {selectedVoice.name.charAt(0)}
                </div>
                <span>
                  Selected: <span className="font-bold text-slate-700">{selectedVoice.name}</span>
                  {" · "}Provider: <span className="font-bold text-slate-700">{selectedVoice.provider}</span>
                  {" · "}Language: <span className="font-bold text-slate-700">{selectedLang?.flag} {selectedLang?.name}</span>
                </span>
              </div>
            )}
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={loading}
            className={`gap-2 px-8 transition-all active:scale-95 text-white
              ${saved ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {loading ? "Saving…" : saved ? "Saved!" : "Save Configuration"}
          </Button>
        </section>

        {/* ── Transaction History ── */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <SectionLabel icon={<History className="w-3.5 h-3.5" />} label="Transaction History" />
            <Button variant="link" className="text-blue-600 text-[10px] h-auto p-0 gap-1">
              View Invoices <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["Date", "Description", "Status", "Amount"].map((h: string) => (
                    <th key={h} className="p-4 font-semibold text-slate-500 text-[11px] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payments.length > 0 ? (
                  payments.map((payment: Payment) => (
                    <tr
                      key={payment.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4 text-slate-400">
                        {new Date(payment.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      <td className="p-4 font-medium text-slate-700">
                        {payment.creditsAdded} Credits Added
                      </td>

                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[10px] font-bold border border-green-100">
                          Paid
                        </span>
                      </td>

                      <td className="p-4 text-right font-bold text-slate-900">
                        ${payment.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-6 text-center text-slate-400"
                    >
                      No payment history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Security notice ── */}
        <section className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-[11px] text-emerald-700 font-medium">
            Your billing information is encrypted. We use Stripe for secure payment processing.
          </p>
        </section>
      </div>

      {/* ── Footer ── */}
      <div className="p-4 bg-white border-t shrink-0">
        <Button
          onClick={() => router.push("/dashboard")}
          className="w-full bg-slate-900 text-white text-xs py-5 rounded-xl hover:bg-slate-800 transition-all"
        >
          ← Back to Dashboard
        </Button>
      </div>
    </div>
  );
}