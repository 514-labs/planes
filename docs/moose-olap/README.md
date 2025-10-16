# Moose OLAP

Store and query data with ClickHouse's columnar engine—100x faster than traditional databases for analytics.

## Overview

Moose OLAP provides:
- **Columnar Storage**: Optimized for analytical queries
- **Schema Management**: Version-controlled database schemas
- **Migrations**: Safe schema changes
- **Materialized Views**: Pre-computed aggregations
- **External Tables**: Connect to external data sources

## Quick Start

```typescript
import { OlapTable } from "@514labs/moose-lib";

interface Event {
  id: Key<string>;
  timestamp: Date;
  userId: string;
  eventType: string;
}

const eventsTable = new OlapTable<Event>("events");
```

## Core Concepts

- [Schema](./schema.md) - Database schema management
- [Tables](./tables.md) - Creating and managing tables
- [Materialized Views](./materialized-views.md) - Pre-computed aggregations
- [Views](./views.md) - Virtual tables
- [Migrations](./migrations.md) - Schema versioning
- [Data Access](./data-access.md) - Querying and inserting data

## Examples

- [Basic Table](./examples/basic-table.md)
- [Materialized View](./examples/materialized-view.md)
- [Complex Schema](./examples/complex-schema.md)
- [External Tables](./examples/external-tables.md)

## Performance

- [Schema Optimization](./optimization.md)
- [Query Performance](./query-performance.md)
- [Indexing](./indexing.md)

## Advanced Topics

- [Remote ClickHouse](./remote-clickhouse.md)
- [External Tables](./external-tables.md)
- [Table Versioning](./table-versioning.md)

