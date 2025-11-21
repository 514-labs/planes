# Aircraft Tracking Backend (MooseStack)

Backend application for aircraft tracking using MooseStack for real-time data processing and ClickHouse for storage.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

## API Endpoints

### MCP Server (`/tools`)

Model Context Protocol server exposing ClickHouse query tools for AI assistants.

### Data API (`/aircraft/api`)

MooseStack `WebApp` endpoints for data access.

## Architecture

- **MooseStack** - Data engineering framework
- **ClickHouse** - OLAP database for analytics
- **Express.js** - Web framework for custom APIs
- **MCP** - Model Context Protocol for tool integration
