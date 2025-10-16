# Reference

Complete reference documentation for MooseStack APIs, types, and configuration.

## API Reference

### TypeScript
- [Core Types](./typescript/core-types.md) - Basic types and interfaces
- [OLAP API](./typescript/olap-api.md) - Database operations
- [Streaming API](./typescript/streaming-api.md) - Stream operations
- [Workflow API](./typescript/workflow-api.md) - Workflow operations
- [API Endpoints](./typescript/api-endpoints.md) - REST API operations

### Python
- [Core Types](./python/core-types.md) - Basic types and classes
- [OLAP API](./python/olap-api.md) - Database operations
- [Streaming API](./python/streaming-api.md) - Stream operations
- [Workflow API](./python/workflow-api.md) - Workflow operations
- [API Endpoints](./python/api-endpoints.md) - REST API operations

## Configuration

### Project Configuration
- [moose.config.toml](./configuration/moose-config.md) - Main configuration file
- [Environment Variables](./configuration/environment-variables.md) - Runtime configuration
- [CLI Commands](./configuration/cli-commands.md) - Command-line interface

### Infrastructure Configuration
- [ClickHouse Configuration](./configuration/clickhouse.md) - Database settings
- [Redpanda Configuration](./configuration/redpanda.md) - Streaming settings
- [Temporal Configuration](./configuration/temporal.md) - Workflow settings
- [Redis Configuration](./configuration/redis.md) - Cache settings

## Data Types

### Supported Types
- [Primitive Types](./data-types/primitive-types.md) - Basic data types
- [Complex Types](./data-types/complex-types.md) - Arrays, objects, maps
- [ClickHouse Types](./data-types/clickhouse-types.md) - Database-specific types
- [Type Mapping](./data-types/type-mapping.md) - TypeScript/Python to ClickHouse

### Schema Definition
- [Table Schemas](./data-types/table-schemas.md) - Database table definitions
- [Stream Schemas](./data-types/stream-schemas.md) - Message schemas
- [API Schemas](./data-types/api-schemas.md) - Request/response schemas

## Error Handling

### Error Types
- [Validation Errors](./errors/validation-errors.md) - Data validation errors
- [Database Errors](./errors/database-errors.md) - ClickHouse errors
- [Streaming Errors](./errors/streaming-errors.md) - Redpanda/Kafka errors
- [Workflow Errors](./errors/workflow-errors.md) - Temporal errors

### Error Handling Patterns
- [Retry Logic](./errors/retry-logic.md) - Automatic retry mechanisms
- [Dead Letter Queues](./errors/dead-letter-queues.md) - Failed message handling
- [Circuit Breakers](./errors/circuit-breakers.md) - Fault tolerance patterns

## Performance

### Optimization
- [Query Optimization](./performance/query-optimization.md) - ClickHouse query tuning
- [Stream Performance](./performance/stream-performance.md) - Streaming optimization
- [API Performance](./performance/api-performance.md) - Endpoint optimization
- [Workflow Performance](./performance/workflow-performance.md) - Workflow tuning

### Monitoring
- [Metrics](./performance/metrics.md) - Performance metrics
- [Profiling](./performance/profiling.md) - Performance analysis
- [Alerting](./performance/alerting.md) - Performance alerts

## Troubleshooting

### Common Issues
- [Installation Issues](./troubleshooting/installation.md) - Setup problems
- [Development Issues](./troubleshooting/development.md) - Local development
- [Production Issues](./troubleshooting/production.md) - Production problems
- [Performance Issues](./troubleshooting/performance.md) - Performance problems

### Debugging
- [Logging](./troubleshooting/logging.md) - Debug logging
- [Debugging Tools](./troubleshooting/debugging-tools.md) - Debug utilities
- [Common Solutions](./troubleshooting/common-solutions.md) - Quick fixes

## Migration Guide

### Version Upgrades
- [Upgrading MooseStack](./migration/upgrading.md) - Version upgrades
- [Breaking Changes](./migration/breaking-changes.md) - API changes
- [Migration Scripts](./migration/migration-scripts.md) - Automated migrations

### Platform Migration
- [Local to Cloud](./migration/local-to-cloud.md) - Moving to cloud
- [Cloud to Cloud](./migration/cloud-to-cloud.md) - Cloud platform changes
- [Data Migration](./migration/data-migration.md) - Moving data

