"use client";

import { ArrowRight } from "lucide-react";
import React from "react";

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
  onHandleInputChange: <K extends keyof InterviewFormValues>(field: K, value: InterviewFormValues[K]) => void;
  GoToNext: () => void;
  formData: InterviewFormValues;
  errors?: Partial<Record<keyof InterviewFormValues, string>>;
};

function FormContainer({ onHandleInputChange, GoToNext, formData, errors }: FormContainerProps) {
  const interviewType = formData.type ?? [];

  const AddInterviewType = (type: string) => {
    const alreadySelected = interviewType.includes(type);
    const nextTypes = alreadySelected
      ? interviewType.filter((item) => item !== type)
      : [...interviewType, type];

    onHandleInputChange("type", nextTypes);
  };

  return (
    <div className="rounded-2xl bg-white p-5">
      <div>
        <h2 className="text-sm font-medium">Job Position</h2>
        <Input
          type="text"
          placeholder="e.g. Full Stack Developer"
          className="mt-2"
          value={formData.jobPosition}
          onChange={(e: { target: { value: string; }; }) => {
            const noNumbers = e.target.value.replace(/[0-9]/g, "");
            onHandleInputChange("jobPosition", noNumbers);
          }}
        />
        {errors?.jobPosition ? <p className="mt-1 text-sm text-red-500">{errors.jobPosition}</p> : null}
      </div>

      <div className="mt-5">
        <h2 className="text-sm font-medium">Job Description</h2>
        <Textarea
          placeholder="Enter details of job description"
          className="mt-2 h-[200px]"
          value={formData.jobDescription}
          onChange={(e: { target: { value: string; }; }) => onHandleInputChange("jobDescription", e.target.value)}
        />
        {errors?.jobDescription ? <p className="mt-1 text-sm text-red-500">{errors.jobDescription}</p> : null}
      </div>

      <div className="mt-5">
        <h2 className="text-sm font-medium">Interview Duration</h2>
        <Select
          value={formData.duration}
          onValueChange={(value: string) => onHandleInputChange("duration", value as InterviewFormValues["duration"])}
        >
          <SelectTrigger className="mt-2 w-full">
            <SelectValue placeholder="Select Duration" />
          </SelectTrigger>
          <SelectContent className="">
            <SelectItem className="" value="5 min">5 minutes</SelectItem>
            <SelectItem className="" value="15 min">15 minutes</SelectItem>
            <SelectItem className="" value="30 min">30 minutes</SelectItem>
            <SelectItem className="" value="45 min">45 minutes</SelectItem>
            <SelectItem className="" value="60 min">60 minutes</SelectItem>
          </SelectContent>
        </Select>
        {errors?.duration ? <p className="mt-1 text-sm text-red-500">{errors.duration}</p> : null}
      </div>

      <div className="mt-5">
        <h2 className="text-sm font-medium">Interview Type</h2>
        <div className="mt-2 flex flex-wrap gap-3">
          {InterviewType.map((type, index) => (
            <div
              key={`${type.title}-${index}`}
              className={`flex cursor-pointer items-center gap-2 rounded-2xl border border-gray-300 bg-white p-1 px-2 hover:bg-secondary ${interviewType.includes(type.title) ? "bg-blue-100 text-primary" : ""
                }`}
              onClick={() => AddInterviewType(type.title)}
            >
              <type.icon className="h-4 w-4" />
              <span>{type.title}</span>
            </div>
          ))}
        </div>
        {errors?.type ? <p className="mt-1 text-sm text-red-500">{errors.type}</p> : null}
      </div>

      <div className="mt-7 flex justify-end" onClick={GoToNext}>
        <Button className="cursor-pointer">
          Generate Question <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

export default FormContainer;