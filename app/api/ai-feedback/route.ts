import { FEEDBACK_PROMPT } from "@/services/Constants";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import Groq from "groq-sdk";

// ─── Type Definitions ───
interface ConversationMessage {
  role: string;
  content: string;
  [key: string]: any;
}

interface FeedbackRequest {
  conversation: ConversationMessage[] | string;
}

interface GroqError {
  message?: string;
  status?: number;
  code?: string;
}

// ─── Initialize Groq ───
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

// ─── Updated Model List (removed decommissioned models) ───
const GROQ_MODELS: string[] = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
];

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// ─── POST Handler ───
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { conversation } = await req.json();

    if (!conversation) {
      return NextResponse.json({ error: "No conversation" }, { status: 400 });
    }

    const conversationStr = typeof conversation === "string" 
      ? conversation 
      : JSON.stringify(conversation);

    const FINAL_PROMPT = FEEDBACK_PROMPT.replace("{{conversation}}", conversationStr);

    console.log(`🤖 Processing feedback (${conversationStr.length} chars)`);

    for (const model of GROQ_MODELS) {
      try {
        console.log(`🤖 Trying: ${model}`);

        const completion = await groq.chat.completions.create({
          model,
          messages: [{ role: "user", content: FINAL_PROMPT }],
          max_tokens: 1000,
          temperature: 0.3,
          response_format: { type: "json_object" },
        });

        const raw = completion.choices?.[0]?.message?.content || "";
        
        console.log(`📥 Raw response from ${model} (first 200 chars):`, raw.substring(0, 200));

        // ✅ Try to parse - handle common issues
        let parsed: any;
        try {
          // Remove markdown code blocks if present
          const cleaned = raw
            .replace(/```json\s*/gi, "")
            .replace(/```\s*/g, "")
            .trim();
          parsed = JSON.parse(cleaned);
        } catch (parseErr) {
          console.warn(`⚠️ JSON parse failed for ${model}, raw:`, raw.substring(0, 300));
          continue;
        }

        // ✅ Flexible validation - accept if it has ANY useful data
        const hasData = parsed && typeof parsed === "object" && 
          (parsed.summary || parsed.rating || parsed.recommendation || parsed.feedback);
        
        if (hasData) {
          console.log(`✅ Success with ${model}`);
          return NextResponse.json(parsed);
        }
        
        console.warn(`⚠️ Empty response from ${model}`);

      } catch (err: any) {
        console.warn(`❌ ${model} failed:`, err?.message?.substring(0, 150));
        
        if (err?.status === 429) {
          await sleep(3000);
        }
        continue;
      }
    }

    return NextResponse.json(
      { error: "Feedback unavailable. Try again shortly." },
      { status: 503 }
    );
  } catch (e: any) {
    console.error("Fatal:", e?.message);
    return NextResponse.json(
      { error: "Failed to generate feedback" },
      { status: 500 }
    );
  }
}
