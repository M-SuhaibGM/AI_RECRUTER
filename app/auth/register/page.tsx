"use client";

import { useState, useRef, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

interface FormData {
  name: string;
  email: string;
  password: string;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setloading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setloading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(formData),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      toast.success("Account created successfully");
      router.push("/auth/login");
      setloading(false);
    } else {
      const data = await res.json();
      toast.error(data.message || "Registration failed");
      setloading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
            Join the future of recruitment today.
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

      {/* RIGHT SIDE — Registration Card */}
      <div className="flex-1 flex items-center bg-blue-600 justify-center px-6 h-full overflow-y-auto">
        <div className="bg-white shadow-2xl rounded-3xl w-full max-w-md p-8 my-4">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-50 p-3 rounded-2xl">
              <Image src="/logo.png" alt="Logo" height={50} width={50} />
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

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
            {/* Name Field */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 ml-1">
                Full Name
              </label>
              <Input
                type="text"
                onChange={handleInputChange}
                name="name"
                required
                placeholder="Muhammad Suhaib"
                className="pl-4 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
              />
            </div>

            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 ml-1">
                Email Address
              </label>
              <Input
                type="email"
                onChange={handleInputChange}
                name="email"
                required
                placeholder="name@company.com"
                className="pl-4 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 ml-1">
                Password
              </label>
              <div className="relative">
                <Input
                  required
                  name="password"
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  placeholder="Min. 8 characters"
                  onChange={handleInputChange}
                  className="pl-4 pr-12 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
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
              className="w-full py-5 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5" />
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
