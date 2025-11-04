export function getMcpServerUrl(): string {
  // Server-side: use regular env var
  // Client-side: use NEXT_PUBLIC_ prefixed var
  if (typeof window === "undefined") {
    return process.env.MCP_SERVER_URL || process.env.NEXT_PUBLIC_MCP_SERVER_URL || "http://localhost:4000";
  }
  
  const value = process.env.NEXT_PUBLIC_MCP_SERVER_URL;

  if (!value) {
    // Default to localhost:4000 for development
    return "http://localhost:4000";
  }

  return value;
}

export function getAnthropicApiKey(): string {
  const value = process.env.ANTHROPIC_API_KEY;

  if (!value) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  return value;
}

