# MooseStack Documentation Navigation

This directory contains a comprehensive local copy of the MooseStack documentation for reference during development.

## Quick Start

1. **New to MooseStack?** → Start with [Getting Started](./getting-started/)
2. **Need examples?** → Check [Examples](./examples/)
3. **Looking for specific features?** → Browse by module below
4. **Need reference?** → Go to [Reference](./reference/)

## Documentation Structure

### 🚀 Getting Started
- [Quick Start Guide](./getting-started/quickstart.md) - 5-minute setup
- [Local Development](./getting-started/local-dev.md) - Development environment
- [Core Concepts](./core-concepts/) - Understanding MooseStack

### 📊 Moose OLAP (Database)
- [Tables](./moose-olap/tables.md) - Creating and managing tables
- [Materialized Views](./moose-olap/materialized-views.md) - Pre-computed aggregations
- [Migrations](./moose-olap/migrations.md) - Schema versioning
- [Data Access](./moose-olap/data-access.md) - Querying and inserting

### 🌊 Moose Streaming
- [Creating Streams](./moose-streaming/creating-streams.md) - Stream setup
- [Stream Processing](./moose-streaming/stream-processing.md) - Data transformations
- [Dead Letter Queues](./moose-streaming/dead-letter-queues.md) - Error handling
- [Functions](./moose-streaming/functions.md) - Stream processing functions

### ⚙️ Moose Workflows
- [Define Workflows](./moose-workflows/define-workflows.md) - Workflow creation
- [Scheduling](./moose-workflows/scheduling.md) - Automated execution
- [Triggers](./moose-workflows/triggers.md) - Event-based workflows
- [Retries and Timeouts](./moose-workflows/retries-timeouts.md) - Error handling

### 🔌 Moose APIs
- [Ingest APIs](./moose-apis/ingest-apis.md) - Data ingestion endpoints
- [Query APIs](./moose-apis/query-apis.md) - Data retrieval endpoints
- [API Security](./moose-apis/api-security.md) - Authentication and authorization
- [OpenAPI Documentation](./moose-apis/openapi-docs.md) - Auto-generated docs

### 🚀 Deployment
- [Docker Compose](./deployment/docker-compose.md) - Simple container deployment
- [Kubernetes](./deployment/kubernetes.md) - Container orchestration
- [AWS ECS](./deployment/aws-ecs.md) - Cloud deployment
- [Offline Deployment](./deployment/offline-deployment.md) - Air-gapped environments

### 📚 Examples
- [TypeScript Examples](./examples/typescript/) - Complete TS examples
- [Python Examples](./examples/python/) - Complete Python examples
- [Industry Examples](./examples/industry/) - Real-world use cases

### 📖 Reference
- [TypeScript API Reference](./reference/typescript/) - Complete TS API docs
- [Python API Reference](./reference/python/) - Complete Python API docs
- [Configuration](./reference/configuration/) - All configuration options
- [Troubleshooting](./reference/troubleshooting/) - Common issues and solutions

## Common Use Cases

### Building Analytics Backend
1. [Data Modeling](./core-concepts/data-modeling.md)
2. [Creating Tables](./moose-olap/tables.md)
3. [Setting up Streams](./moose-streaming/creating-streams.md)
4. [Building APIs](./moose-apis/ingest-apis.md)
5. [Basic Analytics Example](./examples/typescript/basic-analytics.md)

### Real-time Data Processing
1. [Stream Processing](./moose-streaming/stream-processing.md)
2. [Workflow Orchestration](./moose-workflows/define-workflows.md)
3. [Error Handling](./moose-streaming/dead-letter-queues.md)
4. [Real-time Dashboard Example](./examples/typescript/realtime-dashboard.md)

### ETL Pipelines
1. [Workflow Definition](./moose-workflows/define-workflows.md)
2. [Data Transformation](./moose-streaming/stream-processing.md)
3. [Scheduling](./moose-workflows/scheduling.md)
4. [ETL Pipeline Example](./examples/typescript/etl-pipeline.md)

### Production Deployment
1. [Docker Compose Setup](./deployment/docker-compose.md)
2. [Configuration](./reference/configuration/)
3. [Monitoring](./deployment/monitoring-setup.md)
4. [Troubleshooting](./reference/troubleshooting/)

## Key Features Covered

### ✅ Complete Documentation
- **Getting Started**: Quick setup and local development
- **Core Concepts**: Data modeling and type safety
- **Moose OLAP**: Database operations and analytics
- **Moose Streaming**: Real-time data processing
- **Moose Workflows**: ETL and task orchestration
- **Moose APIs**: REST endpoints and authentication
- **Deployment**: Production deployment options
- **Examples**: Complete working examples
- **Reference**: API documentation and troubleshooting

### ✅ Both TypeScript and Python
- Complete examples in both languages
- API reference for both languages
- Best practices for each language
- Type safety and validation patterns

### ✅ Production Ready
- Deployment guides for multiple platforms
- Monitoring and observability
- Security and authentication
- Performance optimization
- Troubleshooting guides

## How to Use This Documentation

1. **Start with Getting Started** if you're new to MooseStack
2. **Use Examples** to see complete working code
3. **Reference sections** for specific API details
4. **Deployment guides** when ready for production
5. **Troubleshooting** when you encounter issues

## Contributing to Documentation

This is a local copy of the official MooseStack documentation. For the most up-to-date information, refer to the official docs at https://docs.fiveonefour.com/moose

---

*This documentation is organized for easy navigation and reference during development. Each section includes practical examples and complete code samples.*

