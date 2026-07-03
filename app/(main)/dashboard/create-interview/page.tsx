"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { getUserCredits } from "@/actions/user";
import { Progress } from "@/components/ui/progress";
import { interviewFormSchema, type InterviewFormValues } from "@/lib/validations/interview";
import FormContainer from "./_components/FormContainer";
import InterviewLink from "./_components/InterviewLink";
import QuestionList from "./_components/QuestionList";

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
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof InterviewFormValues, string>>>({});
  const { data: session } = useSession();
  const user = session?.user;
  const [interviewId, setInterviewId] = useState<string>();
  const [liveCredits, setLiveCredits] = useState(0);

  const onHandleInputChange = <K extends keyof InterviewFormValues>(field: K, value: InterviewFormValues[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  useEffect(() => {
    if (user && "id" in user) {
      const fetchFreshCredits = async () => {
        const credits = await getUserCredits();
        setLiveCredits(credits);
      };
      void fetchFreshCredits();
    }
  }, [user]);

  const onGoToNext = () => {
    if (liveCredits <= 0) {
      toast.error("Please add credits before creating an interview.");
      return;
    }

    const result = interviewFormSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const mappedErrors = Object.entries(fieldErrors).reduce<Partial<Record<keyof InterviewFormValues, string>>>((acc, [key, value]) => {
        if (value?.[0]) {
          acc[key as keyof InterviewFormValues] = value[0];
        }
        return acc;
      }, {});

      setFormErrors(mappedErrors);
      const firstError = Object.values(mappedErrors)[0];
      toast.error(firstError || "Please fill in the highlighted fields correctly.");
      return;
    }

    setFormErrors({});
    setStep((currentStep) => currentStep + 1);
  };

  const onCreateLink = (interview_id: string) => {
    setInterviewId(interview_id);
    setStep((currentStep) => currentStep + 1);
  };

  return (
    <div className="mt-10 px-10 md:px-24 lg:px-44 xl:px-56">
      <div className="flex gap-5 items-center">
        <ArrowLeft onClick={() => router.back()} className="cursor-pointer" />
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
