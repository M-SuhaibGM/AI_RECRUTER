"use client";
import React, { useState, useCallback } from "react";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
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

// ─── Type Definitions ───
interface DeleteInterviewActionProps {
    interviewId: string;
    interviewName?: string;
    onDelete?: () => void;
    variant?: "button" | "icon" | "ghost";
    className?: string;
}

interface ApiErrorResponse {
    message?: string;
    error?: string;
}

// ─── Main Component ───
function DeleteInterviewAction({ 
    interviewId, 
    interviewName = "this interview",
    onDelete,
    variant = "button",
    className = ""
}: DeleteInterviewActionProps): React.ReactElement {
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [confirmText, setConfirmText] = useState<string>("");
    const [requireConfirmation, setRequireConfirmation] = useState<boolean>(true);
    const router = useRouter();

    // ─── Handle Delete ───
    const handleDelete = useCallback(async (): Promise<void> => {
        if (!interviewId) {
            toast.error("Invalid interview ID");
            return;
        }

        // Check if confirmation text matches (if required)
        if (requireConfirmation && confirmText !== "DELETE") {
            toast.error("Please type DELETE to confirm");
            return;
        }

        setIsDeleting(true);
        try {
            await axios.delete(`/api/interviews/${interviewId}`);
            
            toast.success("Interview deleted successfully", {
                description: `"${interviewName}" and all associated data have been removed.`,
                duration: 3000,
            });

            // Close the dialog
            setIsOpen(false);
            
            // Reset confirmation
            setConfirmText("");

            // Callback
            onDelete?.();

            // Redirect to the listing page
            router.push("/all-interview");
            
            // Refresh the server-side data
            router.refresh();
        } catch (error: unknown) {
            const axiosError = error as AxiosError<ApiErrorResponse>;
            console.error("Delete interview error:", axiosError);
            
            toast.error("Failed to delete interview", {
                description: axiosError.response?.data?.message || "Please try again later.",
                duration: 4000,
                action: {
                    label: "Retry",
                    onClick: () => handleDelete(),
                },
            });
        } finally {
            setIsDeleting(false);
        }
    }, [interviewId, interviewName, confirmText, requireConfirmation, onDelete, router]);

    // ─── Reset state when dialog closes ───
    const handleOpenChange = (open: boolean): void => {
        setIsOpen(open);
        if (!open) {
            setConfirmText("");
        }
    };

    // ─── Variant: Icon Only ───
    if (variant === "icon") {
        return (
            <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
                <AlertDialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all ${className}`}
                        aria-label="Delete interview"
                    >
                        <Trash2 size={18} />
                    </Button>
                </AlertDialogTrigger>
                
                <AlertDialogContent className="rounded-[20px] max-w-md">
                    {/* Same dialog content */}
                    <DeleteDialogContent 
                        interviewName={interviewName}
                        isDeleting={isDeleting}
                        confirmText={confirmText}
                        requireConfirmation={requireConfirmation}
                        onConfirmTextChange={setConfirmText}
                        onDelete={handleDelete}
                    />
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    // ─── Variant: Ghost ───
    if (variant === "ghost") {
        return (
            <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
                <AlertDialogTrigger asChild>
                    <Button
                        variant="ghost"
                        className={`gap-2 text-red-500 hover:text-red-700 hover:bg-red-50 transition-all ${className}`}
                        aria-label="Delete interview"
                    >
                        <Trash2 size={16} />
                        Delete
                    </Button>
                </AlertDialogTrigger>
                
                <AlertDialogContent className="rounded-[20px] max-w-md">
                    <DeleteDialogContent 
                        interviewName={interviewName}
                        isDeleting={isDeleting}
                        confirmText={confirmText}
                        requireConfirmation={requireConfirmation}
                        onConfirmTextChange={setConfirmText}
                        onDelete={handleDelete}
                    />
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    // ─── Default: Full Button ───
    return (
        <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="destructive"
                    className={`gap-2 text-white bg-red-500 hover:bg-red-600 transition-all duration-200 shadow-sm hover:shadow-md ${className}`}
                    aria-label="Delete interview"
                >
                    <Trash2 size={18} />
                    Delete
                </Button>
            </AlertDialogTrigger>
            
            <AlertDialogContent className="rounded-[20px] max-w-md">
                <DeleteDialogContent 
                    interviewName={interviewName}
                    isDeleting={isDeleting}
                    confirmText={confirmText}
                    requireConfirmation={requireConfirmation}
                    onConfirmTextChange={setConfirmText}
                    onDelete={handleDelete}
                />
            </AlertDialogContent>
        </AlertDialog>
    );
}

// ─── Dialog Content Component ───
interface DeleteDialogContentProps {
    interviewName: string;
    isDeleting: boolean;
    confirmText: string;
    requireConfirmation: boolean;
    onConfirmTextChange: (value: string) => void;
    onDelete: () => Promise<void>;
}

function DeleteDialogContent({
    interviewName,
    isDeleting,
    confirmText,
    requireConfirmation,
    onConfirmTextChange,
    onDelete
}: DeleteDialogContentProps): React.ReactElement {
    return (
        <>
            <AlertDialogHeader className={undefined}>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-red-100 rounded-full">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <AlertDialogTitle className="text-lg font-bold text-slate-900">
                        Delete Interview
                    </AlertDialogTitle>
                </div>
                <AlertDialogDescription className="text-sm text-slate-500 leading-relaxed">
                    This action cannot be undone. This will permanently delete{" "}
                    <span className="font-semibold text-slate-700">{interviewName}</span>{" "}
                    and all associated candidate data from our servers.
                </AlertDialogDescription>
            </AlertDialogHeader>

            {requireConfirmation && (
                <div className="space-y-2 py-2">
                    <Label htmlFor="confirm-delete" className="text-xs text-slate-500">
                        Type <span className="font-bold text-red-600">DELETE</span> to confirm
                    </Label>
                    <Input
                        id="confirm-delete"
                        value={confirmText}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onConfirmTextChange(e.target.value)}
                        placeholder="Type DELETE"
                        disabled={isDeleting}
                        className="text-sm" type={undefined}                    />
                </div>
            )}
            
            <AlertDialogFooter className="gap-3 sm:gap-0 mt-2">
                <AlertDialogCancel 
                    disabled={isDeleting}
                    className="rounded-xl text-sm font-medium border-slate-200 hover:bg-slate-50 transition-all"
                >
                    Cancel
                </AlertDialogCancel>
                
                <AlertDialogAction
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.preventDefault();
                        onDelete();
                    }}
                    disabled={isDeleting || (requireConfirmation && confirmText !== "DELETE")}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        </>
    );
}

export default DeleteInterviewAction;