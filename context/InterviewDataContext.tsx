import { createContext, Dispatch, SetStateAction } from "react";

// ─── Type Definitions ───
export interface InterviewData {
  jobPosition?: string;
  duration?: string | number;
  interviewLink?: string;
  questions?: any;
  [key: string]: any;
}

export interface InterviewInfo {
  userName: string;
  userEmail: string;
  interviewData: InterviewData;
}

interface InterviewContextType {
  interviewInfo: InterviewInfo | undefined;
  setInterviewInfo: Dispatch<SetStateAction<InterviewInfo | undefined>>;
}

// ─── Create Context ───
export const InterviewDataContext = createContext<InterviewContextType>({
  interviewInfo: undefined,
  setInterviewInfo: () => {},
});