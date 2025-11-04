import { createAnthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, UIMessage, stepCountIs, tool } from "ai";
import { z } from "zod";
import { getAISystemPrompt } from "./system-prompt";
import { getAnthropicApiKey, getMcpServerUrl } from "../env-vars";

/**
 * Call the MCP server's query_clickhouse tool
 */
async function callMcpTool(toolName: string, toolInput: any): Promise<any> {
  try {
    const mcpServerUrl = getMcpServerUrl();
    const response = await fetch(`${mcpServerUrl}/tools`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: toolInput,
        },
      }),
    });

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error.message || "MCP tool call failed");
    }

    return result.result;
  } catch (error) {
    console.error(`[Chat] Error calling MCP tool ${toolName}:`, error);
    throw error;
  }
}

/**
 * Create the query_clickhouse tool for AI SDK
 */
const queryClickHouseSchema = z.object({
  query: z.string().describe("SQL query to execute against ClickHouse"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .describe("Maximum number of rows to return (default: 100, max: 100)")
    .optional(),
});

type QueryClickHouseParams = z.infer<typeof queryClickHouseSchema>;

const queryClickHouseTool = tool({
  description:
    "Execute a SQL query against the ClickHouse OLAP database and return results as JSON",
  parameters: queryClickHouseSchema,
  execute: async (params: QueryClickHouseParams) => {
    const { query, limit } = params;
    const finalLimit = limit ?? 100;
    const mcpResult = await callMcpTool("query_clickhouse", { query, limit: finalLimit });

    // Parse the data from MCP response
    // Check for structuredContent first (preferred), then text content
    if (mcpResult.structuredContent) {
      return {
        rows: mcpResult.structuredContent.rows || [],
        rowCount: mcpResult.structuredContent.rows?.length || 0,
      };
    } else if (mcpResult.content?.[0]?.text) {
      const parsedResult = JSON.parse(mcpResult.content[0].text);
      return {
        rows: parsedResult.rows || [],
        rowCount: parsedResult.rows?.length || 0,
      };
    }

    // Fallback: try to parse as JSON directly
    try {
      const parsed = typeof mcpResult === "string" ? JSON.parse(mcpResult) : mcpResult;
      return {
        rows: parsed.rows || [],
        rowCount: parsed.rows?.length || 0,
      };
    } catch {
      return {
        rows: [],
        rowCount: 0,
        error: "Unable to parse MCP response",
      };
    }
  },
} as any);

export async function getAnthropicAgentStreamTextOptions(
  messages: UIMessage[]
): Promise<any> {
  const apiKey = getAnthropicApiKey();

  const anthropic = createAnthropic({
    apiKey: apiKey,
  });

  // Convert UIMessages to ModelMessages for AI SDK v5
  const modelMessages = convertToModelMessages(messages);

  return {
    model: anthropic("claude-3-5-sonnet-20241022"),
    system: getAISystemPrompt(),
    messages: modelMessages,
    tools: {
      query_clickhouse: queryClickHouseTool,
    },
    toolChoice: "auto",
    // Enable multi-step reasoning
    stopWhen: stepCountIs(25),
  };
}

