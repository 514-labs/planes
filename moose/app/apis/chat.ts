/**
 * Chat API with Anthropic Claude Integration
 *
 * This API enables natural language queries to ClickHouse data through:
 * - Express.js for HTTP handling
 * - Anthropic Claude API for natural language understanding
 * - MCP Client SDK to connect to existing MCP server at /tools
 * - Tool loop: Claude requests tools → we call MCP server → pass results back to Claude
 * - WebApp class to mount at /chat/api
 *
 * The flow is:
 * 1. User sends natural language question
 * 2. Claude interprets question and requests tool use
 * 3. We call the MCP server's query_clickhouse tool
 * 4. Pass tool results back to Claude
 * 5. Claude generates final response
 * 6. Return response with SQL and data to user
 */

import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { WebApp } from "@514labs/moose-lib";

// Create Express application
const app = express();
app.use(cors());
app.use(express.json());

// System prompt that describes the ClickHouse schema
const SYSTEM_PROMPT = `You are a helpful data analyst assistant that helps users query aircraft tracking data stored in ClickHouse.

Available Tables:

1. **AircraftTrackingDataTable** (Raw Data) - 1,054 records
   Key columns:
   - hex (String): Aircraft identifier
   - flight (String): Flight number
   - transponder_type (String): Type of transponder
   - aircraft_type (Nullable String): Type of aircraft
   - lat, lon (Float64): GPS coordinates
   - alt_baro, alt_geom (Float64): Altitude in feet
   - gs (Float64): Ground speed in knots
   - track (Float64): Track heading in degrees
   - squawk (String): Transponder code
   - emergency (String): Emergency status
   - category (String): Aircraft category
   - timestamp (DateTime UTC): When data was recorded
   - rssi (Float64): Signal strength
   - messages (Float64): Number of messages received

2. **AircraftTrackingProcessedTable** (Enriched Data) - 1,054 records
   All columns from AircraftTrackingDataTable PLUS:
   - zorderCoordinate (Float64): Spatial index coordinate
   - approach (Bool): Aircraft on approach
   - autopilot (Bool): Autopilot engaged
   - althold (Bool): Altitude hold mode
   - lnav (Bool): Lateral navigation mode
   - tcas (Bool): TCAS engaged

When users ask questions:
1. Use the query_clickhouse tool to execute SQL queries
2. Be conversational and explain what you're querying
3. Return clear, concise answers
4. Use the processed table when users ask about autopilot status or navigation modes
5. Limit results to reasonable amounts (e.g., TOP 10)
6. Format numeric values appropriately (e.g., altitudes, speeds)

Example queries:
- "Show me the 10 highest flying aircraft" → SELECT flight, alt_baro FROM AircraftTrackingProcessedTable ORDER BY alt_baro DESC LIMIT 10
- "How many aircraft are on autopilot?" → SELECT COUNT(*) as count FROM AircraftTrackingProcessedTable WHERE autopilot = true
- "Which flights are currently on approach?" → SELECT flight, lat, lon, alt_baro FROM AircraftTrackingProcessedTable WHERE approach = true`;

/**
 * Call the MCP server's query_clickhouse tool
 */
