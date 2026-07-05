"use client";
import React, { useState, ReactNode } from "react";
import { InterviewDataContext, InterviewInfo } from "@/context/InterviewDataContext";


interface InterviewLayoutProps {
  children: ReactNode;
}

function InterviewLayout({ children }: InterviewLayoutProps): React.ReactElement {
  const [interviewInfo, setInterviewInfo] = useState<InterviewInfo | undefined>();

  return (
    <InterviewDataContext.Provider value={{ interviewInfo, setInterviewInfo }}>
      <div className="bg-secondary overflow-x-hidden">
        {children}
      </div>
    </InterviewDataContext.Provider>
  );
}

export default InterviewLayout;