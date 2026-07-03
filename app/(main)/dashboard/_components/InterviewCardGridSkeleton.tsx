// components/InterviewCardGridSkeleton.tsx
import InterviewCardSkeleton from "./InterviewCardSkeleton";

interface InterviewCardGridSkeletonProps {
  count?: number;
}

export default function InterviewCardGridSkeleton({ count = 6 }: InterviewCardGridSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <InterviewCardSkeleton key={index} />
      ))}
    </>
  );
}