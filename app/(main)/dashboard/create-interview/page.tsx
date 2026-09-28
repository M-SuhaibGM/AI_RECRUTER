"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState, useCallback } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";

import { Progress } from "@/components/ui/progress";
import { interviewFormSchema, type InterviewFormValues } from "@/lib/validations/interview";
import { useCredits } from "@/context/CreditsContext"; // ✅ Use context
import FormContainer from "./_components/FormContainer";

// ✅ Lazy-load heavy components
const QuestionList = dynamic(() => import("./_components/QuestionList"), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

const InterviewLink = dynamic(() => import("./_components/InterviewLink"), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

const emptyFormData: InterviewFormValues = {
  jobPosition: "",
  jobDescription: "",
  duration: "" as InterviewFormValues["duration"],
  type: [],
};

function CreateInterview() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<InterviewFormValues>(emptyFormData);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof InterviewFormValues, string>>
  >({});
  const [interviewId, setInterviewId] = useState<string>();

  // ✅ Read credits from context — no fetch, no useEffect
  const { credits: liveCredits } = useCredits();

  const onHandleInputChange = useCallback(
    <K extends keyof InterviewFormValues>(
      field: K,
      value: InterviewFormValues[K]
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    []
  );

  const onGoToNext = useCallback(() => {
    if (liveCredits <= 0) {
      toast.error("Please add credits before creating an interview.");
      return;
    }

    const result = interviewFormSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const mappedErrors = Object.entries(fieldErrors).reduce<
        Partial<Record<keyof InterviewFormValues, string>>
      >((acc, [key, value]) => {
        if (value?.[0]) {
          acc[key as keyof InterviewFormValues] = value[0];
        }
        return acc;
      }, {});

      setFormErrors(mappedErrors);
      const firstError = Object.values(mappedErrors)[0];
      toast.error(
        firstError || "Please fill in the highlighted fields correctly."
      );
      return;
    }

    setFormErrors({});
    setStep((currentStep) => currentStep + 1);
  }, [liveCredits, formData]);

  const onCreateLink = useCallback((interview_id: string) => {
    setInterviewId(interview_id);
    setStep((currentStep) => currentStep + 1);
  }, []);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((s) => s - 1);
    } else {
      router.back();
    }
  }, [step, router]);

  return (
    <div className="mt-10 px-6 sm:px-10 md:px-24 lg:px-44 xl:px-56">
      <div className="flex gap-5 items-center">
        <ArrowLeft onClick={handleBack} className="cursor-pointer" />
        <h2 className="font-bold text-2xl">Create New Interview</h2>
      </div>
      <Progress value={step * 33} className="my-5" />
      {step === 1 ? (
        <FormContainer
          onHandleInputChange={onHandleInputChange}
          GoToNext={onGoToNext}
          formData={formData}
          errors={formErrors}
        />
      ) : step === 2 ? (
        <QuestionList
          formData={formData}
          credits={liveCredits}
          onCreateLink={onCreateLink}
        />
      ) : step === 3 ? (
        <InterviewLink interview_id={interviewId} formData={formData} />
      ) : null}
    </div>
  );
}

export default CreateInterview;