"use client";
import React, { useState, ChangeEvent } from "react";
import { 
  Search, 
  HelpCircle, 
  MessageSquare, 
  Mic, 
  Video, 
  FileText, 
  AlertTriangle, 
  ChevronDown, 
  Mail, 
  Clock,
  LucideIcon
} from "lucide-react";

// ─── Type Definitions ───
interface Category {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

interface FAQ {
  q: string;
  a: string;
}

// ─── Main Component ───
export default function HelpSupport(): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const categories: Category[] = [
    { 
      icon: <Mic className="h-6 w-6 text-blue-600" />, 
      title: "Audio & Mic Setup", 
      desc: "Troubleshoot microphone permissions and volume testing issues." 
    },
    { 
      icon: <Video className="h-6 w-6 text-indigo-600" />, 
      title: "Interview Session", 
      desc: "Understanding the AI recruiter, pacing, and progress tracking." 
    },
    { 
      icon: <FileText className="h-6 w-6 text-purple-600" />, 
      title: "Reports & Feedback", 
      desc: "How to read AI performance analytics and export PDF transcripts." 
    },
    { 
      icon: <AlertTriangle className="h-6 w-6 text-amber-600" />, 
      title: "System Issues", 
      desc: "Handling sudden disconnection, call timeouts, or loading errors." 
    },
  ];

  const faqs: FAQ[] = [
    {
      q: "The AI Recruiter says it can't hear me. What should I do?",
      a: "First, check your visual voice waveform on the screen. If the bars are not moving, ensure you granted microphone permissions to your browser. You can click the lock icon in your browser address bar to reset permissions, or re-run the Pre-Interview Mic Test."
    },
    {
      q: "What happens if my internet disconnects during an active interview?",
      a: "Don't panic. Our system automatically saves your conversation logs up to the last answered question. When you exit or drop, your partial progress is recorded, and an exit reason ('Technical issues') is generated for HR review."
    },
    {
      q: "How long does it take to generate my AI Interview feedback?",
      a: "Feedback reports are processed by our AI engine immediately after the call ends. It typically takes between 10 to 30 seconds to parse the transcript, calculate metrics, and redirect you to your completed dashboard."
    },
    {
      q: "Can I retake the interview if I accidentally submitted an incomplete exit reason?",
      a: "Interview links are generally single-use to ensure evaluation fairness. If you dropped due to an unexpected emergency, please contact the HR coordinator who assigned you the link to request a reset."
    }
  ];

  // ─── Filter FAQs based on search query ───
  const filteredFaqs: FAQ[] = faqs.filter((faq: FAQ): boolean => 
    faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Handlers ───
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(e.target.value);
  };

  const handleFaqToggle = (index: number): void => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* ─── HEADER & SEARCH SECTION ─── */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Candidate Help & Support Center
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Find answers to common technical queries about your automated AI voice interview session.
          </p>
          
          <div className="max-w-xl mx-auto relative mt-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search for troubleshooting guides, keywords, or problems..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-slate-400 transition-all outline-none"
              aria-label="Search help articles"
            />
          </div>
        </div>

        {/* ─── TROUBLESHOOTING CATEGORIES ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((cat: Category, idx: number) => (
            <div 
              key={idx} 
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex gap-4 items-start group cursor-pointer"
            >
              <div className="p-3 bg-slate-50 rounded-xl shrink-0 group-hover:scale-110 transition-transform duration-200">
                {cat.icon}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base mb-1">{cat.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{cat.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ─── FAQ ACCORDION SECTION ─── */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <HelpCircle className="text-blue-600 h-6 w-6" />
              Frequently Asked Questions
            </h2>
            {searchQuery && (
              <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                {filteredFaqs.length} result{filteredFaqs.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          <div className="divide-y divide-slate-100">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq: FAQ, idx: number) => (
                <div key={idx} className="py-4 first:pt-0 last:pb-0">
                  <button
                    onClick={() => handleFaqToggle(idx)}
                    className="w-full flex justify-between items-center text-left py-2 font-semibold text-slate-700 hover:text-blue-600 transition-colors"
                    aria-expanded={openFaq === idx}
                    aria-controls={`faq-answer-${idx}`}
                  >
                    <span className="pr-4">{faq.q}</span>
                    <ChevronDown 
                      className={`h-4 w-4 text-slate-400 transition-transform duration-300 shrink-0 ${
                        openFaq === idx ? "transform rotate-180 text-blue-600" : ""
                      }`} 
                    />
                  </button>
                  
                  <div 
                    id={`faq-answer-${idx}`}
                    role="region"
                    className={`grid transition-all duration-300 ease-in-out ${
                      openFaq === idx 
                        ? "grid-rows-[1fr] opacity-100 mt-2" 
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-sm text-slate-500 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400 italic">
                  No matching questions found for &ldquo;{searchQuery}&rdquo;
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-blue-600 hover:text-blue-700 mt-1 underline underline-offset-2"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── CONTACT & TICKET SUBMISSION FOOTER ─── */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl p-8 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-xl font-bold flex items-center justify-center md:justify-start gap-2">
              <MessageSquare className="h-5 w-5" /> Still facing technical hurdles?
            </h3>
            <p className="text-sm text-blue-100 max-w-xl">
              Submit a support request containing your Session ID, or drop an email to our administration panel. Our technical helpdesk responds within 15 minutes.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
            <a 
              href="mailto:mmsohaib617@gmail.com" 
              className="bg-white text-blue-700 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-md text-sm text-center flex items-center justify-center gap-2"
            >
              <Mail className="h-4 w-4" /> Email Admin
            </a>
            <div className="text-xs text-blue-100 flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" /> 24/7 Monitoring Active
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}