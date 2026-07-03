"use client";

import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// ─── Type Definitions ───
interface FormData {
  jobPosition: string;
  duration: string;
  jobDescription: string;
}

interface InterviewData {
  jobPosition?: string;
  duration?: string;
  jobDescription?: string;
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

interface EditInterviewResponse {
  success: boolean;
  message?: string;
}

// ─── Main Component ───
export default function EditInterviewPage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const interviewId: string | string[] | undefined = params?.interviewId;

  const [formData, setFormData] = useState<FormData>({
    jobPosition: "",
    duration: "",
    jobDescription: "",
  });
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // ─── Fetch current details to populate form fields ───
  useEffect(() => {
    if (!interviewId) return;

    const fetchInterviewDetails = async (): Promise<void> => {
      try {
        setIsFetching(true);
        const response = await axios.get<InterviewData>(
          `/api/interviews/${interviewId}/edit`
        );
        const data: InterviewData = response.data;

        setFormData({
          jobPosition: data.jobPosition || "",
          duration: data.duration || "",
          jobDescription: data.jobDescription || "",
        });
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>;
        console.error("Error loading interview:", error);
        setError(
          error.response?.data?.message || "Failed to load interview details."
        );
      } finally {
        setIsFetching(false);
      }
    };

    fetchInterviewDetails();
  }, [interviewId]);

  // ─── Handle input changes ───
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    setFormData((prev: FormData) => ({ ...prev, [name]: value }));
  };

  // ─── Handle form submission ───
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsUpdating(true);
    setError("");

    try {
      await axios.put<EditInterviewResponse>(
        `/api/interviews/${interviewId}/edit`,
        formData
      );
      toast.success("Interview updated successfully!");
      router.push(`/all-interview/${interviewId}`);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      console.error("Error updating interview:", error);
      setError(
        error.response?.data?.message ||
          "Something went wrong while updating."
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // ─── Loading State ───
  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] flex-col gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-500">Loading details...</p>
      </div>
    );
  }

  // ─── Main Render ───
  return (
    <div className="max-w-3xl mx-auto p-6 bg-white border rounded-xl shadow-md mt-10">
      {/* Header */}
      <div className="flex items-center gap-4 border-b pb-4 mb-6">
        <Link
          href={`/all-interview/${interviewId}`}
          className="p-2 hover:bg-gray-100 rounded-full transition"
          aria-label="Back to interview details"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-bold text-2xl text-gray-800">
            Edit Interview Setup
          </h1>
          <p className="text-sm text-gray-500">
            Modify properties for this dynamic template
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Job Position Field */}
        <div>
          <label
            htmlFor="jobPosition"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Job Position / Role
          </label>
          <Input
            id="jobPosition"
            type="text"
            name="jobPosition"
            value={formData.jobPosition}
            onChange={handleChange}
            required
            placeholder="e.g. Full Stack Developer" className={undefined}          />
        </div>

        {/* Duration Field */}
        <div>
          <label
            htmlFor="duration"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Duration (e.g., 15 Mins)
          </label>
          <Input
            id="duration"
            type="text"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            required
            placeholder="e.g. 20 Mins" className={undefined}          />
        </div>

        {/* Job Description Field */}
        <div>
          <label
            htmlFor="jobDescription"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Job Description
          </label>
          <Textarea
            id="jobDescription"
            name="jobDescription"
            rows={6}
            value={formData.jobDescription}
            onChange={handleChange}
            required
            placeholder="Paste core requirements or summary here..."
            className="resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isUpdating} className={undefined}          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isUpdating}
            className="flex gap-2 items-center"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save size={16} /> Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}