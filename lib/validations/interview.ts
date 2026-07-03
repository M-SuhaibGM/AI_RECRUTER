import { z } from "zod";
import { InterviewType } from "@/services/Constants";

const interviewTypeValues = InterviewType.map((type) => type.title);

export const interviewFormSchema = z.object({
  jobPosition: z
    .string()
    .trim()
    .min(3, "Job position should be at least 3 characters")
    .max(100, "Job position is too long"),
  jobDescription: z
    .string()
    .trim()
    .min(30, "Please describe the role in at least 30 characters")
    .max(2000, "Job description is too long"),
  duration: z.enum(["5 min", "15 min", "30 min", "45 min", "60 min"]).refine((value) => value !== undefined, {
    message: "Please select a valid interview duration",
  }),
  type: z
    .array(z.enum(interviewTypeValues as [string, ...string[]]))
    .min(1, "Please select at least one interview type"),
});

export type InterviewFormValues = z.infer<typeof interviewFormSchema>;

export const createInterviewPayloadSchema = interviewFormSchema.extend({
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        type: z.string().min(1),
      })
    )
    .min(1, "Questions could not be generated. Please try again."),
  interview_link: z.string().trim().min(1, "Interview link is required"),
});

export type CreateInterviewPayload = z.infer<typeof createInterviewPayloadSchema>;
