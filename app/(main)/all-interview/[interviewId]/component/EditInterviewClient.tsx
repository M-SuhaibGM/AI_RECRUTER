"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface FormData {
  jobPosition: string;
  duration: string;
  jobDescription: string;
}

interface Props {
  interviewId: string;
  initialData: FormData;
}

export default function EditInterviewClient({ interviewId, initialData }: Props) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialData);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");

  // ✅ Generic, stable handler
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsUpdating(true);
      setError("");

      try {
        const res = await fetch(`/api/interviews/${interviewId}/edit`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || data.error || "Update failed");
        }

        toast.success("Interview updated successfully!");
        router.push(`/all-interview/${interviewId}`);
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error(message);
      } finally {
        setIsUpdating(false);
      }
    },
    [formData, interviewId, router]
  );

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white border rounded-xl shadow-md mt-10">
      <div className="flex items-center gap-4 border-b pb-4 mb-6">
        <Link
          href={`/all-interview/${interviewId}`}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Back to interview details"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-bold text-2xl text-gray-800">Edit Interview Setup</h1>
          <p className="text-sm text-gray-500">
            Modify properties for this dynamic template
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
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
            placeholder="e.g. Full Stack Developer"
          />
        </div>

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
            placeholder="e.g. 20 Mins"
          />
        </div>

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

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isUpdating} className="flex gap-2 items-center">
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