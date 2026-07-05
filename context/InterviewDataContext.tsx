import { createContext } from "react";

interface InterviewData {
  id?: string;
  jobPosition?: string;
  jobDescription?: string;
  duration?: string | number;
  interviewLink?: string;
  questions?: any;
  candidates?: any[];
}

export const InterviewDataContext = createContext<InterviewData | null>(null);