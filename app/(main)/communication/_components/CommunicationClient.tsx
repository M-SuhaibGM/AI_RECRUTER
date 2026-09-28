"use client";

import React, { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Mail,
  Link as LinkIcon,
  SendHorizonal,
  Briefcase,
  Check,
  CircleDot,
} from "lucide-react";

interface Interview {
  id: string;
  jobPosition: string;
  interviewLink: string;
  duration?: string;
}

type DispatchStatus = "draft" | "ready" | "sending" | "sent";

interface Props {
  initialInterviews: Interview[];
}

// ✅ Hoisted constants — not re-created on every render
const HOST_URL = process.env.NEXT_PUBLIC_HOST_URL || "";
const FONT_MONO = "'IBM Plex Mono', monospace";
const FONT_DISPLAY = "'Space Grotesk', sans-serif";

export default function CommunicationClient({ initialInterviews }: Props) {
  const [interviews] = useState<Interview[]>(initialInterviews);
  const [selectedId, setSelectedId] = useState<string>("");
  const [candidateEmail, setCandidateEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [justSent, setJustSent] = useState<boolean>(false);

  // ✅ useMemo — only recompute when selectedId changes
  const selectedInterview = useMemo(
    () => interviews.find((i) => i.id === selectedId),
    [interviews, selectedId]
  );

  const status: DispatchStatus = justSent
    ? "sent"
    : loading
    ? "sending"
    : selectedId && candidateEmail
    ? "ready"
    : "draft";

  // ✅ useCallback — stable handler
  const handleSendEmail = useCallback(async (): Promise<void> => {
    if (!selectedId || !candidateEmail) {
      toast.error("Please fill all fields");
      return;
    }
    if (!selectedInterview) {
      toast.error("Select a valid interview");
      return;
    }

    // ✅ Use canonical host URL, not window.location
    const fullInterviewLink = `${HOST_URL}/interview/${selectedInterview.interviewLink}`;

    setLoading(true);
    setJustSent(false);

    try {
      const res = await fetch("/api/send-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: candidateEmail,
          interviewLink: fullInterviewLink,
          jobPosition: selectedInterview.jobPosition,
        }),
      });

      if (res.ok) {
        toast.success("Invitation sent successfully!");
        setCandidateEmail("");
        setSelectedId("");
        setJustSent(true);
        setTimeout(() => setJustSent(false), 3000);
      } else {
        const errorData = await res.json();
        // ✅ Show real error
        toast.error(errorData.error || "Failed to send");
      }
    } catch (error) {
      console.error("Send invite failed:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedId, candidateEmail, selectedInterview]);

  return (
    <div
      className="h-[90vh] overflow-hidden p-3 sm:p-6 relative communication-bg"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <div className="relative z-10 h-full max-w-7xl mx-auto flex flex-col">
        {/* Header */}
        <div className="mb-5 sm:mb-6 flex items-end justify-between flex-wrap gap-3">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-[11px] font-semibold tracking-[0.14em] uppercase mb-3"
              style={{
                fontFamily: FONT_MONO,
                color: "#3652FF",
                backgroundColor: "#EBEEFF",
                border: "1px solid #D6DCFF",
              }}
            >
              <CircleDot size={12} />
              Dispatch Console
            </div>

            <h1
              className="text-3xl sm:text-4xl font-bold leading-tight"
              style={{ fontFamily: FONT_DISPLAY, color: "#10151F" }}
            >
              Send interview invitations
            </h1>
            <p className="text-sm sm:text-base mt-1" style={{ color: "#5B6270" }}>
              Compose an invite, preview it exactly as the candidate will see it, then send.
            </p>
          </div>

          <StatusRail status={status} />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 flex-1 min-h-0">
          {/* Left: Composer */}
          <div
            className="rounded-2xl p-5 sm:p-6 h-full"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E3E6EC",
              boxShadow: "0 1px 2px rgba(16,21,31,0.04)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: "#10151F" }}
              >
                <Mail size={19} />
              </div>
              <div>
                <h2
                  className="text-lg font-bold"
                  style={{ fontFamily: FONT_DISPLAY, color: "#10151F" }}
                >
                  Compose invite
                </h2>
                <p className="text-xs" style={{ color: "#8A90A0" }}>
                  Fields marked below map directly to the email
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <Field label="ROLE">
                <div className="relative">
                  <Briefcase
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10"
                    style={{ color: "#3652FF" }}
                  />
                  <select
                    className="w-full pl-10 pr-4 py-3 rounded-xl outline-none text-sm appearance-none transition-colors communication-input"
                    style={{
                      border: "1px solid #E3E6EC",
                      backgroundColor: "#FAFBFC",
                      color: "#10151F",
                    }}
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                  >
                    <option value="">Select job position…</option>
                    {interviews.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.jobPosition}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              <Field label="TO:">
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10"
                    style={{ color: "#3652FF" }}
                  />
                  <input
                    type="email"
                    placeholder="candidate@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl outline-none text-sm transition-colors communication-input"
                    style={{
                      border: "1px solid #E3E6EC",
                      backgroundColor: "#FAFBFC",
                      color: "#10151F",
                    }}
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                  />
                </div>
              </Field>

              <button
                onClick={handleSendEmail}
                disabled={loading}
                className="w-full rounded-xl py-3.5 font-semibold text-sm transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: "#10151F", color: "#FFFFFF" }}
              >
                {loading ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <SendHorizonal size={17} />
                )}
                {loading ? "Sending invitation…" : "Send interview invite"}
              </button>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <StatChip
                  value={String(interviews.length)}
                  label="Total interviews"
                  accent="#3652FF"
                />
                <StatChip
                  value={status === "sent" ? "Sent" : "Live"}
                  label="Preview state"
                  accent="#0EA5A0"
                />
              </div>
            </div>
          </div>

          {/* Right: Email Preview */}
          <div
            className="rounded-2xl h-full overflow-hidden flex flex-col"
            style={{ border: "1px solid #E3E6EC", backgroundColor: "#FFFFFF" }}
          >
            <div
              className="flex items-center gap-2 px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid #E3E6EC", backgroundColor: "#FAFBFC" }}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#E3E6EC" }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#E3E6EC" }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#E3E6EC" }} />
              <span
                className="ml-3 text-xs"
                style={{ fontFamily: FONT_MONO, color: "#8A90A0" }}
              >
                preview — candidate inbox
              </span>
            </div>

            <div className="flex-1 p-5 sm:p-6">
              {selectedInterview ? (
                <div>
                  <div
                    className="pb-4 mb-4 space-y-1.5"
                    style={{ borderBottom: "1px solid #E3E6EC" }}
                  >
                    <MetaLine label="TO:" value={candidateEmail || "candidate@example.com"} />
                    <MetaLine
                      label="SUBJECT:"
                      value={`Interview invitation: ${selectedInterview.jobPosition}`}
                      strong
                    />
                  </div>

                  <div className="space-y-4 text-sm" style={{ color: "#2A2F3A" }}>
                    <p>Hello,</p>
                    <p className="leading-relaxed">
                      You&apos;re invited to complete an AI-guided interview for the{" "}
                      <strong style={{ color: "#10151F" }}>
                        {selectedInterview.jobPosition}
                      </strong>{" "}
                      role
                      {selectedInterview.duration
                        ? ` (approx. ${selectedInterview.duration} minutes)`
                        : ""}
                      . Use the link below when you&apos;re ready to begin.
                    </p>

                    <div className="pt-1">
                      <button
                        className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white inline-flex items-center gap-2"
                        style={{ backgroundColor: "#3652FF" }}
                        type="button"
                      >
                        <LinkIcon size={15} />
                        Join interview
                      </button>
                    </div>

                    <div
                      className="rounded-xl p-4 mt-5"
                      style={{ backgroundColor: "#F6F7F9", border: "1px solid #E3E6EC" }}
                    >
                      <p className="text-xs leading-relaxed" style={{ color: "#5B6270" }}>
                        Includes setup instructions, camera/mic checks, and interview
                        guidelines for candidates.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-xs">
                    <div
                      className="w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: "#F6F7F9", border: "1px solid #E3E6EC" }}
                    >
                      <Mail size={24} style={{ color: "#8A90A0" }} />
                    </div>
                    <h3
                      className="font-semibold mb-1"
                      style={{ fontFamily: FONT_DISPLAY, color: "#10151F" }}
                    >
                      No preview yet
                    </h3>
                    <p className="text-sm" style={{ color: "#8A90A0" }}>
                      Select a role on the left to see the invite exactly as the candidate
                      will receive it.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Small presentational pieces ---------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="block text-[11px] font-semibold tracking-[0.12em] mb-2"
        style={{ fontFamily: FONT_MONO, color: "#8A90A0" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function MetaLine({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="text-[11px] shrink-0"
        style={{ fontFamily: FONT_MONO, color: "#8A90A0" }}
      >
        {label}
      </span>
      <span
        className={strong ? "text-base font-bold" : "text-sm"}
        style={{
          fontFamily: strong ? FONT_DISPLAY : "inherit",
          color: "#10151F",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function StatChip({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-xl p-3.5"
      style={{ backgroundColor: "#FAFBFC", border: "1px solid #E3E6EC" }}
    >
      <h3
        className="text-xl font-bold"
        style={{ fontFamily: FONT_DISPLAY, color: accent }}
      >
        {value}
      </h3>
      <p className="text-xs mt-0.5" style={{ color: "#8A90A0" }}>
        {label}
      </p>
    </div>
  );
}

function StatusRail({ status }: { status: DispatchStatus }) {
  const steps: { key: DispatchStatus; label: string }[] = [
    { key: "draft", label: "Draft" },
    { key: "ready", label: "Ready" },
    { key: "sent", label: "Sent" },
  ];
  const order: DispatchStatus[] = ["draft", "ready", "sending", "sent"];
  const currentIndex = order.indexOf(status);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E3E6EC",
        fontFamily: FONT_MONO,
      }}
    >
      {steps.map((step, idx) => {
        const stepOrderIndex = order.indexOf(step.key);
        const isDone =
          currentIndex > stepOrderIndex || (status === "sent" && step.key === "sent");
        const isActive =
          status === step.key || (status === "sending" && step.key === "ready");
        return (
          <React.Fragment key={step.key}>
            {idx > 0 && (
              <span className="w-4 h-px" style={{ backgroundColor: "#E3E6EC" }} />
            )}
            <div className="flex items-center gap-1.5">
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: isDone || isActive ? "#3652FF" : "#F0F1F4",
                }}
              >
                {isDone && step.key === "sent" ? (
                  <Check size={10} color="#fff" />
                ) : (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: isDone || isActive ? "#fff" : "#C4C8D2" }}
                  />
                )}
              </span>
              <span
                className="text-[11px] font-medium"
                style={{ color: isDone || isActive ? "#10151F" : "#B0B4BE" }}
              >
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}