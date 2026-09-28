import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
    Edit, ArrowLeft, Calendar, Clock, Briefcase, Mail, Link as LinkIcon, ChevronDown,
} from "lucide-react";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import DeleteInterviewAction from "./component/DeleteInterview";
import CopyLinkButton from "./component/CopyLinkButton";

// ─── Types ───
interface Question {
    question?: string;
    answer?: string;
}

interface PageProps {
    params: Promise<{ interviewId: string }>;
}

// ✅ Hoisted formatter
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
});

// ✅ Simplified parser — assumes data is stored as JSON array
function parseQuestions(questions: Prisma.JsonValue): Question[] {
    if (!Array.isArray(questions)) return [];

    return questions
        .filter((item) => typeof item === "object" && item !== null && !Array.isArray(item))
        .map((item) => ({
            question: typeof (item as Prisma.JsonObject).question === "string"
                ? (item as Prisma.JsonObject).question as string
                : undefined,
            answer: typeof (item as Prisma.JsonObject).answer === "string"
                ? (item as Prisma.JsonObject).answer as string
                : undefined,
        }));
}

// ─── Main Component ───
export default async function InterviewDetailsPage({ params }: PageProps) {
    const { interviewId } = await params;

    // ✅ 1. Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        redirect("/auth/login");
    }

    // ✅ 2. Ownership check + only fetch needed fields
    const interview = await prisma.interview.findUnique({
        where: { id: interviewId },
        select: {
            id: true,
            jobPosition: true,
            jobDescription: true,
            duration: true,
            createdAt: true,
            interviewLink: true,
            userEmail: true,
            questions: true,
        },
    });

    if (!interview) notFound();

    // ✅ 3. Verify ownership — critical security fix
    if (interview.userEmail !== session.user.email) {
        notFound(); // Don't leak existence — use 404, not 403
    }

    const url = `${process.env.NEXT_PUBLIC_HOST_URL}/interview/${interview.interviewLink}`;
    const questions = parseQuestions(interview.questions);
    const formattedDate = DATE_FORMATTER.format(new Date(interview.createdAt));

    return (
        <div
            className="flex flex-col w-full max-w-6xl mx-auto bg-white border rounded-xl shadow-md overflow-hidden"
            style={{ height: "73vh" }}
        >
            {/* Header */}
            <div className="p-6 border-b flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-4">
                    <Link
                        href="/all-interview"
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Back to all interviews"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="font-bold text-2xl text-gray-800">
                            {interview.jobPosition}
                        </h1>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            <Mail size={14} /> {interview.userEmail}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    {/* ✅ Button asChild — no nested button inside link */}
                    <Button asChild className="bg-blue-600 hover:bg-blue-700">
                        <Link
                            href={`/all-interview/${interviewId}/edit`}
                            className="flex items-center gap-2"
                        >
                            <Edit size={18} /> Update
                        </Link>
                    </Button>
                    <DeleteInterviewAction interviewId={interviewId} />
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                General Info
                            </h3>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="p-2 bg-white rounded-md shadow-sm text-blue-600">
                                    <Clock size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Duration</p>
                                    <p className="text-sm font-semibold">
                                        {interview.duration} mins
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="p-2 bg-white rounded-md shadow-sm text-green-600">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Created At</p>
                                    <p className="text-sm font-semibold">{formattedDate}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg overflow-hidden">
                                <div className="p-2 bg-white rounded-md shadow-sm text-purple-600">
                                    <LinkIcon size={18} />
                                </div>
                                <div className="truncate w-full">
                                    <CopyLinkButton url={url} />
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border border-dashed rounded-xl border-gray-200">
                            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                <Briefcase size={16} /> Job Description
                            </h3>
                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                {interview.jobDescription || "No description provided."}
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Questions */}
                    <div className="lg:col-span-2">
                        {/* ✅ Removed the outer <details> — Accordion handles it */}
                        <div className="border rounded-xl bg-white overflow-hidden">
                            <div className="flex items-center justify-between p-6 border-b bg-slate-50/50">
                                <div className="flex flex-col">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        Interview Questions
                                    </h3>
                                    <p className="text-sm text-gray-600 font-medium mt-1">
                                        {questions.length} Question{questions.length !== 1 ? "s" : ""} Generated
                                    </p>
                                </div>
                            </div>

                            <div className="bg-gray-50/50 p-4">
                                {questions.length > 0 ? (
                                    <Accordion
                                        type="single"
                                        collapsible
                                        className="w-full bg-white rounded-lg border shadow-sm"
                                    >
                                        {questions.map((q, index) => (
                                            <AccordionItem
                                                value={`item-${index}`}
                                                key={index}
                                                className="px-6 border-b last:border-b-0 hover:bg-slate-50/50 transition-colors"
                                            >
                                                <AccordionTrigger className="hover:no-underline py-4">
                                                    <div className="flex items-center gap-4 text-left">
                                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs shrink-0">
                                                            {index + 1}
                                                        </span>
                                                        <span className="font-semibold text-gray-700 line-clamp-1 text-sm">
                                                            {q.question || `Question ${index + 1}`}
                                                        </span>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="pb-6 pt-2 text-gray-600 pl-12 leading-relaxed">
                                                    <div className="p-4 bg-slate-50 border rounded-lg shadow-inner text-sm">
                                                        {q.answer ? (
                                                            <>
                                                                <p className="font-bold text-xs text-blue-500 uppercase mb-2">
                                                                    Sample Answer/Hint:
                                                                </p>
                                                                {q.answer}
                                                            </>
                                                        ) : (
                                                            <p className="text-gray-400 italic">
                                                                No sample answer provided.
                                                            </p>
                                                        )}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                ) : (
                                    <div className="p-10 text-center text-gray-400 italic">
                                        No questions found for this position.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}