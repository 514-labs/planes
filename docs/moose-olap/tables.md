# Modeling Tables

Create and manage ClickHouse tables with type-safe schemas.

## Basic Table Creation

### TypeScript

```typescript
import { OlapTable, Key } from "@514labs/moose-lib";

interface Event {
  id: Key<string>;
  timestamp: Date;
  userId: string;
  eventType: string;
  value: number;
}

const eventsTable = new OlapTable<Event>("events");
```

### Python

```python
from moose_lib import OlapTable, Key
from pydantic import BaseModel
from datetime import datetime

class Event(BaseModel):
    id: Key[str]
    timestamp: datetime
    user_id: str
    event_type: str
    value: float

events_table = OlapTable[Event]("events")
```

## Table Configuration

### Engine Selection

```typescript
const eventsTable = new OlapTable<Event>("events", {
  engine: "MergeTree",
  orderBy: ["timestamp", "userId"],
  partitionBy: "toYYYYMM(timestamp)"
});
```

### Primary Key

```typescript
interface User {
  id: Key<string>;        // Primary key
  email: string;
  name: string;
}

const usersTable = new OlapTable<User>("users", {
  primaryKey: "id"
});
```

### Order By

```typescript
const eventsTable = new OlapTable<Event>("events", {
  orderBy: ["timestamp", "userId", "eventType"]
});
```

## Advanced Table Options

### Partitioning

```typescript
const eventsTable = new OlapTable<Event>("events", {
  partitionBy: "toYYYYMM(timestamp)",
  orderBy: ["timestamp", "userId"]
});
```

### TTL (Time To Live)

```typescript
const logsTable = new OlapTable<Log>("logs", {
  ttl: "timestamp + INTERVAL 30 DAY"
});
```

### Compression

```typescript
const dataTable = new OlapTable<Data>("data", {
  compression: "LZ4"
});
```

## Schema Types

### Supported ClickHouse Types

| TypeScript | ClickHouse | Description |
|------------|-------------|-------------|
| `string` | `String` | Variable-length string |
| `number` | `Int32`, `Int64`, `Float64` | Numeric types |
| `boolean` | `UInt8` | Boolean (0/1) |
| `Date` | `Date` | Date only |
| `Date` | `DateTime` | Date and time |
| `Key<T>` | Primary key | Unique identifier |
| `T[]` | `Array(T)` | Array of type T |
| `Record<string, T>` | `Map(String, T)` | Key-value map |

### Complex Types

```typescript
interface ComplexData {
  id: Key<string>;
  tags: string[];
  metadata: Record<string, any>;
  coordinates: [number, number];  // Tuple
  status: "active" | "inactive"; // Enum-like
}
```

## Table Relationships

### Foreign Keys

```typescript
interface User {
  id: Key<string>;
  name: string;
}

interface Event {
  id: Key<string>;
  userId: string;  // References User.id
  timestamp: Date;
}

const usersTable = new OlapTable<User>("users");
const eventsTable = new OlapTable<Event>("events");
```

## Indexing

### Primary Index

```typescript
const eventsTable = new OlapTable<Event>("events", {
  orderBy: ["timestamp", "userId"]  // Primary index
});
```

### Secondary Indexes

```typescript
const eventsTable = new OlapTable<Event>("events", {
  orderBy: ["timestamp", "userId"],
  indexes: [
    { name: "idx_user", columns: ["userId"] },
    { name: "idx_type", columns: ["eventType"] }
  ]
});
```

## Table Lifecycle

### Creation

Tables are automatically created when you run:

```bash
moose dev
```

### Schema Changes

```typescript
// Add a new column
interface Event {
  id: Key<string>;
  timestamp: Date;
  userId: string;
  eventType: string;
  value: number;
  // New column
  source: string;
}
```

MooseStack will automatically generate a migration.

### Dropping Tables

```typescript
// Remove the table export to drop it
// export const eventsTable = new OlapTable<Event>("events");
```

## Performance Optimization

### Column Ordering

Order columns by query frequency:

```typescript
interface Event {
  // Frequently queried columns first
  timestamp: Date;
  userId: string;
  eventType: string;
  
  // Less frequently queried columns last
  metadata: Record<string, any>;
  rawData: string;
}
```

### Partitioning Strategy

```typescript
// Partition by month for time-series data
const eventsTable = new OlapTable<Event>("events", {
  partitionBy: "toYYYYMM(timestamp)"
});

// Partition by user for user-centric queries
const userEventsTable = new OlapTable<Event>("user_events", {
  partitionBy: "userId"
});
```

## Best Practices

1. **Use appropriate data types**
2. **Order columns by query frequency**
3. **Choose good primary keys**
4. **Use partitioning for large tables**
5. **Consider TTL for log data**
6. **Use compression for storage efficiency**

## Next Steps

- [Materialized Views](./materialized-views.md)
- [Migrations](./migrations.md)
- [Data Access](./data-access.md)

