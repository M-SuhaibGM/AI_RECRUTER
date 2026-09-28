import { Phone, Video, Sparkles } from "lucide-react";
import Link from "next/link";
import React from "react";

function CreateOptions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
      {/* Option 1: Video Interview (Active) */}
      <Link href={"/dashboard/create-interview"}>
        <div className="group relative bg-white border border-slate-200 rounded-2xl p-8 cursor-pointer 
          transition-[border-color,box-shadow,transform] duration-300 
          hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 
          md:hover:-translate-y-1">
          
          <div className="flex items-start justify-between mb-6">
            <div className="p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 
              md:group-hover:scale-110 transition-transform duration-300">
              <Video className="text-white h-7 w-7" />
            </div>
            <div className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
              Popular
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-800 mb-2">
            AI Video Interview
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Generate customized AI-powered video interview links and share them with candidates to screen skills in real-time.
          </p>
        </div>
      </Link>

      {/* Option 2: Phone Screening (Upcoming) */}
      <div className="relative bg-slate-50 border border-slate-200 rounded-2xl p-8 opacity-70 grayscale-[0.5]">
        {/* Coming Soon Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-3 py-1 rounded-full border border-amber-200">
          <Sparkles className="w-3 h-3" />
          COMING SOON
        </div>

        <div className="flex items-start mb-6">
          <div className="p-4 bg-slate-200 rounded-2xl">
            <Phone className="text-slate-500 h-7 w-7" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-2">
          AI Phone Screening
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed">
          Automate first-round phone calls with our voice-agent. We&apos;ll call the candidates and provide you with a transcript.
        </p>

        <div className="mt-4 inline-flex items-center text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
          Currently in Development
        </div>
      </div>
    </div>
  );
}

export default CreateOptions;