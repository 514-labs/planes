import { createAnthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, UIMessage, stepCountIs, tool } from "ai";
import { getAISystemPrompt } from "./system-prompt";
import { getAnthropicApiKey, getMcpServerUrl } from "../env-vars";
import { z } from "zod";

/**
 * MCP Tool Definition from server
 */
interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema: Record<string, any>;
}

/**
 * Call the MCP server's tools/list method to get available tools
 */
async function listMcpTools(): Promise<McpToolDefinition[]> {
  try {
    const mcpServerUrl = getMcpServerUrl();
    const response = await fetch(`${mcpServerUrl}/tools`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
    });

    const result = await response.json();

    if (result.error) {
      console.error("[Chat] Error listing MCP tools:", result.error);
      return [];
    }

    return result.result?.tools || [];
  } catch (error) {
    console.error("[Chat] Error listing MCP tools:", error);
    return [];
  }
}

/**
 * Call the MCP server's tools/call method
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
 * Convert JSON Schema properties to Zod schema object
 */
function jsonSchemaToZod(schema: Record<string, any>): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};
  const properties = schema.properties || {};
  const required = schema.required || [];

  for (const [key, prop] of Object.entries(properties)) {
    const propSchema = prop as any;
    let zodType: z.ZodTypeAny;

    switch (propSchema.type) {
      case "string":
        zodType = z.string().describe(propSchema.description || "");
        break;
      case "number":
      case "integer":
        zodType = z.number().describe(propSchema.description || "");
        if (propSchema.minimum !== undefined) {
          zodType = (zodType as z.ZodNumber).min(propSchema.minimum);
        }
        if (propSchema.maximum !== undefined) {
          zodType = (zodType as z.ZodNumber).max(propSchema.maximum);
        }
        break;
      case "boolean":
        zodType = z.boolean().describe(propSchema.description || "");
        break;
      case "array":
        zodType = z.array(z.any()).describe(propSchema.description || "");
        break;
      case "object":
        zodType = z.object({}).describe(propSchema.description || "");
        break;
      default:
        zodType = z.any().describe(propSchema.description || "");
    }

    // Make optional if not in required array
    if (!required.includes(key)) {
      zodType = zodType.optional();
    }

    shape[key] = zodType;
  }

  return z.object(shape);
}

/**
 * Convert an MCP tool definition to an AI SDK tool
 */
function createAiSdkToolFromMcp(mcpTool: McpToolDefinition) {
  const zodSchema = jsonSchemaToZod(mcpTool.inputSchema);

  // Using type assertion here because TypeScript has trouble inferring dynamic Zod schemas
  return tool({
    description: mcpTool.description || `Execute ${mcpTool.name}`,
    parameters: zodSchema,
    execute: async (params: z.infer<typeof zodSchema>) => {
      const mcpResult = await callMcpTool(mcpTool.name, params);

      // Parse the data from MCP response
      // Check for structuredContent first (preferred), then text content
      if (mcpResult.structuredContent) {
        return mcpResult.structuredContent;
      } else if (mcpResult.content?.[0]?.text) {
        try {
          return JSON.parse(mcpResult.content[0].text);
        } catch {
          return mcpResult.content[0].text;
        }
      }

      // Fallback: return as-is
      return mcpResult;
    },
  } as any);
}

export async function getAnthropicAgentStreamTextOptions(
  messages: UIMessage[]
): Promise<any> {
  const apiKey = getAnthropicApiKey();

  const anthropic = createAnthropic({
    apiKey: apiKey,
  });

  // Convert UIMessages to ModelMessages for AI SDK v5
  const modelMessages = convertToModelMessages(messages);

  // Fetch tools from MCP server dynamically
  const mcpTools = await listMcpTools();
  const tools: Record<string, any> = {};
  
  for (const mcpTool of mcpTools) {
    tools[mcpTool.name] = createAiSdkToolFromMcp(mcpTool);
  }

  return {
    model: anthropic("claude-haiku-4-5"),
    system: getAISystemPrompt(),
    messages: modelMessages,
    tools: tools,
    toolChoice: "auto",
    // Enable multi-step reasoning
    stopWhen: stepCountIs(25),
  };
}

