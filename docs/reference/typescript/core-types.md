# TypeScript Core Types

Essential types and interfaces for MooseStack TypeScript development.

## Basic Types

### Key Types

```typescript
import { Key } from "@514labs/moose-lib";

// Primary key type
type UserId = Key<string>;
type EventId = Key<string>;

// Usage in interfaces
interface User {
  id: Key<string>;
  name: string;
  email: string;
}
```

### Data Model Types

```typescript
interface BaseEntity {
  id: Key<string>;
  createdAt: Date;
  updatedAt: Date;
}

interface User extends BaseEntity {
  name: string;
  email: string;
  isActive: boolean;
}

interface Event extends BaseEntity {
  userId: Key<string>;
  eventType: string;
  data: Record<string, any>;
}
```

## OLAP Types

### Table Types

```typescript
import { OlapTable } from "@514labs/moose-lib";

// Basic table
const usersTable = new OlapTable<User>("users");

// Table with configuration
const eventsTable = new OlapTable<Event>("events", {
  orderBy: ["timestamp", "userId"],
  partitionBy: "toYYYYMM(timestamp)"
});
```

### Materialized View Types

```typescript
import { MaterializedView, sql } from "@514labs/moose-lib";

interface EventSummary {
  eventType: string;
  count: number;
  totalValue: number;
}

const eventSummary = new MaterializedView<EventSummary>({
  selectStatement: sql`
    SELECT 
      eventType,
      count(*) as count,
      sum(value) as totalValue
    FROM ${eventsTable}
    GROUP BY eventType
  `,
  selectTables: [eventsTable],
  tableName: "events",
  materializedViewName: "event_summary"
});
```

## Streaming Types

### Stream Types

```typescript
import { Stream } from "@514labs/moose-lib";

// Basic stream
const eventsStream = new Stream<Event>("events", {
  destination: eventsTable
});

// Stream with configuration
const eventsStream = new Stream<Event>("events", {
  destination: eventsTable,
  partitions: 3,
  replicationFactor: 1
});
```

### Consumer Types

```typescript
// Consumer function type
type ConsumerFunction<T> = (message: T, context: ConsumerContext) => Promise<void>;

// Consumer context
interface ConsumerContext {
  client: ClickHouseClient;
  sql: SQLTemplate;
  metrics: MetricsClient;
}
```

## Workflow Types

### Workflow Types

```typescript
import { Workflow } from "@514labs/moose-lib";

// Workflow task type
type WorkflowTask<T = any, R = any> = (context: WorkflowContext, input?: T) => Promise<R>;

// Workflow context
interface WorkflowContext {
  client: ClickHouseClient;
  sql: SQLTemplate;
  metrics: MetricsClient;
  logger: Logger;
}

// Workflow configuration
interface WorkflowConfig {
  startingTask: WorkflowTask;
  schedule?: string;
  retries?: number;
  timeout?: string;
}
```

## API Types

### Ingest API Types

```typescript
import { IngestApi } from "@514labs/moose-lib";

// Ingest API configuration
interface IngestApiConfig<T> {
  destination: Stream<T>;
  method?: string;
  path?: string;
  validation?: ValidationConfig;
  rateLimit?: RateLimitConfig;
}

// Ingest API
const postEvent = new IngestApi<Event>("post-event", {
  destination: eventsStream
});
```

### Query API Types

```typescript
import { Api } from "@514labs/moose-lib";

// Query API handler type
type QueryHandler<P, R> = (params: P, context: QueryContext) => Promise<R>;

// Query context
interface QueryContext {
  client: ClickHouseClient;
  sql: SQLTemplate;
  metrics: MetricsClient;
}

// Query API
const getEvents = new Api<{limit?: number}, Event[]>("get-events", 
  async ({limit = 10}, {client, sql}) => {
    const result = await client.query.execute(sql`
      SELECT * FROM events LIMIT ${limit}
    `);
    return await result.json();
  }
);
```

## Configuration Types

### Database Configuration

```typescript
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username?: string;
  password?: string;
  ssl?: boolean;
}
```

### Stream Configuration

```typescript
interface StreamConfig {
  partitions: number;
  replicationFactor: number;
  retention?: string;
  compression?: string;
  cleanupPolicy?: string;
}
```

### Workflow Configuration

```typescript
interface WorkflowConfig {
  startingTask: WorkflowTask;
  schedule?: string;
  retries?: number;
  timeout?: string;
  concurrency?: number;
  maxConcurrency?: number;
}
```

## Error Types

### Validation Errors

```typescript
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### Database Errors

```typescript
class DatabaseError extends Error {
  constructor(
    message: string,
    public query: string,
    public code: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}
```

### Stream Errors

```typescript
class StreamError extends Error {
  constructor(
    message: string,
    public topic: string,
    public partition: number
  ) {
    super(message);
    this.name = 'StreamError';
  }
}
```

## Utility Types

### Generic Types

```typescript
// Optional fields
type Partial<T> = {
  [P in keyof T]?: T[P];
};

// Required fields
type Required<T> = {
  [P in keyof T]-?: T[P];
};

// Pick specific fields
type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Omit specific fields
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
```

### MooseStack Specific Types

```typescript
// Entity with timestamps
type TimestampedEntity<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

// Entity with soft delete
type SoftDeleteEntity<T> = T & {
  deletedAt?: Date;
  isDeleted: boolean;
};

// Paginated result
type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
};
```

## Type Guards

### Runtime Type Checking

```typescript
// Type guard for Event
function isEvent(obj: any): obj is Event {
  return obj && 
    typeof obj.id === 'string' &&
    obj.timestamp instanceof Date &&
    typeof obj.userId === 'string' &&
    typeof obj.eventType === 'string';
}

// Type guard for User
function isUser(obj: any): obj is User {
  return obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.email === 'string';
}
```

### Validation Functions

```typescript
// Validate event data
function validateEvent(data: any): Event {
  if (!isEvent(data)) {
    throw new ValidationError('Invalid event data', 'event', data);
  }
  return data;
}

// Validate user data
function validateUser(data: any): User {
  if (!isUser(data)) {
    throw new ValidationError('Invalid user data', 'user', data);
  }
  return data;
}
```

## Best Practices

1. **Use Key<T> for primary keys**
2. **Extend BaseEntity for common fields**
3. **Use type guards for runtime validation**
4. **Define clear interfaces for APIs**
5. **Use generic types for reusability**
6. **Handle errors with specific error types**

