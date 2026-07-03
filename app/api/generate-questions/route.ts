import Groq from "groq-sdk";
import { NextResponse } from "next/server";

import { QUESTIONS_PROMPT } from "@/services/Constants";
import { interviewFormSchema } from "@/lib/validations/interview";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
  "qwen/qwen3-32b",
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = interviewFormSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Please provide valid interview details." },
        { status: 400 }
      );
    }

    const { jobPosition, jobDescription, duration, type } = validation.data;
    const FINAL_PROMPT = QUESTIONS_PROMPT.replace("{{jobTitle}}", jobPosition)
      .replace("{{jobDescription}}", jobDescription)
      .replace("{{duration}}", duration)
      .replace("{{type}}", type.join(", "));

    for (const model of GROQ_MODELS) {
      try {
        const completion = await groq.chat.completions.create({
          model,
          messages: [{ role: "user", content: FINAL_PROMPT }],
          max_tokens: 1000,
          temperature: 0.7,
          response_format: { type: "json_object" },
        });

        const raw = completion.choices?.[0]?.message?.content || "";
        const parsed = JSON.parse(raw);
        return NextResponse.json(parsed);
      } catch (err) {
        console.warn(`[generate-questions] ${model} failed`, err);
        if ((err as { status?: number }).status === 429) {
          await sleep(3000);
        }
      }
    }

    return NextResponse.json(
      { error: "Question generation unavailable. Try again shortly." },
      { status: 503 }
    );
  } catch (error) {
    console.error("[generate-questions] Fatal:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate questions" },
      { status: 500 }
    );
  }
}