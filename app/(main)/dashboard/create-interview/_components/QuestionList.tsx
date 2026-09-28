"use client";

import { Loader, Loader2Icon } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import axios from "axios";

import { Button } from "@/components/ui/button";
import {
  createInterviewPayloadSchema,
  type InterviewFormValues,
} from "@/lib/validations/interview";
import { useCredits } from "@/context/CreditsContext"; // ✅
import QuestionListContainer from "./QuestionListContainer";

type QuestionListProps = {
  formData: InterviewFormValues;
  onCreateLink: (interviewId: string) => void;
  credits: number;
};

type InterviewQuestion = {
  question: string;
  type: string;
};

function QuestionList({ formData, onCreateLink, credits }: QuestionListProps) {
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [questionList, setQuestionList] = useState<InterviewQuestion[]>([]);
  
  // ✅ Track mounted state to prevent setState after unmount
  const isMountedRef = useRef(true);

  // ✅ Consume context for refreshing credits later
  const { setCredits } = useCredits();

  const GenerateQuestionList = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.post("/api/generate-questions", {
        ...formData,
        type: formData.type,
      });
      if (!isMountedRef.current) return;
      
      const content = response.data as unknown;
      const parsedContent =
        typeof content === "string" ? JSON.parse(content) : content;
      setQuestionList(
        (parsedContent as { interviewQuestions?: InterviewQuestion[] })
          .interviewQuestions ?? []
      );
    } catch {
      if (isMountedRef.current) {
        toast.error("Failed to generate questions. Please try again.");
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [formData]);

  useEffect(() => {
    isMountedRef.current = true;
    void GenerateQuestionList();
    return () => {
      isMountedRef.current = false;
    };
  }, [GenerateQuestionList]);

  const onFinish = async () => {
    if ((credits || 0) <= 0) {
      toast.error("You don't have enough credits.");
      return;
    }

    setSaveLoading(true);

    // ✅ Use native crypto.randomUUID() — no uuid library needed
    const interview_id = crypto.randomUUID();

    const validatedPayload = createInterviewPayloadSchema.safeParse({
      ...formData,
      questions: questionList,
      interview_link: interview_id,
      type: formData.type || ["Technical"],
    });

    if (!validatedPayload.success) {
      toast.error(
        validatedPayload.error.issues[0]?.message ||
          "Please provide valid interview details."
      );
      setSaveLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        "/api/interviews",
        validatedPayload.data
      );

      if (response.data) {
        toast.success("Interview created and credits deducted!");
        
        // ✅ Update credits locally — no need for full session refresh
        setCredits((credits || 0) - 1);
        
        onCreateLink(interview_id);
      }
    } catch (error) {
      const errorMsg = axios.isAxiosError(error)
        ? error.response?.data?.error
        : "Failed to save interview";
      toast.error(
        typeof errorMsg === "string" ? errorMsg : "Failed to save interview"
      );
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div>
      {loading && (
        <div className="flex items-center gap-5 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <Loader2Icon className="animate-spin text-blue-600" />
          <div>
            <h2 className="font-medium">Generating Interview Questions</h2>
            <p className="text-sm text-slate-500">
              Our AI is crafting personalized questions...
            </p>
          </div>
        </div>
      )}

      {!loading && questionList?.length > 0 && (
        <QuestionListContainer questionList={questionList} />
      )}

      <div className="mt-10 flex justify-end">
        <Button
          onClick={onFinish}
          disabled={saveLoading || loading || questionList.length === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saveLoading ? <Loader className="mr-2 animate-spin" /> : null}
          Create Interview Link & Finish
        </Button>
      </div>
    </div>
  );
}

export default QuestionList;