# Basic Analytics Backend

A complete analytics backend with data ingestion, storage, and querying.

## Overview

This example demonstrates:
- Creating a ClickHouse table
- Setting up a Redpanda stream
- Building ingest and query APIs
- Real-time data processing

## Complete Implementation

```typescript
import { Key, OlapTable, Stream, IngestApi, Api, sql } from "@514labs/moose-lib";

// Data model
interface Event {
  id: Key<string>;
  timestamp: Date;
  userId: string;
  eventType: string;
  value: number;
  metadata: Record<string, any>;
}

// Create ClickHouse table
export const eventsTable = new OlapTable<Event>("events", {
  orderBy: ["timestamp", "userId"],
  partitionBy: "toYYYYMM(timestamp)"
});

// Create Redpanda stream
export const eventsStream = new Stream<Event>("events", {
  destination: eventsTable,
  partitions: 3
});

// Ingest API
export const postEvent = new IngestApi<Event>("post-event", {
  destination: eventsStream,
  method: "POST",
  path: "/api/events",
  validation: {
    strict: true
  }
});

// Query APIs
export const getEvents = new Api<{limit?: number}, Event[]>("get-events", 
  async ({limit = 10}, {client, sql}) => {
    const result = await client.query.execute(sql`
      SELECT * FROM ${eventsTable}
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `);
    return await result.json();
  }
);

export const getEventStats = new Api<{}, {total: number, uniqueUsers: number}>("get-event-stats",
  async (_, {client, sql}) => {
    const result = await client.query.execute(sql`
      SELECT 
        count(*) as total,
        count(DISTINCT userId) as uniqueUsers
      FROM ${eventsTable}
    `);
    return await result.json();
  }
);

export const getUserEvents = new Api<{userId: string, limit?: number}, Event[]>("get-user-events",
  async ({userId, limit = 10}, {client, sql}) => {
    const result = await client.query.execute(sql`
      SELECT * FROM ${eventsTable}
      WHERE userId = ${userId}
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `);
    return await result.json();
  }
);
```

## Usage

### Start the development server

```bash
moose dev
```

### Ingest data

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "id": "event-1",
    "timestamp": "2024-01-01T00:00:00Z",
    "userId": "user-123",
    "eventType": "click",
    "value": 1,
    "metadata": {"page": "/home"}
  }'
```

### Query data

```bash
# Get recent events
curl http://localhost:3000/get-events?limit=5

# Get event statistics
curl http://localhost:3000/get-event-stats

# Get user events
curl http://localhost:3000/get-user-events?userId=user-123&limit=10
```

## Features Demonstrated

1. **Type Safety**: All APIs are type-safe with TypeScript
2. **Automatic Schema**: ClickHouse table created from TypeScript interface
3. **Stream Processing**: Real-time data ingestion via Redpanda
4. **REST APIs**: Auto-generated REST endpoints
5. **Query Optimization**: Efficient ClickHouse queries
6. **Data Validation**: Input validation on ingest API

## Next Steps

- [Real-time Dashboard](./realtime-dashboard.md)
- [ETL Pipeline](./etl-pipeline.md)
- [User Analytics](./user-analytics.md)

