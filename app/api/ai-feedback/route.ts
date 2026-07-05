import { FEEDBACK_PROMPT } from "@/services/Constants";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import Groq from "groq-sdk";

// ─── Type Definitions ───
interface ConversationMessage {
  role: string;
  content: string;
  timestamp?: string;
  [key: string]: any;
}

interface FeedbackRequest {
  conversation: ConversationMessage[] | string;
}

interface GroqError {
  message?: string;
  status?: number;
  code?: string;
  type?: string;
}

interface FeedbackRating {
  technicalSkills: number;
  communication: number;
  problemSolving: number;
  experience: number;
}

interface FeedbackResponse {
  rating?: FeedbackRating;
  summary?: string;
  recommendation?: string;
  recommendationMsg?: string;
  strengths?: string[];
  weaknesses?: string[];
  [key: string]: any;
}

interface ModelConfig {
  name: string;
  maxTokens: number;
  temperature: number;
  retryDelay: number;
}

// ─── Initialize Groq ───
const groqApiKey: string = process.env.GROQ_API_KEY || "";

if (!groqApiKey) {
  console.error("⚠️ GROQ_API_KEY is not set in environment variables");
}

const groq = new Groq({ apiKey: groqApiKey });

// ─── Model Configurations with Fallback Strategy ───
const MODEL_CONFIGS: ModelConfig[] = [
  {
    name: "llama-3.3-70b-versatile",
    maxTokens: 1000,
    temperature: 0.3,
    retryDelay: 0,
  },
  {
    name: "llama-3.1-70b-versatile",
    maxTokens: 1000,
    temperature: 0.3,
    retryDelay: 1000,
  },
  {
    name: "llama-3.1-8b-instant",
    maxTokens: 800,
    temperature: 0.4,
    retryDelay: 2000,
  },
  {
    name: "qwen/qwen3-32b",
    maxTokens: 800,
    temperature: 0.4,
    retryDelay: 3000,
  },
];

// ─── Helper Functions ───
const sleep = (ms: number): Promise<void> => 
  new Promise((resolve) => setTimeout(resolve, ms));

function logFeedbackEvent(event: string, details: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const emoji = event.includes("Success") ? "✅" : event.includes("fail") ? "❌" : "🤖";
  console.log(`[${timestamp}] ${emoji} ${event}:`, JSON.stringify(details, null, 2));
}

function validateFeedbackResponse(parsed: FeedbackResponse): boolean {
  // Check if it has at least a summary or rating
  const hasSummary = typeof parsed.summary === "string" && parsed.summary.length > 0;
  const hasRating = parsed.rating && typeof parsed.rating === "object";
  
  return hasSummary || hasRating;
}

function sanitizeConversation(conversation: any): ConversationMessage[] {
  if (typeof conversation === "string") {
    try {
      return JSON.parse(conversation);
    } catch {
      return [{ role: "user", content: conversation }];
    }
  }
  return Array.isArray(conversation) ? conversation : [];
}

// ─── POST Handler ───
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestStartTime = Date.now();

  try {
    // 1. Parse and validate request
    let body: FeedbackRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    if (!body.conversation) {
      return NextResponse.json(
        { error: "No conversation data provided" },
        { status: 400 }
      );
    }

    // 2. Sanitize conversation data
    const conversation: ConversationMessage[] = sanitizeConversation(body.conversation);

    if (conversation.length === 0) {
      return NextResponse.json(
        { error: "Conversation is empty after sanitization" },
        { status: 400 }
      );
    }

    logFeedbackEvent("Processing feedback request", {
      messageCount: conversation.length,
      totalCharacters: JSON.stringify(conversation).length,
    });

    // 3. Prepare prompt
    const FINAL_PROMPT: string = FEEDBACK_PROMPT.replace(
      "{{conversation}}",
      JSON.stringify(conversation)
    );

    // 4. Try models with fallback
    let lastError: GroqError | null = null;
    let attempts = 0;

    for (const config of MODEL_CONFIGS) {
      attempts++;
      
      try {
        // Apply retry delay if not the first model
        if (config.retryDelay > 0) {
          logFeedbackEvent(`Waiting ${config.retryDelay}ms before trying ${config.name}`, {});
          await sleep(config.retryDelay);
        }

        logFeedbackEvent(`Attempting model [${attempts}/${MODEL_CONFIGS.length}]`, {
          model: config.name,
        });

        const completion = await groq.chat.completions.create({
          model: config.name,
          messages: [{ role: "user", content: FINAL_PROMPT }],
          max_tokens: config.maxTokens,
          temperature: config.temperature,
          response_format: { type: "json_object" },
        });

        const raw: string = completion.choices?.[0]?.message?.content || "";
        
        // Parse response
        let parsed: FeedbackResponse;
        try {
          parsed = JSON.parse(raw) as FeedbackResponse;
        } catch {
          console.warn(`⚠️ Failed to parse JSON from ${config.name}`);
          lastError = { message: "Failed to parse AI response" };
          continue;
        }

        // Validate response structure
        if (!validateFeedbackResponse(parsed)) {
          console.warn(`⚠️ Invalid response structure from ${config.name}`);
          lastError = { message: "Invalid response structure" };
          continue;
        }

        const processingTime = Date.now() - requestStartTime;
        
        logFeedbackEvent(`Success with ${config.name}`, {
          attempts,
          hasRating: !!parsed.rating,
          hasSummary: !!parsed.summary,
          processingTimeMs: processingTime,
        });

        return NextResponse.json(parsed);

      } catch (err: unknown) {
        const error = err as GroqError;
        
        logFeedbackEvent(`Model ${config.name} failed`, {
          error: error?.message,
          status: error?.status,
          code: error?.code,
        });

        lastError = error;

        // Handle specific error types
        if (error?.status === 429 || error?.code === "rate_limit_exceeded") {
          await sleep(5000); // Wait longer for rate limits
        }

        if (error?.status === 401 || error?.status === 403) {
          return NextResponse.json(
            { error: "AI service authentication failed" },
            { status: 502 }
          );
        }

        continue;
      }
    }

    // 5. All models exhausted
    const processingTime = Date.now() - requestStartTime;
    
    logFeedbackEvent("All models exhausted", {
      totalAttempts: attempts,
      processingTimeMs: processingTime,
    });

    return NextResponse.json(
      {
        error: "Feedback generation is currently unavailable. Please try again in a few minutes.",
        retryAfter: 60, // Suggest retry after 60 seconds
      },
      { 
        status: 503,
        headers: {
          'Retry-After': '60',
        },
      }
    );

  } catch (err: unknown) {
    const error = err as Error;
    console.error("[ai-feedback] Fatal error:", error);
    
    return NextResponse.json(
      { 
        error: "An unexpected error occurred while generating feedback",
        requestId: Date.now().toString(36),
      },
      { status: 500 }
    );
  }
}