import React from "react";
import Link from "next/link";
import {
  Briefcase,
  Users,
  Calendar,
  ArrowRight,
  Sparkles,
  Video,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ───
interface Interview {
  id: string;
  jobPosition: string;
  duration: number | string;
  createdAt: string | Date;
  _count?: { candidates: number };
  questions?: { id: string }[];
}

interface AllInterviewListProps {
  interviews: Interview[];
}

// ✅ Hoisted formatter — created once at module load
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

// ─── Empty State ───
function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-10">
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
        <Video size={32} />
      </div>
      <h3 className="text-lg font-semibold text-gray-600">No interviews found</h3>
      <p className="text-sm text-gray-400">
        Create your first interview to see it listed here.
      </p>
    </div>
  );
}

// ─── Main Component (Server Component) ───
export default function AllInterviewList({ interviews }: AllInterviewListProps) {
  return (
    <div
      className="bg-white border rounded-[30px] shadow-sm overflow-hidden flex flex-col"
      style={{ height: "80vh" }}
    >
      {/* Header */}
      <div className="p-6 border-b bg-white shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold mb-2">
              <Sparkles size={12} />
              AI RECRUITER SYSTEM
            </div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
              Interview Management
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right flex items-center gap-2 justify-center">
              <p className="text-xs text-gray-600 uppercase font-bold tracking-wider">
                Total Active :
              </p>
              <p className="text-xl font-black text-blue-600">{interviews.length}</p>
            </div>
            <Button asChild className="rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md">
              <Link href="/dashboard/create-interview">+ New Interview</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {interviews.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* ─── Desktop Table (hidden on mobile) ─── */}
            <table className="w-full text-left border-collapse hidden md:table">
              <thead className="sticky top-0 bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-semibold z-10">
                <tr>
                  <th className="px-6 py-4 border-b">Job Position</th>
                  <th className="px-6 py-4 border-b">Duration</th>
                  <th className="px-6 py-4 border-b">Stats</th>
                  <th className="px-6 py-4 border-b">Created Date</th>
                  <th className="px-6 py-4 border-b text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {interviews.map((interview) => (
                  <tr
                    key={interview.id}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <Briefcase size={18} />
                        </div>
                        <Link
                          href={`/all-interview/${interview.id}`}
                          className="font-bold text-gray-700 hover:text-blue-600 flex items-center gap-1 group-hover:underline decoration-2 underline-offset-4"
                        >
                          {interview.jobPosition}
                          <ExternalLink
                            size={12}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </Link>
                      </div>
                    </td>

                    <td className="px-6 py-5 text-sm text-gray-500 font-medium">
                      {interview.duration} mins
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                          <Users size={12} />
                          <span>{interview._count?.candidates ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-blue-500 bg-blue-50 px-2.5 py-1 rounded-full">
                          <Calendar size={12} />
                          <span>{interview.questions?.length ?? 0} Qs</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5 text-sm text-gray-400">
                      {DATE_FORMATTER.format(new Date(interview.createdAt))}
                    </td>

                    <td className="px-6 py-5 text-right">
                      {/* ✅ Single Link — no nested button */}
                      <Link
                        href={`/all-interview/${interview.id}`}
                        aria-label={`View ${interview.jobPosition}`}
                        className="inline-flex p-2 text-gray-300 hover:text-blue-600 transition-colors"
                      >
                        <ArrowRight size={20} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ─── Mobile Card List (hidden on desktop) ─── */}
            <div className="md:hidden divide-y divide-gray-100">
              {interviews.map((interview) => (
                <Link
                  key={interview.id}
                  href={`/all-interview/${interview.id}`}
                  className="block p-4 hover:bg-blue-50/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Briefcase size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 truncate">
                        {interview.jobPosition}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {DATE_FORMATTER.format(new Date(interview.createdAt))}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          <Users size={10} />
                          {interview._count?.candidates ?? 0}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                          <Calendar size={10} />
                          {interview.questions?.length ?? 0} Qs
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {interview.duration} mins
                        </span>
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-gray-300 shrink-0 mt-3" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t shrink-0 flex justify-between items-center text-xs text-gray-400 font-medium">
        <span>
          Showing {interviews.length} total{" "}
          {interviews.length === 1 ? "entry" : "entries"}
        </span>
        <span className="italic">AI Voice Recruiter System v1.0</span>
      </div>
    </div>
  );
}