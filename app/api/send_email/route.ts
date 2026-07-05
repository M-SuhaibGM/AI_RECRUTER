import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import nodemailer from "nodemailer";

// ─── Type Definitions ───
interface EmailRequest {
  email: string;
  message: string;
  company: string;
  subject: string;
}

// ─── POST Handler ───
export async function POST(
  req: NextRequest
): Promise<NextResponse> {
  try {
    // 1. Parse request body
    const { email, message, company, subject }: EmailRequest = await req.json();

    // 2. Validate required fields
    if (!email || !message || !company || !subject) {
      return NextResponse.json(
        { error: "Missing required fields: email, message, company, subject" },
        { status: 400 }
      );
    }

    // 3. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // 4. Create transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 5. Setup email options
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${company}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      text: message,
    };

    // 6. Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log("Email sent:", info.messageId);

    // 7. Return success
    return NextResponse.json(
      { 
        message: "Email sent successfully",
        messageId: info.messageId,
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Nodemailer Error:", errorMessage);

    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}