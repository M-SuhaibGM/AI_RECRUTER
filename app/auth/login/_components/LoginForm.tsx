"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, AlertCircle, Bot } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  const [loading, setLoading] = useState(false);
  const [gloading, setGloading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErrorMsg(null);
      setLoading(true);

      const formData = new FormData(e.currentTarget);
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;

      try {
        const res = await signIn("credentials", {
          email,
          password,
          redirect: false,
          callbackUrl,
        });

        if (res?.error) {
          const message =
            res.error === "CredentialsSignin"
              ? "Invalid email or password"
              : res.error;
          setErrorMsg(message);
          toast.error(message);
          return;
        }

        toast.success("Logged in successfully");
        router.push(callbackUrl);
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign-in failed";
        setErrorMsg(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [router, callbackUrl]
  );

  const handleGoogleSignIn = useCallback(async () => {
    setErrorMsg(null);
    setGloading(true);
    try {
      await signIn("google", { callbackUrl });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Google sign-in failed";
      setErrorMsg(message);
      toast.error(message);
      setGloading(false);
    }
  }, [callbackUrl]);

  return (
    <div className="h-screen w-full flex bg-[#F7F8FC] overflow-hidden">
      {/* LEFT: Branding */}
      <div className="hidden lg:flex flex-1 bg-white text-black flex-col items-center justify-center px-10 relative overflow-hidden">
        <div className="absolute w-72 h-72 bg-blue-50/50 rounded-full blur-3xl top-10 right-10" />
        <div className="absolute w-96 h-96 bg-blue-50/50 rounded-full blur-3xl bottom-10 left-10" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          {/* ✅ Bot icon in a blue container */}
          <div className="mb-6 p-5 rounded-3xl bg-linear-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-200">
            <Bot className="w-16 h-16 text-white" strokeWidth={1.5} />
          </div>

          <h1 className="text-4xl font-bold mb-4">AI Recruiter</h1>
          <p className="text-lg opacity-90 text-gray-600">
            Smart • Fast • AI-Driven Interviews
          </p>
        </div>

        {/* ✅ Illustration — with proper aspect ratio to silence the warning */}
        <Image
          src="/dumy.webp"
          alt=""
          width={700}
          height={700}
          className="z-10 mt-8 opacity-90 w-87.5 h-auto"
          priority
        />
      </div>

      {/* RIGHT: Login Card */}
      <div className="flex-1 flex items-center bg-blue-600 justify-center px-6 h-full overflow-y-auto">
        <div className="bg-white shadow-2xl rounded-3xl w-full max-w-md p-8 my-4">
          {/* ✅ Removed empty div — replaced with Bot icon */}
          <div className="flex justify-center mb-4">
            <div className="bg-blue-50 p-3 rounded-2xl">
              <Bot className="w-8 h-8 text-blue-600" strokeWidth={2} />
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-500">
              Sign in to your{" "}
              <span className="text-blue-600 font-semibold">AI Recruiter</span>{" "}
              account
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="text-sm font-semibold text-gray-700 ml-1"
              >
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="name@company.com"
                className="pl-4 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label
                  htmlFor="password"
                  className="text-sm font-semibold text-gray-700"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-4 pr-12 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              disabled={loading}
              type="submit"
              className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-100 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="px-4 text-gray-400 text-[10px] uppercase tracking-widest font-medium">
              or
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={gloading}
            className="w-full py-5 text-sm font-semibold flex items-center justify-center gap-3 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-xl transition-colors"
            variant="outline"
          >
            {gloading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <>
                <Image
                  src="/google.png"
                  alt=""
                  width={18}
                  height={18}
                />
                <span>Google Account</span>
              </>
            )}
          </Button>

          <p className="text-center text-xs text-gray-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="text-blue-600 font-bold hover:underline"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}