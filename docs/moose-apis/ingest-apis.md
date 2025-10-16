# Ingest APIs

Create type-safe data ingestion endpoints that automatically validate and route data to streams.

## Basic Ingest API

### TypeScript

```typescript
import { IngestApi, Stream, Key } from "@514labs/moose-lib";

interface Event {
  id: Key<string>;
  timestamp: Date;
  userId: string;
  eventType: string;
  data: Record<string, any>;
}

const eventStream = new Stream<Event>("events");
const postEvent = new IngestApi<Event>("post-event", {
  destination: eventStream
});
```

### Python

```python
from moose_lib import IngestApi, Stream, Key, IngestApiConfig
from pydantic import BaseModel
from datetime import datetime
from typing import Dict, Any

class Event(BaseModel):
    id: Key[str]
    timestamp: datetime
    user_id: str
    event_type: str
    data: Dict[str, Any]

event_stream = Stream[Event]("events")
post_event = IngestApi[Event]("post-event", IngestApiConfig(
    destination=event_stream
))
```

## API Configuration

### Basic Configuration

```typescript
const postEvent = new IngestApi<Event>("post-event", {
  destination: eventStream,
  method: "POST",
  path: "/api/events"
});
```

### Advanced Configuration

```typescript
const postEvent = new IngestApi<Event>("post-event", {
  destination: eventStream,
  method: "POST",
  path: "/api/v1/events",
  contentType: "application/json",
  validation: {
    strict: true,
    allowUnknown: false
  },
  rateLimit: {
    requests: 1000,
    window: "1m"
  }
});
```

## Request Validation

### Schema Validation

```typescript
interface Event {
  id: Key<string>;
  timestamp: Date;
  userId: string;
  eventType: "click" | "view" | "purchase";
  value?: number;
}

const postEvent = new IngestApi<Event>("post-event", {
  destination: eventStream,
  validation: {
    strict: true,
    allowUnknown: false
  }
});
```

### Custom Validation

```typescript
const postEvent = new IngestApi<Event>("post-event", {
  destination: eventStream,
  validate: async (event, context) => {
    // Custom validation logic
    if (event.eventType === "purchase" && !event.value) {
      throw new Error("Purchase events must include value");
    }
    
    if (event.timestamp > new Date()) {
      throw new Error("Event timestamp cannot be in the future");
    }
    
    return event;
  }
});
```

## Data Transformation

### Pre-processing

```typescript
const postEvent = new IngestApi<Event>("post-event", {
  destination: eventStream,
  transform: (event) => {
    // Add metadata
    return {
      ...event,
      receivedAt: new Date(),
      source: "api",
      version: "1.0"
    };
  }
});
```

### Data Enrichment

```typescript
const postEvent = new IngestApi<Event>("post-event", {
  destination: eventStream,
  enrich: async (event, context) => {
    // Enrich with user data
    const user = await context.client.query.execute(sql`
      SELECT * FROM users WHERE id = ${event.userId}
    `);
    
    return {
      ...event,
      userEmail: user.email,
      userSegment: user.segment
    };
  }
});
```

## Error Handling

### Validation Errors

```typescript
const postEvent = new IngestApi<Event>("post-event", {
  destination: eventStream,
  errorHandler: async (error, request, context) => {
    if (error.name === "ValidationError") {
      return {
        status: 400,
        body: {
          error: "Invalid data",
          details: error.message
        }
      };
    }
    
    return {
      status: 500,
      body: {
        error: "Internal server error"
      }
    };
  }
});
```

### Retry Logic

```typescript
const postEvent = new IngestApi<Event>("post-event", {
  destination: eventStream,
  retry: {
    maxAttempts: 3,
    backoff: "exponential",
    maxDelay: "30s"
  }
});
```

## Authentication

### API Key Authentication

```typescript
const postEvent = new IngestApi<Event>("post-event", {
  destination: eventStream,
  auth: {
    type: "api-key",
    header: "X-API-Key"
  }
});
```

### JWT Authentication

