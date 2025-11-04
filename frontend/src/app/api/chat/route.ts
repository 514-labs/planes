import { NextRequest } from "next/server";
import {
  UIMessage,
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { getAnthropicAgentStreamTextOptions } from "@/lib/ai/agent-config";

interface ChatBody {
  messages: UIMessage[];
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatBody = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          details: "messages must be an array",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const streamTextOptions = await getAnthropicAgentStreamTextOptions(messages);

    let stepStartTime = Date.now();
    let stepCount = 0;

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        stepStartTime = Date.now();

        const result = streamText({
          ...streamTextOptions,
          onStepFinish: async (stepResult) => {
            const stepEndTime = Date.now();
            const stepDuration = stepEndTime - stepStartTime;
            stepCount++;

            if (stepResult.toolCalls && stepResult.toolCalls.length > 0) {
              stepResult.toolCalls.forEach((toolCall) => {
                writer.write({
                  type: "data-tool-timing",
                  data: {
                    toolCallId: toolCall.toolCallId,
                    duration: stepDuration,
                    stepNumber: stepCount,
                    toolName: toolCall.toolName,
                  },
                });
              });
            }

            stepStartTime = Date.now();
          },
        });

        // Merge the AI response stream with our custom data stream
        writer.merge(result.toUIMessageStream());
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}


