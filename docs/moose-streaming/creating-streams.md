# Creating Streams

Create and configure Redpanda/Kafka streams for real-time data processing.

## Basic Stream Creation

### TypeScript

```typescript
import { Stream, OlapTable, Key } from "@514labs/moose-lib";

interface Event {
  id: Key<string>;
  timestamp: Date;
  userId: string;
  eventType: string;
  data: Record<string, any>;
}

const eventsTable = new OlapTable<Event>("events");
const eventsStream = new Stream<Event>("events", {
  destination: eventsTable
});
```

### Python

```python
from moose_lib import Stream, OlapTable, Key, StreamConfig
from pydantic import BaseModel
from datetime import datetime
from typing import Dict, Any

class Event(BaseModel):
    id: Key[str]
    timestamp: datetime
    user_id: str
    event_type: str
    data: Dict[str, Any]

events_table = OlapTable[Event]("events")
events_stream = Stream[Event]("events", StreamConfig(
    destination=events_table
))
```

## Stream Configuration

### Basic Configuration

```typescript
const eventsStream = new Stream<Event>("events", {
  destination: eventsTable,
  partitions: 3,
  replicationFactor: 1
});
```

### Advanced Configuration

```typescript
const eventsStream = new Stream<Event>("events", {
  destination: eventsTable,
  partitions: 6,
  replicationFactor: 3,
  retention: "7d",
  compression: "lz4",
  cleanupPolicy: "delete"
});
```

## Stream-to-Table Sync

### Automatic Sync

```typescript
// Messages are automatically written to the table
const eventsStream = new Stream<Event>("events", {
  destination: eventsTable
});
```

### Custom Sync Logic

```typescript
const eventsStream = new Stream<Event>("events", {
  destination: eventsTable,
  syncFunction: async (event, {client, sql}) => {
    // Custom sync logic
    if (event.eventType === 'important') {
      await client.query.execute(sql`
        INSERT INTO ${eventsTable} VALUES (${event.id}, ${event.timestamp}, ${event.userId}, ${event.eventType}, ${event.data})
      `);
    }
  }
});
```

## Stream Processing

### Consumer Functions

```typescript
const eventsStream = new Stream<Event>("events", {
  destination: eventsTable
});

// Add a consumer function
eventsStream.addConsumer(async (event) => {
  console.log(`Processing event: ${event.id}`);
  
  // Custom processing logic
  if (event.eventType === 'purchase') {
    // Send notification
    await sendNotification(event.userId, 'Purchase confirmed');
  }
});
```

### Transformation Functions

```typescript
const eventsStream = new Stream<Event>("events", {
  destination: eventsTable,
  transform: (event) => {
    // Transform the event before storing
    return {
      ...event,
      processedAt: new Date(),
      processedBy: 'stream-processor'
    };
  }
});
```

## Multiple Destinations

### Fan-out Pattern

```typescript
const eventsStream = new Stream<Event>("events");

// Multiple destinations
const eventsTable = new OlapTable<Event>("events");
const analyticsTable = new OlapTable<AnalyticsEvent>("analytics_events");

eventsStream.addDestination(eventsTable);
eventsStream.addDestination(analyticsTable);
```

### Conditional Routing

```typescript
const eventsStream = new Stream<Event>("events", {
  destination: eventsTable,
  routeFunction: (event) => {
    // Route based on event type
    if (event.eventType === 'analytics') {
      return analyticsTable;
    }
    return eventsTable;
  }
});
```

## Error Handling

### Dead Letter Queues

```typescript
const eventsStream = new Stream<Event>("events", {
  destination: eventsTable,
  deadLetterQueue: {
    topic: "events-dlq",
    maxRetries: 3,
    retryDelay: "5m"
  }
});
```

### Error Handling Functions

```typescript
const eventsStream = new Stream<Event>("events", {
  destination: eventsTable,
  errorHandler: async (error, event, context) => {
    console.error(`Failed to process event ${event.id}:`, error);
    
    // Custom error handling
    if (error.message.includes('validation')) {
      // Send to validation DLQ
      await sendToValidationDLQ(event);
    } else {
      // Retry with backoff
      await retryWithBackoff(event, context);
    }
  }
});
```

## Stream Monitoring

### Metrics

```typescript
const eventsStream = new Stream<Event>("events", {
  destination: eventsTable,
  monitoring: {
    enabled: true,
    metrics: ['throughput', 'latency', 'error-rate']
  }
});
```

### Health Checks

```typescript
const eventsStream = new Stream<Event>("events", {
  destination: eventsTable,
  healthCheck: {
    enabled: true,
    interval: "30s",
    timeout: "10s"
  }
});
```

## Schema Evolution

### Versioned Schemas

```typescript
interface EventV1 {
  id: Key<string>;
  timestamp: Date;
  data: string;
}

interface EventV2 {
  id: Key<string>;
  timestamp: Date;
  data: Record<string, any>;
  version: number;
}

// Support both versions
const eventsStream = new Stream<EventV1 | EventV2>("events", {
  destination: eventsTable,
  schemaRegistry: {
    compatibility: "backward"
  }
});
```

## Performance Tuning

### Partitioning Strategy

```typescript
const eventsStream = new Stream<Event>("events", {
  destination: eventsTable,
  partitions: 12,
  partitionFunction: (event) => {
    // Partition by user ID for even distribution
    return event.userId.hashCode() % 12;
  }
});
```

### Batch Processing

```typescript
const eventsStream = new Stream<Event>("events", {
  destination: eventsTable,
  batchSize: 1000,
  batchTimeout: "5s"
});
```

## Best Practices

1. **Choose appropriate partition count**
2. **Use meaningful topic names**
3. **Configure retention policies**
4. **Handle errors gracefully**
5. **Monitor stream health**
6. **Use schema registry for evolution**

## Common Patterns

### Event Sourcing

```typescript
const eventStore = new Stream<DomainEvent>("domain-events", {
  destination: eventStoreTable,
  retention: "forever",
  cleanupPolicy: "compact"
});
```

### CQRS

```typescript
// Command stream
const commandsStream = new Stream<Command>("commands", {
  destination: commandsTable
});

// Query stream
const queriesStream = new Stream<Query>("queries", {
  destination: queriesTable
});
```

### Event Streaming

```typescript
const eventsStream = new Stream<Event>("events", {
  destination: eventsTable,
  transform: (event) => ({
    ...event,
    streamedAt: new Date(),
    streamId: generateStreamId()
  })
});
```

## Next Steps

- [Managing Streams](./managing-streams.md)
- [Functions](./functions.md)
- [Dead Letter Queues](./dead-letter-queues.md)

