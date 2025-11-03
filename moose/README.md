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
Natural language interface to query ClickHouse data.

- **POST** `/chat/api/sendMessage` - Send a natural language question
  - Body: `{ "message": "your question here" }`
  - Response: `{ "response": "answer", "sql": "generated SQL", "data": [...] }`

- **GET** `/chat/api/health` - Health check
  - Response: `{ "status": "ok", "mcp_server": "...", "api_key_configured": true }`

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
