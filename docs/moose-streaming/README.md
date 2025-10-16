# Moose Streaming

Build real-time data pipelines with Kafka/Redpanda streams and transformations in code.

## Overview

Moose Streaming provides:
- **Real-time Data Ingestion**: Stream data from various sources
- **Stream Processing**: Transform and filter data in real-time
- **Dead Letter Queues**: Handle failed messages
- **Schema Registry**: Type-safe message schemas
- **Stream-to-Table Sync**: Automatic data persistence

## Quick Start

```typescript
import { Stream, OlapTable } from "@514labs/moose-lib";

interface Event {
  id: Key<string>;
  timestamp: Date;
  data: string;
}

const eventsTable = new OlapTable<Event>("events");
const eventsStream = new Stream<Event>("events", {
  destination: eventsTable
});
```

## Core Concepts

- [Managing Streams](./managing-streams.md) - Creating and configuring streams
- [Creating Streams](./creating-streams.md) - Stream setup and configuration
- [Syncing to Tables](./syncing-to-tables.md) - Automatic data persistence
- [Dead Letter Queues](./dead-letter-queues.md) - Error handling
- [Functions](./functions.md) - Stream processing functions
- [Schema Registry](./schema-registry.md) - Message schema management

## Stream Processing

- [Consumer Functions](./consumer-functions.md) - Process incoming messages
- [Transformation Functions](./transformation-functions.md) - Transform data
- [Writing to Streams](./writing-to-streams.md) - Produce messages

## Examples

- [Basic Stream](./examples/basic-stream.md)
- [Stream Processing](./examples/stream-processing.md)
- [Error Handling](./examples/error-handling.md)
- [Complex Pipeline](./examples/complex-pipeline.md)

## Advanced Topics

- [Stream Configuration](./stream-configuration.md)
- [Performance Tuning](./performance-tuning.md)
- [Monitoring](./monitoring.md)

