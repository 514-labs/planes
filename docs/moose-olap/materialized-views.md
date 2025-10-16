# Modeling Materialized Views

Create pre-computed aggregations and transformations with materialized views.

## Basic Materialized View

### TypeScript

```typescript
import { MaterializedView, OlapTable, sql } from "@514labs/moose-lib";

interface Event {
  id: Key<string>;
  timestamp: Date;
  userId: string;
  eventType: string;
  value: number;
}

interface EventSummary {
  eventType: string;
  count: number;
  totalValue: number;
  lastSeen: Date;
}

const eventsTable = new OlapTable<Event>("events");

const eventSummary = new MaterializedView<EventSummary>({
  selectStatement: sql`
    SELECT 
      eventType,
      count(*) as count,
      sum(value) as totalValue,
      max(timestamp) as lastSeen
    FROM ${eventsTable}
    GROUP BY eventType
  `,
  selectTables: [eventsTable],
  tableName: "events",
  materializedViewName: "event_summary"
});
```

### Python

```python
from moose_lib import MaterializedView, OlapTable
from pydantic import BaseModel
from datetime import datetime

class Event(BaseModel):
    id: Key[str]
    timestamp: datetime
    user_id: str
    event_type: str
    value: float

class EventSummary(BaseModel):
    event_type: str
    count: int
    total_value: float
    last_seen: datetime

events_table = OlapTable[Event]("events")

event_summary = MaterializedView[EventSummary](
    select_statement="""
    SELECT 
        event_type,
        count(*) as count,
        sum(value) as total_value,
        max(timestamp) as last_seen
    FROM events
    GROUP BY event_type
    """,
    select_tables=[events_table],
    table_name="events",
    materialized_view_name="event_summary"
)
```

## Real-time Aggregations

### Time-based Aggregations

```typescript
interface HourlyStats {
  hour: Date;
  eventType: string;
  count: number;
  avgValue: number;
}

const hourlyStats = new MaterializedView<HourlyStats>({
  selectStatement: sql`
    SELECT 
      toStartOfHour(timestamp) as hour,
      eventType,
      count(*) as count,
      avg(value) as avgValue
    FROM ${eventsTable}
    GROUP BY hour, eventType
  `,
  selectTables: [eventsTable],
  tableName: "events",
  materializedViewName: "hourly_stats"
});
```

### User-based Aggregations

```typescript
interface UserStats {
  userId: string;
  totalEvents: number;
  totalValue: number;
  lastActivity: Date;
}

const userStats = new MaterializedView<UserStats>({
  selectStatement: sql`
    SELECT 
      userId,
      count(*) as totalEvents,
      sum(value) as totalValue,
      max(timestamp) as lastActivity
    FROM ${eventsTable}
    GROUP BY userId
  `,
  selectTables: [eventsTable],
  tableName: "events",
  materializedViewName: "user_stats"
});
```

## Advanced Materialized Views

### Window Functions

```typescript
interface EventWithRank {
  id: Key<string>;
  timestamp: Date;
  userId: string;
  eventType: string;
  value: number;
  rank: number;
}

const rankedEvents = new MaterializedView<EventWithRank>({
  selectStatement: sql`
    SELECT 
      id,
      timestamp,
      userId,
      eventType,
      value,
      row_number() OVER (PARTITION BY userId ORDER BY timestamp DESC) as rank
    FROM ${eventsTable}
  `,
  selectTables: [eventsTable],
  tableName: "events",
  materializedViewName: "ranked_events"
});
```

### Complex Joins

```typescript
interface User {
  id: Key<string>;
  name: string;
  email: string;
}

interface UserEventSummary {
  userId: string;
  userName: string;
  totalEvents: number;
  totalValue: number;
}

const usersTable = new OlapTable<User>("users");

const userEventSummary = new MaterializedView<UserEventSummary>({
  selectStatement: sql`
    SELECT 
      e.userId,
      u.name as userName,
      count(*) as totalEvents,
      sum(e.value) as totalValue
    FROM ${eventsTable} e
    JOIN ${usersTable} u ON e.userId = u.id
    GROUP BY e.userId, u.name
  `,
  selectTables: [eventsTable, usersTable],
  tableName: "events",
  materializedViewName: "user_event_summary"
});
```

## Materialized View Configuration

### Engine Options

```typescript
const summary = new MaterializedView<EventSummary>({
  selectStatement: sql`...`,
  selectTables: [eventsTable],
  tableName: "events",
  materializedViewName: "event_summary",
  engine: "SummingMergeTree",
  orderBy: ["eventType"]
});
```

### TTL Configuration

```typescript
const hourlyStats = new MaterializedView<HourlyStats>({
  selectStatement: sql`...`,
  selectTables: [eventsTable],
  tableName: "events",
  materializedViewName: "hourly_stats",
  ttl: "hour + INTERVAL 7 DAY"
});
```

## Performance Considerations

### Indexing

```typescript
const summary = new MaterializedView<EventSummary>({
  selectStatement: sql`...`,
  selectTables: [eventsTable],
  tableName: "events",
  materializedViewName: "event_summary",
  orderBy: ["eventType", "timestamp"]
});
```

### Partitioning

```typescript
const hourlyStats = new MaterializedView<HourlyStats>({
  selectStatement: sql`...`,
  selectTables: [eventsTable],
  tableName: "events",
  materializedViewName: "hourly_stats",
  partitionBy: "toYYYYMM(hour)"
});
```

## Querying Materialized Views

### Direct Queries

```typescript
// Query the materialized view directly
const result = await client.query.execute(sql`
  SELECT * FROM event_summary 
  WHERE eventType = 'purchase'
`);
```

### API Integration

```typescript
export const getEventSummary = new Api<{}, EventSummary[]>("get-event-summary", 
  async (_, {client, sql}) => {
    const result = await client.query.execute(sql`
      SELECT * FROM event_summary
      ORDER BY count DESC
    `);
    return await result.json();
  }
);
```

## Best Practices

1. **Use for expensive aggregations**
2. **Choose appropriate engines**
3. **Consider TTL for time-series data**
4. **Index frequently queried columns**
5. **Monitor refresh performance**
6. **Use partitioning for large views**

## Common Patterns

### Real-time Dashboards
```typescript
// Dashboard metrics
const dashboardStats = new MaterializedView<DashboardStats>({
  selectStatement: sql`
    SELECT 
      count(*) as totalEvents,
      count(DISTINCT userId) as uniqueUsers,
      sum(value) as totalValue,
      avg(value) as avgValue
    FROM ${eventsTable}
    WHERE timestamp >= now() - INTERVAL 1 DAY
  `,
  selectTables: [eventsTable],
  tableName: "events",
  materializedViewName: "dashboard_stats"
});
```

### User Behavior Analysis
```typescript
// User activity patterns
const userActivity = new MaterializedView<UserActivity>({
  selectStatement: sql`
    SELECT 
      userId,
      toDate(timestamp) as date,
      count(*) as events,
      count(DISTINCT eventType) as uniqueEventTypes
    FROM ${eventsTable}
    GROUP BY userId, date
  `,
  selectTables: [eventsTable],
  tableName: "events",
  materializedViewName: "user_activity"
});
```

## Next Steps

- [Views](./views.md)
- [Migrations](./migrations.md)
- [Data Access](./data-access.md)

