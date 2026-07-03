import React, { useState } from "react";
import { ChevronDown, ChevronUp, Trash2, GripVertical, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Type Definitions ───
interface Question {
  id?: string;
  question: string;
  type: string;
  answer?: string;
  difficulty?: "easy" | "medium" | "hard";
}

interface QuestionListContainerProps {
  questionList: Question[];
  onDelete?: (index: number) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  editable?: boolean;
}

// ─── Difficulty Badge ───
const DifficultyBadge: React.FC<{ difficulty?: string }> = ({ difficulty }) => {
  if (!difficulty) return null;

  const styles: Record<string, string> = {
    easy: "bg-emerald-100 text-emerald-700 border-emerald-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    hard: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${styles[difficulty] || ""}`}>
      {difficulty}
    </span>
  );
};

// ─── Question Type Badge ───
const TypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const styles: Record<string, string> = {
    technical: "bg-blue-100 text-blue-700 border-blue-200",
    behavioral: "bg-purple-100 text-purple-700 border-purple-200",
    situational: "bg-orange-100 text-orange-700 border-orange-200",
    "soft-skills": "bg-pink-100 text-pink-700 border-pink-200",
  };

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${styles[type.toLowerCase()] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {type}
    </span>
  );
};

// ─── Copy Button ───
const CopyQuestionButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
      title="Copy question"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-600" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-slate-400" />
      )}
    </button>
  );
};

// ─── Main Component ───
function QuestionListContainer({ 
  questionList, 
  onDelete, 
  onReorder,
  editable = false 
}: QuestionListContainerProps): React.ReactElement {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number): void => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg text-slate-800">
          Generated Interview Questions
          {questionList.length > 0 && (
            <span className="text-sm font-normal text-slate-500 ml-2">
              ({questionList.length} {questionList.length === 1 ? 'question' : 'questions'})
            </span>
          )}
        </h2>
        
        {questionList.length > 0 && (
          <span className="text-xs text-slate-400">
            Click to expand details
          </span>
        )}
      </div>
      
      {/* Questions List */}
      {questionList.length > 0 ? (
        <div className="space-y-3">
          {questionList.map((item: Question, index: number) => (
            <div
              key={item.id || index}
              className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
            >
              {/* Question Header */}
              <div 
                className="p-4 cursor-pointer"
                onClick={() => toggleExpand(index)}
              >
                <div className="flex items-start gap-3">
                  {/* Drag Handle (if editable) */}
                  {editable && (
                    <button className="mt-0.5 cursor-grab text-slate-300 hover:text-slate-500 transition-colors">
                      <GripVertical className="w-4 h-4" />
                    </button>
                  )}

                  {/* Question Number */}
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs shrink-0 mt-0.5">
                    {index + 1}
                  </span>

                  {/* Question Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-800 text-sm line-clamp-2">
                        {item.question}
                      </h3>
                      
                      {/* Expand/Collapse Icon */}
                      <button className="shrink-0 mt-0.5">
                        {expandedIndex === index ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>

                    {/* Badges Row */}
                    <div className="flex items-center gap-2 mt-2">
                      <TypeBadge type={item.type} />
                      {item.difficulty && <DifficultyBadge difficulty={item.difficulty} />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedIndex === index && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                  {item.answer ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                        Sample Answer
                      </p>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">
                      No sample answer provided.
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-200">
                    <CopyQuestionButton text={item.question} />
                    
                    {editable && onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onDelete(index);
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 bg-white rounded-xl border border-dashed border-slate-300 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-3">
            <svg
              className="w-6 h-6 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">No questions generated yet.</p>
          <p className="text-slate-400 text-xs mt-1">
            Configure your interview settings to generate questions.
          </p>
        </div>
      )}
    </div>
  );
}

export default QuestionListContainer;