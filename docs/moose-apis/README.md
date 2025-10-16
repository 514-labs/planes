# Moose APIs

Type-safe ingestion and query endpoints with auto-generated OpenAPI docs.

## Overview

Moose APIs provide:
- **Ingest APIs**: Type-safe data ingestion endpoints
- **Query APIs**: Analytics and data retrieval endpoints
- **OpenAPI Documentation**: Auto-generated API docs
- **Client Libraries**: Type-safe client SDKs
- **Authentication**: Secure API endpoints

## Quick Start

```typescript
import { IngestApi, Api } from "@514labs/moose-lib";

// Ingest API
const postEvent = new IngestApi<Event>("post-event", {
  destination: eventStream
});

// Query API
const getEvents = new Api<Params, Event[]>("get-events", {
  async handler({limit = 10}, {client, sql}) {
    return await client.query.execute(sql`
      SELECT * FROM events LIMIT ${limit}
    `);
  }
});
```

## Core Concepts

- [Ingest APIs](./ingest-apis.md) - Data ingestion endpoints
- [Query APIs](./query-apis.md) - Data retrieval endpoints
- [API Security](./api-security.md) - Authentication and authorization
- [OpenAPI Documentation](./openapi-docs.md) - Auto-generated documentation
- [Client Libraries](./client-libraries.md) - Type-safe SDKs

## API Types

- [REST APIs](./rest-apis.md) - Standard REST endpoints
- [GraphQL APIs](./graphql-apis.md) - GraphQL endpoints
- [WebSocket APIs](./websocket-apis.md) - Real-time APIs
- [Batch APIs](./batch-apis.md) - Bulk operations

## Examples

- [Basic Ingest API](./examples/basic-ingest.md)
- [Analytics API](./examples/analytics-api.md)
- [Authentication](./examples/authentication.md)
- [Complex Query](./examples/complex-query.md)

## Advanced Topics

- [API Versioning](./api-versioning.md)
- [Rate Limiting](./rate-limiting.md)
- [Caching](./caching.md)
- [Monitoring](./monitoring.md)

