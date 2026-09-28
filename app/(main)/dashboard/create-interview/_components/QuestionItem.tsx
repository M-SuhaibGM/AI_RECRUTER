import React, { useState, useCallback, memo } from "react";
import { ChevronDown, ChevronUp, Trash2, GripVertical, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Type Definitions ───
export interface Question {
  id?: string;
  question: string;
  type: string;
  answer?: string;
  difficulty?: "easy" | "medium" | "hard";
}

interface QuestionItemProps {
  item: Question;
  index: number;
  isExpanded: boolean;
  onToggle: (index: number) => void;
  onDelete?: (index: number) => void;
  editable?: boolean;
}

// ─── Difficulty Badge ───
const DifficultyBadge: React.FC<{ difficulty?: string }> = memo(({ difficulty }) => {
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
});
DifficultyBadge.displayName = "DifficultyBadge";

// ─── Question Type Badge ───
const TypeBadge: React.FC<{ type: string }> = memo(({ type }) => {
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
});
TypeBadge.displayName = "TypeBadge";

// ─── Copy Button ───
const CopyQuestionButton: React.FC<{ text: string }> = memo(({ text }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
      title="Copy question"
      aria-label="Copy question"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-600" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-slate-400" />
      )}
    </button>
  );
});
CopyQuestionButton.displayName = "CopyQuestionButton";

// ─── Question Item (Memoized) ───
const QuestionItem: React.FC<QuestionItemProps> = memo(
  ({ item, index, isExpanded, onToggle, onDelete, editable }) => {
    const handleToggle = useCallback(() => {
      onToggle(index);
    }, [onToggle, index]);

    const handleDelete = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete?.(index);
      },
      [onDelete, index]
    );

    return (
      <div className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
        {/* Question Header */}
        <div className="p-4 cursor-pointer" onClick={handleToggle}>
          <div className="flex items-start gap-3">
            {/* Drag Handle */}
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
                <button className="shrink-0 mt-0.5" aria-label={isExpanded ? "Collapse" : "Expand"}>
                  {isExpanded ? (
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
        {isExpanded && (
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
                  onClick={handleDelete}
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
    );
  }
);

QuestionItem.displayName = "QuestionItem";

export default QuestionItem;