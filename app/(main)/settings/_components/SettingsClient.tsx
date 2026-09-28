"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import {
  User, Settings2, Mic2, LogOut, History,
  ShieldCheck, Save, Loader2, CreditCard,
  ExternalLink, CheckCircle2, Globe, Volume2,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ─── Types ───
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

interface PaymentRow {
  id: string;
  createdAt: string | Date;
  creditsAdded: number;
  amount: number;
}

interface SettingsClientProps {
  user: {
    name: string;
    email: string;
    image: string | null;
  };
  initialConfig: UserConfig;
  initialPayments: PaymentRow[];
}

// ✅ Hoisted — never re-created
const VOICE_OPTIONS: VoiceOption[] = [
  { id: "Elliot", name: "Elliot", desc: "Male • Neutral", provider: "vapi", tag: "FREE", tagColor: "bg-emerald-100 text-emerald-700" },
  { id: "Rohan", name: "Rohan", desc: "Male • English", provider: "vapi", tag: "FREE", tagColor: "bg-emerald-100 text-emerald-700" },
  { id: "Hana", name: "Hana", desc: "Female • Soft", provider: "vapi", tag: "FREE", tagColor: "bg-emerald-100 text-emerald-700" },
  { id: "Neha", name: "Neha", desc: "Female • Urdu/Hindi", provider: "vapi", tag: "FREE", tagColor: "bg-emerald-100 text-emerald-700" },
  { id: "Naina", name: "Naina", desc: "Female • South Asian", provider: "vapi", tag: "FREE", tagColor: "bg-emerald-100 text-emerald-700" },
  { id: "Sagar", name: "Sagar", desc: "Male • South Asian", provider: "vapi", tag: "FREE", tagColor: "bg-emerald-100 text-emerald-700" },
  { id: "Cole", name: "Cole", desc: "Male • Professional", provider: "vapi", tag: "FREE", tagColor: "bg-emerald-100 text-emerald-700" },
  { id: "Paige", name: "Paige", desc: "Female • Friendly", provider: "vapi", tag: "FREE", tagColor: "bg-emerald-100 text-emerald-700" },
];

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en-US", name: "English (US)", flag: "🇺🇸" },
  { code: "hi-IN", name: "Hindi (India)", flag: "🇮🇳" },
  { code: "ur-PK", name: "Urdu (Pakistan)", flag: "🇵🇰" },
];

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

