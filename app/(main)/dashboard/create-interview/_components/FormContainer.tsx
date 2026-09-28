"use client";

import { ArrowRight } from "lucide-react";
import React, { useCallback, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type InterviewFormValues } from "@/lib/validations/interview";
import { InterviewType } from "@/services/Constants";

type FormContainerProps = {
  onHandleInputChange: <K extends keyof InterviewFormValues>(
    field: K,
    value: InterviewFormValues[K]
  ) => void;
  GoToNext: () => void;
  formData: InterviewFormValues;
  errors?: Partial<Record<keyof InterviewFormValues, string>>;
};

// ✅ Hoisted outside component — stable array, no re-creation on render
const DURATION_OPTIONS = [
  { value: "5 min", label: "5 minutes" },
  { value: "15 min", label: "15 minutes" },
  { value: "30 min", label: "30 minutes" },
  { value: "45 min", label: "45 minutes" },
  { value: "60 min", label: "60 minutes" },
] as const;

function FormContainer({
  onHandleInputChange,
  GoToNext,
  formData,
  errors,
}: FormContainerProps) {


  const interviewType = useMemo(
    () => formData.type ?? [],
    [formData.type]
  );
  // ✅ useCallback — stable handler
  const AddInterviewType = useCallback(
    (type: string) => {
      const alreadySelected = interviewType.includes(type);
      const nextTypes = alreadySelected
        ? interviewType.filter((item) => item !== type)
        : [...interviewType, type];
      onHandleInputChange("type", nextTypes);
    },
    [interviewType, onHandleInputChange]
  );
  // ✅ Use a Set for O(1) lookup instead of Array.includes
  const selectedTypesSet = useMemo(
    () => new Set(interviewType),
    [interviewType]
  );
  // ✅ Stable handlers — no regex on keystroke
  const handleJobPositionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onHandleInputChange("jobPosition", e.target.value);
    },
    [onHandleInputChange]
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onHandleInputChange("jobDescription", e.target.value);
    },
    [onHandleInputChange]
  );

  const handleDurationChange = useCallback(
    (value: string) => {
      onHandleInputChange(
        "duration",
        value as InterviewFormValues["duration"]
      );
    },
    [onHandleInputChange]
  );

  return (
    <div className="rounded-2xl bg-white p-5">
      {/* Job Position */}
      <div>
        <label htmlFor="jobPosition" className="text-sm font-medium">
          Job Position
        </label>
        <Input
          id="jobPosition"
          type="text"
          placeholder="e.g. Full Stack Developer"
          className="mt-2"
          value={formData.jobPosition}
          onChange={handleJobPositionChange}
        />
        {errors?.jobPosition && (
          <p className="mt-1 text-sm text-red-500">{errors.jobPosition}</p>
        )}
      </div>

      {/* Job Description */}
      <div className="mt-5">
        <label htmlFor="jobDescription" className="text-sm font-medium">
          Job Description
        </label>
        <Textarea
          id="jobDescription"
          placeholder="Enter details of job description"
          className="mt-2 h-50"
          value={formData.jobDescription}
          onChange={handleDescriptionChange}
        />
        {errors?.jobDescription && (
          <p className="mt-1 text-sm text-red-500">{errors.jobDescription}</p>
        )}
      </div>

      {/* Interview Duration */}
      <div className="mt-5">
        <label htmlFor="duration" className="text-sm font-medium">
          Interview Duration
        </label>
        <Select value={formData.duration} onValueChange={handleDurationChange}>
          <SelectTrigger id="duration" className="mt-2 w-full">
            <SelectValue placeholder="Select Duration" />
          </SelectTrigger>
          <SelectContent>
            {DURATION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.duration && (
          <p className="mt-1 text-sm text-red-500">{errors.duration}</p>
        )}
      </div>

      {/* Interview Type */}
      <div className="mt-5">
        <span className="text-sm font-medium">Interview Type</span>
        <div
          className="mt-2 flex flex-wrap gap-3"
          role="group"
          aria-label="Interview types"
        >
          {InterviewType.map((type) => {
            const isSelected = selectedTypesSet.has(type.title);
            const Icon = type.icon;
            return (
              <button
                key={type.title}
                type="button"
                onClick={() => AddInterviewType(type.title)}
                aria-pressed={isSelected}
                className={`flex cursor-pointer items-center gap-2 rounded-2xl border border-gray-300 bg-white p-1 px-2 transition-colors hover:bg-secondary ${isSelected ? "bg-blue-100 text-primary border-blue-300" : ""
                  }`}
              >
                <Icon className="h-4 w-4" />
                <span>{type.title}</span>
              </button>
            );
          })}
        </div>
        {errors?.type && (
          <p className="mt-1 text-sm text-red-500">{errors.type}</p>
        )}
      </div>

      {/* ✅ Button now has the onClick, not the wrapper */}
      <div className="mt-7 flex justify-end">
        <Button onClick={GoToNext} className="cursor-pointer">
          Generate Question <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

export default FormContainer;