"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, Check, X, AlertCircle, Bot } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// ✅ Hoisted — never re-created
const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
] as const;

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const passwordChecks = useMemo(
    () =>
      PASSWORD_RULES.map((rule) => ({
        label: rule.label,
        passes: rule.test(formData.password),
      })),
    [formData.password]
  );

  const allPasswordsValid = passwordChecks.every((c) => c.passes);
  const passwordsMatch =
    formData.password.length > 0 &&
    formData.password === formData.confirmPassword;

  const canSubmit =
    formData.name.trim().length >= 2 &&
    formData.email.includes("@") &&
    allPasswordsValid &&
    passwordsMatch &&
    !loading;

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      setErrorMsg(null);
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErrorMsg(null);

      if (!passwordsMatch) {
        setErrorMsg("Passwords do not match");
        return;
      }
      if (!allPasswordsValid) {
        setErrorMsg("Password does not meet requirements");
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.toLowerCase().trim(),
            password: formData.password,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Registration failed");
        }

        // ✅ Auto sign-in
        const signInResult = await signIn("credentials", {
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          redirect: false,
        });

        if (signInResult?.error) {
          toast.success("Account created! Please sign in.");
          router.push("/auth/login");
          return;
        }

        toast.success("Welcome to AI Recruiter!");
        router.push(callbackUrl);
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        setErrorMsg(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [formData, passwordsMatch, allPasswordsValid, router, callbackUrl]
  );

  return (
    <div className="h-screen w-full flex bg-[#F7F8FC] overflow-hidden">
      {/* LEFT: Branding */}
      <div className="hidden lg:flex flex-1 bg-white text-black flex-col items-center justify-center px-10 relative overflow-hidden">
        <div className="absolute w-72 h-72 bg-blue-50/50 rounded-full blur-3xl top-10 right-10" />
        <div className="absolute w-96 h-96 bg-blue-50/50 rounded-full blur-3xl bottom-10 left-10" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          {/* ✅ Bot icon in a blue gradient container (replaces /logo.png) */}
          <div className="mb-6 p-5 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-200">
            <Bot className="w-16 h-16 text-white" strokeWidth={1.5} />
          </div>

          <h1 className="text-4xl font-bold mb-4">AI Recruiter</h1>
          <p className="text-lg opacity-90 text-gray-600">
            Join the future of recruitment today.
          </p>
        </div>

        {/* ✅ Illustration — correct aspect ratio to silence warning */}
        <Image
          src="/dumy.webp"
          alt=""
          width={700}
          height={700}
          className="z-10 mt-8 opacity-90 w-[350px] h-auto"
          priority
        />
      </div>

      {/* RIGHT: Register Card */}
      <div className="flex-1 flex items-center bg-blue-600 justify-center px-6 h-full overflow-y-auto">
        <div className="bg-white shadow-2xl rounded-3xl w-full max-w-md p-8 my-4">
          {/* ✅ Bot icon in a blue square (replaces /logo.png in card) */}
          <div className="flex justify-center mb-4">
            <div className="bg-blue-50 p-3 rounded-2xl">
              <Bot className="w-8 h-8 text-blue-600" strokeWidth={2} />
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
              Create Account
            </h2>
            <p className="text-gray-500">
              Start your journey with{" "}
              <span className="text-blue-600 font-semibold">AI Recruiter</span>
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-semibold text-gray-700 ml-1">
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                autoComplete="name"
                minLength={2}
                placeholder="Muhammad Suhaib"
                className="pl-4 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-semibold text-gray-700 ml-1">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                autoComplete="email"
                placeholder="name@company.com"
                className="pl-4 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-semibold text-gray-700 ml-1">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  required
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className="pl-4 pr-12 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {formData.password.length > 0 && (
                <div className="mt-2 pl-1 space-y-1">
                  {passwordChecks.map((check) => (
                    <div
                      key={check.label}
                      className={`flex items-center gap-1.5 text-[11px] ${
                        check.passes ? "text-emerald-600" : "text-slate-400"
                      }`}
                    >
                      {check.passes ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                      {check.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-semibold text-gray-700 ml-1"
              >
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                required
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                autoComplete="new-password"
                placeholder="Re-enter password"
                className={`pl-4 h-11 rounded-xl ${
                  formData.confirmPassword.length > 0
                    ? passwordsMatch
                      ? "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500"
                      : "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                }`}
              />
              {formData.confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-[11px] text-red-500 pl-1 mt-1">
                  Passwords do not match
                </p>
              )}
            </div>

            <Button
              disabled={!canSubmit}
              type="submit"
              className="w-full py-5 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-100 transition-colors active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Creating account...
                </>
              ) : (
                "Register Now"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-blue-600 font-bold hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}