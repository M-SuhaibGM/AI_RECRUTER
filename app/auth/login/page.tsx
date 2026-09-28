import { Suspense } from "react";
import LoginForm from "./_components/LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <div className="h-screen w-full flex bg-[#F7F8FC]">
      <div className="hidden lg:flex flex-1 bg-white items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
      <div className="flex-1 flex items-center bg-blue-600 justify-center px-6">
        <div className="bg-white rounded-3xl w-full max-w-md p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-slate-200 rounded mx-auto" />
            <div className="h-11 bg-slate-100 rounded-xl" />
            <div className="h-11 bg-slate-100 rounded-xl" />
            <div className="h-12 bg-blue-100 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}