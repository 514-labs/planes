This is a [Moose](https://docs.fiveonefour.com/moose) project bootstrapped with [`moose init`](https://docs.fiveonefour.com/moose/reference/moose-cli#init) or [`aurora init`](https://docs.fiveonefour.com/aurora/cli-reference#init)

This project is structured as follows
```
ads-b-frontend/
├── frontend/ # Frontend placeholder in Node
├── moose/ # Backend services
└── README.md # Project documentation
```

## Getting Started

Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/)
* [Node](https://nodejs.org/en)
* [An Anthropic API Key](https://docs.anthropic.com/en/api/getting-started)
* [Cursor](https://www.cursor.com/) or [Claude Desktop](https://claude.ai/download)

1. Install Moose / Aurora: `bash -i <(curl -fsSL https://fiveonefour.com/install.sh) moose,aurora`
2. Create project `aurora init aircraft ads-b-frontend`
3. Install dependencies: `cd aircraft/moose && npm install`
5. Run Moose: `moose dev`
6. In a new terminal, install frontend dependencies `cd aircraft/frontend && npm install`
7. Configure the frontend API URL (optional):
   - Copy the example environment file: `cp .env.example .env.local`
   - Edit `.env.local` and set `NEXT_PUBLIC_API_URL` to your backend URL
   - For local development, the default is `http://localhost:4000`
   - For production deployments, update to your Boreal URL (e.g., `https://514-demos-planes-main-59be4.boreal.cloud`)
8. Run frontend: `npm run dev`

You are ready to go!

You can start editing the app by modifying primitives in the `app` subdirectory. The dev server auto-updates as you edit the file.

This project gets data from http://adsb.lol.

## Chat Feature

This project includes an AI-powered chat interface that allows you to query aircraft tracking data using natural language.

### Setup

The chat feature requires an Anthropic API key:

1. Get your API key from [Anthropic Console](https://console.anthropic.com/settings/keys)
2. Add it to `moose/.env`:
   ```bash
   ANTHROPIC_API_KEY=your_api_key_here
   ```

### Usage

1. Start the backend (moose) and frontend servers (see Getting Started above)
2. Open the dashboard at `http://localhost:3000`
3. Click the floating chat button in the bottom-right corner
4. Ask questions about your aircraft data in natural language

### Example Questions

- "How many aircraft are being tracked?"
- "Show me the 5 highest flying aircraft"
- "Which aircraft are on autopilot?"
- "What flights are currently on approach?"

### Features

- **Natural Language Queries**: Ask questions in plain English
- **SQL Transparency**: View the generated SQL queries
- **Data Visualization**: Results displayed in formatted tables
- **Multi-Step Reasoning**: See Claude's thought process across multiple iterations
- **Auto-Growing Input**: Textarea expands as you type longer questions

### Architecture

The chat feature uses:
- **Frontend**: React-based chat sidebar with shadcn/ui components
- **Backend**: Express API at `/chat/api/sendMessage`
- **AI Model**: Anthropic Claude (claude-sonnet-4-5)
- **MCP Integration**: Model Context Protocol server for ClickHouse queries
- **Database**: ClickHouse for fast analytics

For more technical details, see:
- Backend documentation: `moose/README.md`
- Frontend documentation: `frontend/README.md`

## Learn More

To learn more about Moose, take a look at the following resources:

- [Moose Documentation](https://docs.fiveonefour.com/moose) - learn about Moose.
- [Aurora Documentation](https://docs.fiveonefour.com/aurora) - learn about Aurora, the MCP interface for data engineering.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Boreal

The easiest way to deploy your Moose app is to use the [Boreal](https://www.fiveonefour.com/boreal) from Fiveonefour, the creators of Moose and Aurora.

[Sign up](https://www.boreal.cloud/sign-up).

# Template: ADS-B

This project processes and transforms aircraft tracking data from various sources into a standardized format for analysis and visualization. It is currently only pulling from military aircraft.

It has example workflows, data models and streaming functions. If you want to explore egress primitives, try using [Aurora](https://docs.fiveonefour.com/aurora) to generate them.

This project also has a seed frontend written in Node, to be used when generating frontend applications on top of this.

## License

This template is MIT licenced.

