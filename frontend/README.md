# Aircraft Tracking Dashboard - Frontend

A Next.js-based frontend for visualizing and querying real-time aircraft tracking data. Features an interactive dashboard with charts and an AI-powered chat interface for natural language data queries.

## Features

### Dashboard
- **Real-time Aircraft Data**: Visualizations of aircraft positions, altitudes, speeds, and categories
- **Interactive Charts**: Bar charts, scatter plots, and pie charts using Recharts
- **Data Filtering**: Filter aircraft by category, altitude, and speed ranges
- **Detailed Statistics**: View metrics by aircraft category (A0-A7, D7)

### AI Chat Interface
- **Natural Language Queries**: Ask questions about aircraft data in plain English
- **SQL Transparency**: View generated SQL queries in collapsible sections
- **Data Tables**: Query results displayed in formatted, scrollable tables
- **Multi-Step Reasoning**: See Claude's thinking process across multiple iterations
- **Responsive Input**: Auto-growing textarea with keyboard shortcuts

## Getting Started

### Prerequisites

- Node.js 18+
- Backend server running (see `../moose/README.md`)
- Backend must have `ANTHROPIC_API_KEY` configured for chat feature

### Installation

```bash
npm install
```

### Environment Configuration

Create a `.env.local` file:

```bash
# Base API URL (without path)
NEXT_PUBLIC_API_URL=http://localhost:4000
```

For production deployments, update to your backend URL:
```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Viewing the Dashboard

1. Start the application
2. The main page displays the aircraft tracking dashboard
3. Use filters to narrow down aircraft by category, altitude, or speed
4. View visualizations and detailed statistics

### Using the Chat Feature

1. Click the floating chat button (bottom-right corner with message icon)
2. Type your question in natural language
3. Press `Enter` to send (or `Shift+Enter` for new line)
4. View the AI's response, SQL query, and results

**Example Questions:**
- "How many aircraft are being tracked?"
- "Show me the 5 highest flying aircraft"
- "Which aircraft are on autopilot?"
- "What's the average altitude by aircraft category?"

## Project Structure

```
frontend/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Home page (renders dashboard)
│   │   └── globals.css           # Global styles & Tailwind
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components (don't edit directly)
│   │   ├── aircraft-dashboard.tsx # Main dashboard component
│   │   └── chat-sidebar.tsx      # Chat interface component
│   ├── hooks/
│   │   └── use-mobile.ts         # Mobile detection hook
│   └── lib/
│       └── utils.ts              # Utility functions (cn helper)
├── public/                       # Static assets
├── .env.local                    # Environment variables (not in git)
├── .env.example                  # Environment template
└── package.json
```

## Tech Stack

- **Framework**: Next.js 15.2.4 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (Radix UI + Tailwind)
- **Charts**: Recharts
- **Icons**: Lucide React
- **State Management**: React hooks (useState, useEffect)

## Components

### AircraftDashboard
Main dashboard component displaying:
- Summary statistics
- Interactive charts (bar, scatter, pie)
- Filterable data table
- Floating chat button

### ChatSidebar
AI chat interface featuring:
- Slide-out sidebar (810px wide)
- Message history with user/assistant avatars
- Collapsible SQL query display
- Scrollable data tables
- Loading states with animated ellipsis
- Auto-growing textarea input

## API Integration

The frontend communicates with the backend via two endpoints:

### Dashboard Data
```
GET {NEXT_PUBLIC_API_URL}/consumption/aircraftSpeedAltitudeByType
```
Query params: category, minAltitude, maxAltitude, minSpeed, maxSpeed

### Chat
```
POST {NEXT_PUBLIC_API_URL}/chat/api/sendMessage
Body: { "message": "your question" }
Response: { "response": "...", "sql": "...", "data": [...], "iterations": [...] }
```

## Development Notes

### Adding New UI Components

This project uses shadcn/ui. To add new components:

```bash
npx shadcn@latest add [component-name]
```

Components are installed to `src/components/ui/`. Don't edit these directly.

### Styling

Use the `cn()` utility from `@/lib/utils` to merge Tailwind classes:

```typescript
import { cn } from "@/lib/utils";

<div className={cn("base-classes", conditionalClasses)} />
```

### Environment Variables

Only variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

## Build & Deploy

```bash
# Production build
npm run build

# Start production server
npm start
```

Deploy to Vercel or any Node.js hosting platform.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Recharts](https://recharts.org/)