// ─── Small components ───
function SectionLabel({
  icon,
  label,
  colored,
}: {
  icon: React.ReactNode;
  label: string;
  colored?: boolean;
}) {
  return (
    <h2
      className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${
        colored ? "text-blue-600" : "text-slate-400"
      }`}
    >
      {icon} {label}
    </h2>
  );
}

function LogoutDialog({ onLogout, isLoading }: { onLogout: () => void; isLoading: boolean }) {
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    setOpen(false);
    onLogout();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          className="text-red-500 text-xs font-bold gap-2 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Logout
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
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
            className="text-sm mr-2 font-medium border-slate-200 hover:bg-slate-50"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLogout}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Logging out...
              </>
            ) : (
              "Logout"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Main Component ───
export default function SettingsClient({
  user,
  initialConfig,
  initialPayments,
}: SettingsClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [config, setConfig] = useState<UserConfig>(initialConfig);

  // ✅ Derived values — no separate find() calls on every render
  const selectedVoice = useMemo(
    () => VOICE_OPTIONS.find((v) => v.id === config.voiceId),
    [config.voiceId]
  );
  const selectedLang = useMemo(
    () => LANGUAGE_OPTIONS.find((l) => l.code === config.language),
    [config.language]
  );

  const handleVoiceChange = useCallback((voiceId: string) => {
    const selected = VOICE_OPTIONS.find((v) => v.id === voiceId);
    setConfig((prev) => ({
      ...prev,
      voiceId,
      voiceProvider: selected?.provider || "vapi",
    }));
  }, []);

  const handleLanguageChange = useCallback((language: string) => {
    setConfig((prev) => ({ ...prev, language }));
  }, []);

  const handleSave = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error("Failed to save");

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      const voiceName = VOICE_OPTIONS.find((v) => v.id === config.voiceId)?.name;
      toast.success("Settings saved!", {
        description: `Voice: ${voiceName} • Language: ${config.language}`,
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [config]);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: "/" });
  }, []);

  return (
    <div className="bg-slate-50 min-h-[70vh] flex flex-col rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b bg-white flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-blue-600" /> Settings
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Manage your account and AI agent preferences
          </p>
        </div>
        <LogoutDialog onLogout={handleLogout} isLoading={isLoggingOut} />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Profile + Plan */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2">
            <SectionLabel icon={<User className="w-3.5 h-3.5" />} label="Account Profile" />
            <div className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="h-12 w-12 rounded-full bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg shadow-md select-none">
                {user.name.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">{user.name}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
              <span className="ml-auto text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">
                Active
              </span>
            </div>
          </section>

          <section>
            <SectionLabel icon={<CreditCard className="w-3.5 h-3.5" />} label="Active Plan" />
            <div className="p-5 bg-linear-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-lg relative overflow-hidden h-[calc(100%-2rem)]">
              <p className="text-[10px] opacity-70 uppercase font-bold tracking-widest">
                Current Plan
              </p>
              <p className="text-lg font-black mt-0.5">Pro Recruiter</p>
              <p className="text-[10px] mt-3 bg-white/20 w-fit px-2.5 py-1 rounded-full">
                Renews Oct 2026
              </p>
              <CreditCard className="absolute -right-3 -bottom-3 w-20 h-20 opacity-10 rotate-12" />
            </div>
          </section>
        </div>

        {/* AI Agent Config */}
        <section className="p-6 bg-white rounded-2xl border border-blue-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <SectionLabel
              icon={<Mic2 className="w-3.5 h-3.5 text-blue-600" />}
              label="AI Agent Preferences"
              colored
            />
            <span className="text-[10px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-bold border border-blue-100">
              VAPI AI
            </span>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" /> Interview Language
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LANGUAGE_OPTIONS.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors text-sm font-medium ${
                    config.language === lang.code
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

          {/* Voice */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" /> Voice Persona
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {VOICE_OPTIONS.map((voice) => (
                <button
                  key={voice.id}
                  type="button"
                  onClick={() => handleVoiceChange(voice.id)}
                  className={`flex flex-col gap-1.5 p-3.5 rounded-xl border-2 text-left transition-colors ${
                    config.voiceId === voice.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-100 bg-slate-50 hover:border-slate-200"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      config.voiceId === voice.id
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {voice.name.charAt(0)}
                  </div>
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <p
                        className={`text-xs font-bold ${
                          config.voiceId === voice.id ? "text-blue-700" : "text-slate-700"
                        }`}
                      >
                        {voice.name}
                      </p>
                      <p className="text-[10px] text-slate-400">{voice.desc}</p>
                    </div>
                    {config.voiceId === voice.id && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                    )}
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded w-fit ${voice.tagColor}`}
                  >
                    {voice.tag}
                  </span>
                </button>
              ))}
            </div>

            {selectedVoice && selectedLang && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3 text-xs text-slate-500">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {selectedVoice.name.charAt(0)}
                </div>
                <span>
                  Selected:{" "}
                  <span className="font-bold text-slate-700">{selectedVoice.name}</span>
                  {" · "}Provider:{" "}
                  <span className="font-bold text-slate-700">{selectedVoice.provider}</span>
                  {" · "}Language:{" "}
                  <span className="font-bold text-slate-700">
                    {selectedLang.flag} {selectedLang.name}
                  </span>
                </span>
              </div>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={loading}
            className={`gap-2 px-8 transition-colors active:scale-95 text-white ${
              saved ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
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

        {/* Transaction History */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <SectionLabel icon={<History className="w-3.5 h-3.5" />} label="Transaction History" />
            <Button
              variant="link"
              className="text-blue-600 text-[10px] h-auto p-0 gap-1"
            >
              View Invoices <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["Date", "Description", "Status", "Amount"].map((h) => (
                    <th
                      key={h}
                      className="p-4 font-semibold text-slate-500 text-[11px] uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {initialPayments.length > 0 ? (
                  initialPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-400">
                        {DATE_FORMATTER.format(new Date(payment.createdAt))}
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
                        ${(payment.amount ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">
                      No payment history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Security */}
        <section className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-[11px] text-emerald-700 font-medium">
            Your billing information is encrypted. We use Stripe for secure payment processing.
          </p>
        </section>
      </div>

      {/* Footer */}
      <div className="p-4 bg-white border-t shrink-0">
        <Button
          onClick={() => router.push("/dashboard")}
          className="w-full bg-slate-900 text-white text-xs py-5 rounded-xl hover:bg-slate-800 transition-colors"
        >
          ← Back to Dashboard
        </Button>
      </div>
    </div>
  );
}