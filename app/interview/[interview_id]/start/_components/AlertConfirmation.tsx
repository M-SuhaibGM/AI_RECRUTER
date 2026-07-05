import React, { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AlertConfirmationProps {
  children: ReactNode;
  stopInterview: () => void;
}

function AlertConfirmation({ children, stopInterview }: AlertConfirmationProps): React.ReactElement {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent className={undefined}>
        <AlertDialogHeader className={undefined}>
          <AlertDialogTitle className={undefined}>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription className={undefined}>
            This will end the interview session and generate your feedback.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={undefined}>
          <AlertDialogCancel className={undefined}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={stopInterview} className="bg-red-500 hover:bg-red-600">
            End Interview
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AlertConfirmation;