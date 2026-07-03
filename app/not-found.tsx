// app/not-found.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Search, 
  ArrowLeft, 
  Bot, 
  FileSearch,
  Sparkles,
  Mic2
} from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100/50 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-100/50 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl mx-auto">
        {/* Main Content */}
        <div className="text-center space-y-6 sm:space-y-8">
          
          {/* 404 Illustration */}
          <div className="relative inline-flex items-center justify-center">
            {/* Animated circles */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 sm:w-40 sm:h-40 border-4 border-blue-200 rounded-full animate-ping opacity-20" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 sm:w-56 sm:h-56 border-4 border-indigo-200 rounded-full animate-pulse opacity-30" />
            </div>
            
            {/* Main icon container */}
            <div className="relative bg-white rounded-full p-6 sm:p-8 shadow-xl border border-slate-200">
              <div className="relative">
                <Bot className="w-16 h-16 sm:w-20 sm:h-20 text-blue-600" />
                <FileSearch className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-500 absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-lg" />
              </div>
            </div>
          </div>

          {/* Error Code with Gradient Text */}
          <div className="space-y-2">
            <h1 className="text-7xl sm:text-8xl lg:text-9xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent leading-none">
              404
            </h1>
            <div className="flex items-center justify-center gap-2 text-slate-400">
              <span className="w-8 h-px bg-slate-300" />
              <span className="text-xs font-medium uppercase tracking-widest">Page Not Found</span>
              <span className="w-8 h-px bg-slate-300" />
            </div>
          </div>

          {/* Error Message */}
          <div className="space-y-3 max-w-md mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
              Oops! This interview room doesn&apos;t exist
            </h2>
            <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
              The page you&apos;re looking for might have been moved, deleted, 
              or the interview link might be incorrect. Let&apos;s get you back on track!
            </p>
          </div>

          {/* Quick Suggestions */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm max-w-lg mx-auto">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              Quick Suggestions
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link 
                href="/dashboard"
                className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-all group text-left"
              >
                <div className="p-2 bg-blue-600 rounded-lg group-hover:bg-blue-700 transition-colors">
                  <Home className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-700">Dashboard</p>
                  <p className="text-xs text-blue-500">Manage your interviews</p>
                </div>
              </Link>

              <Link 
                href="/dashboard/create-interview"
                className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-all group text-left"
              >
                <div className="p-2 bg-indigo-600 rounded-lg group-hover:bg-indigo-700 transition-colors">
                  <Mic2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-700">New Interview</p>
                  <p className="text-xs text-indigo-500">Create AI-powered interview</p>
                </div>
              </Link>

              <Link 
                href="/scheduled-interview"
                className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-100 transition-all group text-left"
              >
                <div className="p-2 bg-purple-600 rounded-lg group-hover:bg-purple-700 transition-colors">
                  <Search className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-purple-700">Scheduled</p>
                  <p className="text-xs text-purple-500">View upcoming interviews</p>
                </div>
              </Link>

              <Link 
                href="/all-interview"
                className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-all group text-left"
              >
                <div className="p-2 bg-emerald-600 rounded-lg group-hover:bg-emerald-700 transition-colors">
                  <FileSearch className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-700">All Interviews</p>
                  <p className="text-xs text-emerald-500">Browse interview history</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="w-full sm:w-auto gap-2 text-sm font-medium border-slate-300 hover:bg-slate-50 transition-all px-6 py-5"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
            
            <Link href="/" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto gap-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-all px-6 py-5 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40">
                <Home className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
          </div>

          {/* Footer note */}
          <p className="text-xs text-slate-400 pt-4">
            Need help? Contact our support team at{" "}
            <a 
              href="mailto:support@airecruiter.com" 
              className="text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2"
            >
              support@airecruiter.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}