```typescript
const postEvent = new IngestApi<Event>("post-event", {
  destination: eventStream,
  auth: {
    type: "jwt",
    secret: process.env.JWT_SECRET
  }
});
```

### Custom Authentication

```typescript
const postEvent = new IngestApi<Event>("post-event", {
  destination: eventStream,
  auth: async (request, context) => {
    const token = request.headers.authorization;
    
    if (!token) {
      throw new Error("Missing authorization header");
    }
    
    // Validate token
    const user = await validateToken(token);
    return { user };
  }
});
```

## Rate Limiting

### Basic Rate Limiting

```typescript
const postEvent = new IngestApi<Event>("post-event", {
  destination: eventStream,
  rateLimit: {
    requests: 1000,
    window: "1m"
  }
});
```

### Per-User Rate Limiting

```typescript
const postEvent = new IngestApi<Event>("post-event", {
  destination: eventStream,
  rateLimit: {
    requests: 100,
    window: "1m",
    key: (request) => request.userId
  }
});
```

## Monitoring and Metrics

### Request Metrics

```typescript
const postEvent = new IngestApi<Event>("post-event", {
  destination: eventStream,
  metrics: {
    enabled: true,
    tags: ["api", "ingest"]
  }
});
```

### Custom Metrics

```typescript
const postEvent = new IngestApi<Event>("post-event", {
  destination: eventStream,
  middleware: [
    async (request, context, next) => {
      const startTime = Date.now();
      
      try {
        const result = await next();
        
        // Record success metric
        await context.metrics.record('api.success', 1, {
          endpoint: 'post-event'
        });
        
        return result;
      } catch (error) {
        // Record error metric
        await context.metrics.record('api.error', 1, {
          endpoint: 'post-event',
          error: error.name
        });
        
        throw error;
      } finally {
        // Record duration
        const duration = Date.now() - startTime;
        await context.metrics.record('api.duration', duration, {
          endpoint: 'post-event'
        });
      }
    }
  ]
});
```

## Batch Ingestion

### Batch API

```typescript
interface BatchEvent {
  events: Event[];
}

const postBatchEvents = new IngestApi<BatchEvent>("post-batch-events", {
  destination: eventStream,
  transform: (batch) => {
    // Process each event in the batch
    return batch.events.map(event => ({
      ...event,
      batchId: generateBatchId(),
      receivedAt: new Date()
    }));
  }
});
```

### Streaming Response

```typescript
const postStreamEvents = new IngestApi<Event>("post-stream-events", {
  destination: eventStream,
  streaming: true,
  batchSize: 100,
  flushInterval: "5s"
});
```

## Best Practices

1. **Validate input data**
2. **Use appropriate HTTP methods**
3. **Handle errors gracefully**
4. **Implement rate limiting**
5. **Monitor API performance**
6. **Use meaningful error messages**

## Common Patterns

### Event Tracking

```typescript
const trackEvent = new IngestApi<Event>("track-event", {
  destination: eventStream,
  transform: (event) => ({
    ...event,
    sessionId: generateSessionId(),
    userAgent: request.headers['user-agent'],
    ipAddress: request.ip
  })
});
```

### Data Validation

```typescript
const validateAndIngest = new IngestApi<Event>("validate-and-ingest", {
  destination: eventStream,
  validate: async (event, context) => {
    // Check if user exists
    const user = await context.client.query.execute(sql`
      SELECT id FROM users WHERE id = ${event.userId}
    `);
    
    if (!user) {
      throw new Error("User not found");
    }
    
    return event;
  }
});
```

### Data Enrichment

```typescript
const enrichAndIngest = new IngestApi<Event>("enrich-and-ingest", {
  destination: eventStream,
  enrich: async (event, context) => {
    // Get user context
    const user = await context.client.query.execute(sql`
      SELECT segment, preferences FROM users WHERE id = ${event.userId}
    `);
    
    return {
      ...event,
      userSegment: user.segment,
      userPreferences: user.preferences
    };
  }
});
```

## Next Steps

- [Query APIs](./query-apis.md)
- [API Security](./api-security.md)
- [OpenAPI Documentation](./openapi-docs.md)

