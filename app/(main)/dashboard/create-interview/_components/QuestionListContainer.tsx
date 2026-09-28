import React, { useState, useCallback } from "react";
import QuestionItem, { type Question } from "./QuestionItem";

interface QuestionListContainerProps {
  questionList: Question[];
  onDelete?: (index: number) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  editable?: boolean;
}

function QuestionListContainer({
  questionList,
  onDelete,
  onReorder,
  editable = false,
}: QuestionListContainerProps): React.ReactElement {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // ✅ Stable callback — won't cause re-renders of QuestionItem
  const toggleExpand = useCallback((index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg text-slate-800">
          Generated Interview Questions
          {questionList.length > 0 && (
            <span className="text-sm font-normal text-slate-500 ml-2">
              ({questionList.length}{" "}
              {questionList.length === 1 ? "question" : "questions"})
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
          {questionList.map((item, index) => (
            <QuestionItem
              key={item.id || index}
              item={item}
              index={index}
              isExpanded={expandedIndex === index}
              onToggle={toggleExpand}
              onDelete={onDelete}
              editable={editable}
            />
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