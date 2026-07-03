import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Edit, ArrowLeft, Calendar, Clock, Briefcase, Mail, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { Interview, Prisma } from "@prisma/client";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import DeleteInterviewAction from "./component/DeleteInterview";
import CopyLinkButton from "./component/CopyLinkButton";

// ─── Type Definitions ───
interface Question {
    question?: string;
    answer?: string;
}
interface PageProps {
    params: Promise<{
        interviewId: string;
    }>;
}

// ─── Helper Functions ───
function parseQuestions(questions: Prisma.JsonValue | Question[]): Question[] {
    if (questions === null || questions === undefined) {
        return [];
    }

    if (Array.isArray(questions)) {
        return questions
            .filter(
                (item): item is Question =>
                    typeof item === "object" &&
                    item !== null &&
                    ("question" in item || "answer" in item)
            )
            .map((item) => ({
                question:
                    typeof item.question === "string" ? item.question : undefined,
                answer: typeof item.answer === "string" ? item.answer : undefined,
            }));
    }

    if (typeof questions === "string") {
        try {
            const parsed = JSON.parse(questions);
            return Array.isArray(parsed) ? parseQuestions(parsed) : [];
        } catch {
            return [];
        }
    }

    return [];
}

// ─── Main Component ───
export default async function InterviewDetailsPage({ params }: PageProps): Promise<React.ReactElement> {
    const { interviewId } = await params;

    const interview: Interview | null = await prisma.interview.findUnique({
        where: { id: interviewId },
    });

    if (!interview) {
        notFound();
    }

    const url: string = `${process.env.NEXT_PUBLIC_HOST_URL}/interview/${interview.interviewLink}`;
    const questions: Question[] = parseQuestions(interview.questions);
    const formattedDate: string = new Date(interview.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div 
            className="flex flex-col w-full max-w-6xl mx-auto bg-white border rounded-xl shadow-md overflow-hidden"
            style={{ height: '73vh' }}
        >
            {/* HEADER: Sticky Top */}
            <div className="p-6 border-b flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-4">
                    <Link 
                        href="/all-interview" 
                        className="p-2 hover:bg-gray-100 rounded-full transition"
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
                    <Link href={`/all-interview/${interviewId}/edit`}>
                        <button className="flex gap-2 items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                            <Edit size={18} /> Update
                        </button>
                    </Link>
                    <DeleteInterviewAction interviewId={interviewId} />
                </div>
            </div>

            {/* SCROLLABLE CONTENT BODY */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Details & Stats */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                General Info
                            </h3>

                            {/* Duration Card */}
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

                            {/* Created Date Card */}
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="p-2 bg-white rounded-md shadow-sm text-green-600">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Created At</p>
                                    <p className="text-sm font-semibold">
                                        {formattedDate}
                                    </p>
                                </div>
                            </div>

                            {/* Interview Link Card */}
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg overflow-hidden">
                                <div className="p-2 bg-white rounded-md shadow-sm text-purple-600">
                                    <LinkIcon size={18} />
                                </div>
                                <div className="truncate w-full">
                                    <CopyLinkButton url={url} />
                                </div>
                            </div>
                        </div>

                        {/* Job Description Card */}
                        <div className="p-5 border border-dashed rounded-xl border-gray-200">
                            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                <Briefcase size={16} /> Job Description
                            </h3>
                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                {interview.jobDescription || "No description provided."}
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Questions Drawer */}
                    <div className="lg:col-span-2">
                        <details className="group border rounded-xl bg-white overflow-hidden transition-all duration-300">
                            <summary className="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-slate-50 transition">
                                <div className="flex flex-col">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        Interview Questions
                                    </h3>
                                    <p className="text-sm text-gray-600 font-medium mt-1">
                                        {questions.length} Question{questions.length !== 1 ? 's' : ''} Generated
                                    </p>
                                </div>

                                <div className="p-2 rounded-full group-open:rotate-180 transition-transform duration-300 bg-blue-50 text-blue-600">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </div>
                            </summary>

                            <div className="border-t bg-gray-50/50 p-4">
                                {questions.length > 0 ? (
                                    <Accordion 
                                        type="single" 
                                        collapsible 
                                        className="w-full bg-white rounded-lg border shadow-sm"
                                    >
                                        {questions.map((q: Question, index: number) => (
                                            <AccordionItem 
                                                value={`item-${index}`} 
                                                key={index} 
                                                className="px-6 border-b last:border-b-0 hover:bg-slate-50/50 transition"
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
                        </details>
                    </div>
                </div>
            </div>
        </div>
    );
}