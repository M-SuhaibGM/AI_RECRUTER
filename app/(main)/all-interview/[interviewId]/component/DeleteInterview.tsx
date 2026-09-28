"use client";

import React, { useState, useCallback } from "react";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeleteInterviewActionProps {
  interviewId: string;
  interviewName?: string;
  variant?: "button" | "icon" | "ghost";
  className?: string;
}

export default function DeleteInterviewAction({
  interviewId,
  interviewName = "this interview",
  variant = "button",
  className = "",
}: DeleteInterviewActionProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const canDelete = confirmText === "DELETE" && !isDeleting;

  const handleDelete = useCallback(async () => {
    if (!canDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Delete failed");
      }

      toast.success("Interview deleted");
      setIsOpen(false);
      setConfirmText("");
      router.push("/all-interview");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }, [canDelete, interviewId, router]);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) setConfirmText("");
  }, []);

  const trigger =
    variant === "icon" ? (
      <Button
        variant="ghost"
        size="icon"
        className={`h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 ${className}`}
        aria-label="Delete interview"
      >
        <Trash2 size={18} />
      </Button>
    ) : variant === "ghost" ? (
      <Button
        variant="ghost"
        className={`gap-2 text-red-500 hover:text-red-700 hover:bg-red-50 ${className}`}
      >
        <Trash2 size={16} />
        Delete
      </Button>
    ) : (
      <Button
        variant="destructive"
        className={`gap-2 text-white bg-red-500 hover:bg-red-600 ${className}`}
      >
        <Trash2 size={18} />
        Delete
      </Button>
    );

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>

      <AlertDialogContent className="rounded-[20px] max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">
              Delete Interview
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-slate-500 leading-relaxed">
            This action cannot be undone. Permanently deletes{" "}
            <span className="font-semibold text-slate-700">{interviewName}</span>{" "}
            and all candidate data.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="confirm-delete" className="text-xs text-slate-500">
            Type <span className="font-bold text-red-600">DELETE</span> to confirm
          </Label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE"
            disabled={isDeleting}
            className="text-sm"
          />
        </div>

        <AlertDialogFooter className="gap-3 sm:gap-0 mt-2">
          <AlertDialogCancel
            disabled={isDeleting}
            className="rounded-xl text-sm font-medium border-slate-200 hover:bg-slate-50"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={!canDelete}
            className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium gap-2 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Interview
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}