async function callMcpTool(toolName: string, toolInput: any): Promise<any> {
  try {
    const response = await fetch("http://localhost:4000/tools", {
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
 * POST /sendMessage
 *
 * Accepts a user message and returns AI-generated response with SQL and data
 */
app.post("/sendMessage", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message is required and must be a string",
      });
    }

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "ANTHROPIC_API_KEY environment variable not set",
      });
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    console.log(`[Chat] Processing message: "${message}"`);

    // Build messages array for the conversation
    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: message,
      },
    ];

    // Variables to track tool use
    let sql = "";
    let data: any[] = [];
    let finalResponse = "";
    const iterations: Array<{ text: string; sql?: string; data?: any[] }> = [];

    // Agentic loop: Keep calling Claude until it stops requesting tools
    let continueLoop = true;
    let iterationCount = 0;
    const maxIterations = 5; // Prevent infinite loops

    while (continueLoop && iterationCount < maxIterations) {
      iterationCount++;

      // Call Claude
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: messages,
        tools: [
          {
            name: "query_clickhouse",
            description:
              "Execute a SQL query against the ClickHouse OLAP database and return results as JSON",
            input_schema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "SQL query to execute against ClickHouse",
                },
                limit: {
                  type: "number",
                  description:
                    "Maximum number of rows to return (default: 100, max: 100)",
                  minimum: 1,
                  maximum: 100,
                  default: 100,
                },
              },
              required: ["query"],
            },
          },
        ],
      });

      console.log(
        `[Chat] Claude response (iteration ${iterationCount}):`,
        JSON.stringify(response, null, 2)
      );

      // Track this iteration
      let iterationText = "";
      let iterationSql = "";
      let iterationData: any[] = [];

      // Check if Claude is done (stop_reason === "end_turn") or wants to use tools
      if (response.stop_reason === "end_turn") {
        // Extract final text response
        for (const block of response.content) {
          if (block.type === "text") {
            iterationText += block.text;
            finalResponse += block.text;
          }
        }
        if (iterationText.trim()) {
          iterations.push({ text: iterationText });
        }
        continueLoop = false;
      } else if (response.stop_reason === "tool_use") {
        // Claude wants to use tools
        const toolResults: Anthropic.MessageParam = {
          role: "user",
          content: [],
        };

        for (const block of response.content) {
          if (block.type === "text") {
            iterationText += block.text;
            finalResponse += block.text;
          } else if (block.type === "tool_use") {
            const toolName = block.name;
            const toolInput = block.input;

            console.log(
              `[Chat] Claude requesting tool: ${toolName}`,
              toolInput
            );

            // Store the SQL query (both for this iteration and global)
            if (toolName === "query_clickhouse" && (toolInput as any).query) {
              iterationSql = (toolInput as any).query;
              sql = iterationSql;
            }

            // Call our MCP server
            try {
              const mcpResult = await callMcpTool(toolName, toolInput);

              console.log(`[Chat] MCP result:`, JSON.stringify(mcpResult, null, 2));

              // Parse the data from MCP response
              // Check for structuredContent first (preferred), then text content
              if (mcpResult.structuredContent) {
                iterationData = mcpResult.structuredContent.rows || [];
                data = iterationData;
                console.log(`[Chat] Extracted ${data.length} rows from structuredContent`);
              } else if (mcpResult.content?.[0]?.text) {
                const parsedResult = JSON.parse(mcpResult.content[0].text);
                iterationData = parsedResult.rows || [];
                data = iterationData;
                console.log(`[Chat] Extracted ${data.length} rows from text content`);
              }

              // Add tool result to continue conversation
              (toolResults.content as any[]).push({
                type: "tool_result",
                tool_use_id: block.id,
                content: mcpResult.content?.[0]?.text || JSON.stringify(mcpResult),
              });
            } catch (error) {
              console.error(`[Chat] Tool execution error:`, error);
              (toolResults.content as any[]).push({
                type: "tool_result",
                tool_use_id: block.id,
                content: `Error: ${error instanceof Error ? error.message : String(error)}`,
                is_error: true,
              });
            }
          }
        }

        // Save this iteration
        if (iterationText.trim() || iterationSql || iterationData.length > 0) {
          iterations.push({
            text: iterationText,
            sql: iterationSql || undefined,
            data: iterationData.length > 0 ? iterationData : undefined,
          });
        }

        // Add assistant response and tool results to messages
        messages.push({
          role: "assistant",
          content: response.content,
        });
        messages.push(toolResults);
      } else {
        // Unexpected stop reason
        console.log(`[Chat] Unexpected stop_reason: ${response.stop_reason}`);
        continueLoop = false;
      }
    }

    // Return the final response with iterations
    res.json({
      response: finalResponse,
      sql: sql,
      data: data,
      iterations: iterations,
    });
  } catch (error) {
    console.error("[Chat] Error processing message:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: `Failed to process message: ${errorMessage}`,
    });
  }
});

/**
 * GET /health
 *
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mcp_server: "http://localhost:4000/tools",
    api_key_configured: !!process.env.ANTHROPIC_API_KEY,
  });
});

/**
 * Export the WebApp instance
 *
 * This registers the Express app with MooseStack's routing system.
 * The mountPath "/chat/api" means this API will be accessible at:
 * http://localhost:4000/chat/api/sendMessage
 */
export const chatApi = new WebApp("chatApi", app, {
  mountPath: "/chat/api",
  metadata: {
    description:
      "Chat API for natural language queries to ClickHouse via Anthropic Claude + MCP",
  },
});
