import { NextResponse, type NextRequest } from "next/server";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// ─── Module-level transporter (created ONCE per server instance) ───
let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error("Email credentials not configured");
  }

  _transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 5000,
    greetingTimeout: 3000,
    socketTimeout: 10000,
  });

  return _transporter;
}

// ─── Types ───
interface InviteRequest {
  email: string;
  interviewLink: string;
  jobPosition: string;
  candidateName?: string;
  companyName?: string;
  duration?: string;
  expiryDate?: string;
}

interface EmailResponse {
  success: boolean;
  message: string;
  messageId?: string;
}

interface EmailErrorResponse {
  error: string;
  details?: string;
}

// ─── Email Template ───
function generateInviteEmail(data: {
  interviewLink: string;
  jobPosition: string;
  candidateName?: string;
  companyName?: string;
  duration?: string;
  expiryDate?: string;
}): string {
  const greeting = data.candidateName ? `Dear ${data.candidateName},` : "Hello,";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:40px 30px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;">Interview Invitation</h1>
      <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px;">AI-Powered Voice Interview</p>
    </div>
    <div style="padding:30px;">
      <p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 20px;">${greeting}</p>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 10px;">
        You have been invited to interview for the <strong style="color:#2563eb;">${data.jobPosition}</strong> position${data.companyName ? ` at <strong>${data.companyName}</strong>` : ""}.
      </p>
      ${data.duration ? `<p style="color:#64748b;font-size:14px;margin:0 0 20px;">⏱️ Estimated duration: <strong>${data.duration} minutes</strong></p>` : ""}
      <div style="text-align:center;margin:30px 0;">
        <a href="${data.interviewLink}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:14px 40px;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;">🎙️ Start Interview</a>
      </div>
      <div style="border-top:1px solid #e2e8f0;margin:25px 0;"></div>
      <h3 style="color:#1e293b;font-size:16px;font-weight:700;margin:0 0 15px;">📋 Before You Begin:</h3>
      <ol style="color:#475569;font-size:14px;line-height:1.8;padding-left:20px;margin:0;">
        <li><strong>Environment:</strong> Find a quiet, well-lit room.</li>
        <li><strong>Hardware:</strong> Test your microphone before starting.</li>
        <li><strong>Browser:</strong> Use Chrome or Edge for the best experience.</li>
        <li><strong>Stability:</strong> Do not refresh or close the browser.</li>
      </ol>
      ${data.expiryDate ? `<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin-top:20px;"><p style="color:#92400e;font-size:13px;margin:0;">⚠️ This link expires on <strong>${data.expiryDate}</strong>.</p></div>` : ""}
      <div style="margin-top:25px;padding:15px;background:#f8fafc;border-radius:8px;">
        <p style="font-size:12px;color:#94a3b8;margin:0 0 5px;">If the button doesn't work, copy this link:</p>
        <p style="font-size:12px;color:#2563eb;margin:0;word-break:break-all;">${data.interviewLink}</p>
      </div>
    </div>
    <div style="background:#f8fafc;padding:20px 30px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:11px;margin:0;">This is an automated message. Please do not reply.</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Helpers ───
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitize(input: string, max = 255): string {
  return input.trim().substring(0, max);
}

// ─── POST Handler ───
export async function POST(
  req: NextRequest
): Promise<NextResponse<EmailResponse | EmailErrorResponse>> {
  try {
    let body: InviteRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { email, interviewLink, jobPosition, candidateName, companyName, duration, expiryDate } = body;

    // Validate
    const errors: string[] = [];
    if (!email || !isValidEmail(email)) errors.push("Invalid email");
    if (!interviewLink) errors.push("Interview link is required");
    if (!jobPosition) errors.push("Job position is required");

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: errors.join(", ") },
        { status: 400 }
      );
    }

    const to = email.toLowerCase().trim();
    const position = sanitize(jobPosition, 200);

    const html = generateInviteEmail({
      interviewLink,
      jobPosition: position,
      candidateName: candidateName ? sanitize(candidateName, 100) : undefined,
      companyName: companyName ? sanitize(companyName, 100) : undefined,
      duration: duration ? sanitize(duration, 20) : undefined,
      expiryDate: expiryDate ? sanitize(expiryDate, 50) : undefined,
    });

    const transporter = getTransporter();

    // ✅ Fire-and-forget: return immediately, send in background
    transporter
      .sendMail({
        from: `"AI Recruiter" <${process.env.EMAIL_USER}>`,
        to,
        subject: `🎙️ Interview Invitation: ${position}`,
        html,
        replyTo: process.env.EMAIL_USER,
      })
      .catch((err) => {
        console.error("[send-invite] Background email failed:", err);
      });

    return NextResponse.json(
      { success: true, message: "Interview invitation sent" },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-invite] Error:", message);

    return NextResponse.json(
      {
        error: "Failed to send interview invitation",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 }
    );
  }
}