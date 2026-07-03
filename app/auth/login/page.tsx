"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

export default function LoginPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setloading] = useState<boolean>(false);
  const [gloading, setgloading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setloading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      toast.error(res.error);
      setloading(false);
    } else {
      toast.success("Logged in successfully");
      router.push("/");
      setloading(false);
    }
  };

  const handleSocialAction = () => {
    setgloading(true);
    signIn("google", { redirect: false })
      .then((callback) => {
        if (callback?.error) {
          toast.error("Invalid Credentials");
        }
        if (callback?.ok && !callback?.error) {
          toast.success("Logged in successfully");
          router.push("/dashboard");
        }
      })
      .finally(() => setgloading(false));
  };

  return (
    <div className="h-screen w-full flex bg-[#F7F8FC] overflow-hidden">
      {/* LEFT SIDE — Illustration/Branding */}
      <div className="hidden lg:flex flex-1 bg-white text-black flex-col items-center justify-center px-10 relative overflow-hidden">
        <div className="absolute w-72 h-72 bg-blue-50/50 rounded-full blur-3xl top-10 right-10" />
        <div className="absolute w-96 h-96 bg-blue-50/50 rounded-full blur-3xl bottom-10 left-10" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <Image
            src="/logo.png"
            alt="Logo"
            width={140}
            height={140}
            className="mb-4 opacity-90"
          />
          <h1 className="text-4xl font-bold mb-4">AI Recruiter</h1>
          <p className="text-lg opacity-90 text-gray-600">
            Smart • Fast • AI-Driven Interviews
          </p>
        </div>

        <Image
          src="/dumy.webp"
          alt="Illustration"
          width={350}
          height={350}
          className="z-10 mt-8 opacity-90"
        />
      </div>

      {/* RIGHT SIDE — Login Card */}
      <div className="flex-1 flex items-center bg-blue-600 justify-center px-6 h-full overflow-y-auto">
        <div className="bg-white shadow-2xl rounded-3xl w-full max-w-md p-8 my-4">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-50 p-3 rounded-2xl">
              <Image src="/logo.png" alt="Logo" height={50} width={50} />
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

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 ml-1">
                Email Address
              </label>
              <Input
                type="email"
                name="email"
                required
                placeholder="name@company.com"
                className="pl-4 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-semibold text-gray-700">
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
                  name="password"
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-4 pr-12 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <Button
              disabled={loading}
              type="submit"
              className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-gray-100"></div>
            <span className="px-4 text-gray-400 text-[10px] uppercase tracking-widest font-medium">
              or
            </span>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>

          <Button
            type="button"
            onClick={handleSocialAction}
            disabled={gloading}
            className="w-full py-5 text-sm font-semibold flex items-center justify-center gap-3 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-xl transition-all"
            variant="outline"
          >
            {gloading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <>
                <Image
                  src="/google.png"
                  alt="google"
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
