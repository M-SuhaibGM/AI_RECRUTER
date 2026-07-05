import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ─── Type Definitions ───
interface InviteRequest {
  email: string;
  interviewLink: string;
  jobPosition: string;
  candidateName?: string;
  companyName?: string;
  duration?: string;
  expiryDate?: string;
  customMessage?: string;
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

// ─── Email Templates ───
function generateInviteEmail(data: {
  interviewLink: string;
  jobPosition: string;
  candidateName?: string;
  companyName?: string;
  duration?: string;
  expiryDate?: string;
}): string {
  const greeting = data.candidateName 
    ? `Dear ${data.candidateName},` 
    : "Hello,";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">
            Interview Invitation
          </h1>
          <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px;">
            AI-Powered Voice Interview
          </p>
        </div>

        <!-- Body -->
        <div style="padding: 30px;">
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
            ${greeting}
          </p>
          
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 10px;">
            You have been invited to interview for the <strong style="color: #2563eb;">${data.jobPosition}</strong> position${data.companyName ? ` at <strong>${data.companyName}</strong>` : ""}.
          </p>

          ${data.duration ? `
            <p style="color: #64748b; font-size: 14px; margin: 0 0 20px;">
              ⏱️ Estimated duration: <strong>${data.duration} minutes</strong>
            </p>
          ` : ""}

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.interviewLink}" 
               style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); 
                      color: #ffffff; padding: 14px 40px; text-decoration: none; 
                      border-radius: 12px; font-weight: 700; font-size: 16px;
                      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
                      transition: all 0.2s ease;">
              🎙️ Start Interview
            </a>
          </div>

          <!-- Divider -->
          <div style="border-top: 1px solid #e2e8f0; margin: 25px 0;"></div>

          <!-- Instructions -->
          <h3 style="color: #1e293b; font-size: 16px; font-weight: 700; margin: 0 0 15px;">
            📋 Before You Begin:
          </h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; vertical-align: top; width: 30px;">
                <span style="background: #dbeafe; color: #2563eb; width: 24px; height: 24px; 
                             display: inline-flex; align-items: center; justify-content: center; 
                             border-radius: 50%; font-size: 12px; font-weight: 700;">1</span>
              </td>
              <td style="padding: 10px 0; color: #475569; font-size: 14px;">
                <strong>Environment:</strong> Find a quiet, well-lit room with minimal background noise.
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; vertical-align: top;">
                <span style="background: #dbeafe; color: #2563eb; width: 24px; height: 24px; 
                             display: inline-flex; align-items: center; justify-content: center; 
                             border-radius: 50%; font-size: 12px; font-weight: 700;">2</span>
              </td>
              <td style="padding: 10px 0; color: #475569; font-size: 14px;">
                <strong>Hardware:</strong> Test your microphone before starting the interview.
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; vertical-align: top;">
                <span style="background: #dbeafe; color: #2563eb; width: 24px; height: 24px; 
                             display: inline-flex; align-items: center; justify-content: center; 
                             border-radius: 50%; font-size: 12px; font-weight: 700;">3</span>
              </td>
              <td style="padding: 10px 0; color: #475569; font-size: 14px;">
                <strong>Browser:</strong> Use Chrome or Edge for the best experience.
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; vertical-align: top;">
                <span style="background: #dbeafe; color: #2563eb; width: 24px; height: 24px; 
                             display: inline-flex; align-items: center; justify-content: center; 
                             border-radius: 50%; font-size: 12px; font-weight: 700;">4</span>
              </td>
              <td style="padding: 10px 0; color: #475569; font-size: 14px;">
                <strong>Stability:</strong> Do not refresh or close the browser during the interview.
              </td>
            </tr>
          </table>

          ${data.expiryDate ? `
            <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; 
                        padding: 12px 16px; margin-top: 20px;">
              <p style="color: #92400e; font-size: 13px; margin: 0;">
                ⚠️ This interview link expires on <strong>${data.expiryDate}</strong>.
              </p>
            </div>
          ` : ""}

          <!-- Fallback Link -->
          <div style="margin-top: 25px; padding: 15px; background: #f8fafc; border-radius: 8px;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0 0 5px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="font-size: 12px; color: #2563eb; margin: 0; word-break: break-all;">
              ${data.interviewLink}
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">
            This is an automated message from the AI Recruiter System. 
            Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ─── Helper Functions ───
function logEmailEvent(event: string, details: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📧 ${event}:`, JSON.stringify(details, null, 2));
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeString(input: string, maxLength: number = 255): string {
  return input.trim().substring(0, maxLength);
}

// ─── Create Transporter ───
function createTransporter(): nodemailer.Transporter {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error("Email credentials not configured");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

// ─── POST Handler ───
export async function POST(
  req: NextRequest
): Promise<NextResponse<EmailResponse | EmailErrorResponse>> {
  const requestStartTime = Date.now();

  try {
    // 1. Parse request body
    let body: InviteRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { 
      email, 
      interviewLink, 
      jobPosition,
      candidateName,
      companyName,
      duration,
      expiryDate,
      customMessage,
    } = body;

    // 2. Validate required fields
    const validationErrors: string[] = [];

    if (!email) {
      validationErrors.push("Recipient email is required");
    } else if (!isValidEmail(email)) {
      validationErrors.push("Invalid email format");
    }

    if (!interviewLink) {
      validationErrors.push("Interview link is required");
    }

    if (!jobPosition) {
      validationErrors.push("Job position is required");
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: "Validation failed",
          details: validationErrors.join(", "),
        },
        { status: 400 }
      );
    }

    // 3. Sanitize inputs
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedJobPosition = sanitizeString(jobPosition, 200);

    logEmailEvent("Sending interview invitation", {
      to: sanitizedEmail,
      jobPosition: sanitizedJobPosition,
      interviewLink: interviewLink.substring(0, 50) + "...",
    });

    // 4. Create transporter
    const transporter = createTransporter();

    // 5. Generate email HTML
    const htmlContent = generateInviteEmail({
      interviewLink,
      jobPosition: sanitizedJobPosition,
      candidateName: candidateName ? sanitizeString(candidateName, 100) : undefined,
      companyName: companyName ? sanitizeString(companyName, 100) : undefined,
      duration: duration ? sanitizeString(duration, 20) : undefined,
      expiryDate: expiryDate ? sanitizeString(expiryDate, 50) : undefined,
    });

    // 6. Setup email options
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"AI Recruiter" <${process.env.EMAIL_USER}>`,
      to: sanitizedEmail,
      subject: `🎙️ Interview Invitation: ${sanitizedJobPosition}`,
      html: htmlContent,
      // Add reply-to if needed
      replyTo: process.env.EMAIL_USER,
      // Track opens (optional)
      // headers: {
      //   'X-Track-Open': 'true',
      // },
    };

    // 7. Send email
    const info = await transporter.sendMail(mailOptions);

    const processingTime = Date.now() - requestStartTime;

    logEmailEvent("Interview invitation sent successfully", {
      to: sanitizedEmail,
      jobPosition: sanitizedJobPosition,
      messageId: info.messageId,
      processingTimeMs: processingTime,
    });

    // 8. Return success
    return NextResponse.json(
      {
        success: true,
        message: "Interview invitation sent successfully",
        messageId: info.messageId,
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    const processingTime = Date.now() - requestStartTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("Send Invite Error:", {
      message: errorMessage,
      processingTimeMs: processingTime,
    });

    return NextResponse.json(
      {
        error: "Failed to send interview invitation",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}