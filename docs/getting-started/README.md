# Getting Started with MooseStack

This section covers everything you need to know to get started with MooseStack.

## Quick Start Options

### 1. 5-Minute Quickstart
Start with a simple demo app to get a feel for MooseStack.

[Go to 5-Minute Quickstart →](./quickstart.md)

### 2. Use with Existing ClickHouse
Works with your current data - zero migration required.

[Go to Existing ClickHouse Setup →](./existing-clickhouse.md)

### 3. Bootstrap with Reference Application
Start with a reference application for integrating MooseStack with complex microservices architectures.

[Go to Reference Applications →](./reference-apps.md)

## Installation

Install MooseStack:

```bash
bash -i <(curl -fsSL https://fiveonefour.com/install.sh) moose
```

## Local Development Environment

Run your entire analytical backend on your laptop with hot reloading:

```bash
moose dev
```

This will start:
- ClickHouse database
- Redpanda streaming platform
- Temporal workflow orchestration
- Redis for state management

## What You'll Build

With MooseStack, you can build:

- **OLAP Databases**: Store and query data with ClickHouse's columnar engine
- **Data Streaming**: Build real-time data pipelines with Kafka/Redpanda
- **ETL Workflows**: Build data processing pipelines with Temporal
- **Query APIs**: Type-safe ingestion and query endpoints
- **Analytics**: Real-time analytical backends

## Next Steps

1. [Try the 5-Minute Quickstart](./quickstart.md)
2. [Learn about Core Concepts](../core-concepts/)
3. [Explore Moose OLAP](../moose-olap/)
4. [Build with Moose Streaming](../moose-streaming/)

