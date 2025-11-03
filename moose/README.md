# Aircraft Tracking Backend (MooseStack)

Backend application for aircraft tracking using MooseStack for real-time data processing and ClickHouse for storage.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

   Get your API key from: https://console.anthropic.com/settings/keys

3. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Chat API (`/chat/api`)
Natural language interface to query ClickHouse data using Anthropic Claude with MCP integration.

#### **POST** `/chat/api/sendMessage`
Send a natural language question and receive AI-generated response with SQL and data.

**Request:**
```json
{
  "message": "your question here"
}
```

**Response:**
```json
{
  "response": "Combined text response from all iterations",
  "sql": "Last SQL query executed",
  "data": [...],
  "iterations": [
    {
      "text": "Claude's thinking/response for this step",
      "sql": "SQL query executed (if any)",
      "data": [...]  // Query results (if any)
    }
  ]
}
```

**Iterations Feature:**
The chat API uses an agentic loop architecture where Claude can perform multiple reasoning steps:
- Each iteration represents one step in Claude's multi-step reasoning process
- Claude may query the database, analyze results, and refine its understanding
- Up to 5 iterations allowed (configurable)
- Frontend displays each iteration as a separate message bubble
- Provides transparency into Claude's thinking process

**Example Flow:**
1. User asks: "Show me the highest flying aircraft"
2. Iteration 1: Claude says "I'll query the database..." (text only)
3. Iteration 2: Claude executes query and shows results (text + sql + data)
4. Response combines all iteration text

#### **GET** `/chat/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "mcp_server": "http://localhost:4000/tools",
  "api_key_configured": true
}
```

### MCP Server (`/tools`)
Model Context Protocol server exposing ClickHouse query tools for AI assistants.

### Consumption API (`/consumption`)
Standard MooseStack consumption endpoints for data access.

## Development

- `npm run dev` - Start development server
- `npm run build` - Build Docker container

## Architecture

- **MooseStack** - Data engineering framework
- **ClickHouse** - OLAP database for analytics
- **Express.js** - Web framework for custom APIs
- **Anthropic Claude** - AI for natural language understanding
- **MCP** - Model Context Protocol for tool integration
