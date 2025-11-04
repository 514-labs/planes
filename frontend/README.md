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
- **Data Tables**: Query results displayed in formatted in markdown
- **Multi-Step Reasoning**: See Claude's thinking process across multiple iterations

## Getting Started

### Prerequisites

- Node.js 18+
- Backend server running (see `../moose/README.md`)

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

## Tech Stack

- **Framework**: Next.js 15.2.4 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (Radix UI + Tailwind)
- **Charts**: Recharts
- **Icons**: Lucide React
- **AI Chat Interface**: [ai-sdk](https://www.npmjs.com/package/ai-sdk)

## Components

### AircraftDashboard

Main dashboard component displaying:

- Summary statistics
- Interactive charts (bar, scatter, pie)
- Filterable data table
- Floating chat button

### ChatSidebar

AI chat interface featuring:

- Slide-out sidebar
- Collapsible SQL query display

### Dashboard Data

```
GET {NEXT_PUBLIC_API_URL}/aircraft/api/aircraftSpeedAltitudeByType
```

Query params: category, minAltitude, maxAltitude, minSpeed, maxSpeed

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
