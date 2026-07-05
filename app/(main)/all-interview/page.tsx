"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  Briefcase,
  Users,
  Calendar,
  ArrowRight,
  Sparkles,
  Video,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import axios, { AxiosError } from "axios";
import { Button } from "@/components/ui/button";

// ─── Type Definitions ───
interface Candidate {
  id: string;
  name?: string;
  email?: string;
  status?: string;
}

interface Question {
  id: string;
  question?: string;
  type?: string;
}

interface Interview {
  id: string;
  jobPosition: string;
  duration: number | string;
  createdAt: string | Date;
  interviewLink?: string;
  questions?: Question[];
  _count?: {
    candidates: number;
  };
  candidates?: Candidate[];
}

interface InterviewListResponse {
  data: Interview[];
}

// ─── Skeleton Component ───
const TableSkeleton: React.FC = () => (
  <table className="w-full text-left border-collapse">
    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-semibold">
      <tr>
        <th className="px-6 py-4 border-b">Job Position</th>
        <th className="px-6 py-4 border-b">Duration</th>
        <th className="px-6 py-4 border-b">Stats</th>
        <th className="px-6 py-4 border-b">Created Date</th>
        <th className="px-6 py-4 border-b text-right">Action</th>
      </tr>
    </thead>
    <tbody>
      {[1, 2, 3, 4, 5].map((i: number) => (
        <tr key={i} className="animate-pulse">
          <td className="px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
              <div className="h-4 w-32 bg-gray-200 rounded" />
            </div>
          </td>
          <td className="px-6 py-5">
            <div className="h-4 w-12 bg-gray-100 rounded" />
          </td>
          <td className="px-6 py-5">
            <div className="flex gap-2">
              <div className="h-6 w-12 bg-gray-100 rounded-full" />
              <div className="h-6 w-12 bg-gray-100 rounded-full" />
            </div>
          </td>
          <td className="px-6 py-5">
            <div className="h-4 w-24 bg-gray-100 rounded" />
          </td>
          <td className="px-6 py-5 text-right">
            <div className="h-8 w-8 bg-gray-100 rounded-full ml-auto" />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

// ─── Empty State Component ───
const EmptyState: React.FC = () => (
  <div className="h-full flex flex-col items-center justify-center text-center p-10">
    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
      <Video size={32} />
    </div>
    <h3 className="text-lg font-semibold text-gray-600">No interviews found</h3>
    <p className="text-sm text-gray-400">Create your first interview to see it listed here.</p>
  </div>
);

// ─── Main Component ───
function AllInterview(): React.ReactElement {
  const [interviewList, setInterviewList] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { data: session } = useSession();
  const user = session?.user;

  // Fetch interview list
  const GetInterviewList = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await axios.get<Interview[]>("/api/interviews/all");
      setInterviewList(response.data || []);
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      console.error("Fetch failed:", axiosError.message);
      setInterviewList([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch data when user session becomes available
  useEffect(() => {
    if (user?.email) {
      GetInterviewList();
    }
  }, [user?.email, GetInterviewList]);

  // Format date helper
  const formatDate = (date: string | Date): string => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div 
      className="bg-white border rounded-[30px] shadow-sm overflow-hidden flex flex-col"
      style={{ height: '80vh' }}
    >
      {/* Table Header Section */}
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
              <p className="text-xl font-black text-blue-600">
                {isLoading ? "..." : interviewList.length}
              </p>
            </div>
            <Link href={"/dashboard/create-interview"}>
              <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md">
                + New Interview
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Table Body with Internal Scroll */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <TableSkeleton />
        ) : interviewList.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="w-full text-left border-collapse">
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
              {interviewList.map((interview: Interview) => (
                <tr 
                  key={interview.id} 
                  className="hover:bg-blue-50/30 transition-colors group"
                >
                  {/* Job Position */}
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

                  {/* Duration */}
                  <td className="px-6 py-5 text-sm text-gray-500 font-medium">
                    {interview.duration} mins
                  </td>

                  {/* Stats */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                        <Users size={12} />
                        <span>{interview?._count?.candidates || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-blue-500 bg-blue-50 px-2.5 py-1 rounded-full">
                        <Calendar size={12} />
                        <span>{interview?.questions?.length || 0} Qs</span>
                      </div>
                    </div>
                  </td>

                  {/* Created Date */}
                  <td className="px-6 py-5 text-sm text-gray-400">
                    {formatDate(interview.createdAt)}
                  </td>

                  {/* Action */}
                  <td className="px-6 py-5 text-right">
                    <Link href={`/all-interview/${interview.id}`}>
                      <button className="p-2 text-gray-300 hover:text-blue-600 transition-colors">
                        <ArrowRight size={20} />
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Table Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t shrink-0 flex justify-between items-center text-xs text-gray-400 font-medium">
        <span>
          {isLoading 
            ? "Loading data..." 
            : `Showing ${interviewList.length} total ${interviewList.length === 1 ? 'entry' : 'entries'}`
          }
        </span>
        <span className="italic">AI Voice Recruiter System v1.0</span>
      </div>
    </div>
  );
}

export default AllInterview;