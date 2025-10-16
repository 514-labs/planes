# Core Concepts

Understanding the fundamental concepts of MooseStack.

## Everything as Code

Declare all infrastructure (ClickHouse tables, Redpanda streams, APIs, etc.) and pipelines in pure TypeScript or Python. Your code auto-wires everything together, so no integration boilerplate needed.

## Data Modeling

Model all of your infrastructure in native TypeScript or Python. Share the same types across all components.

[Learn about Data Modeling →](./data-modeling.md)

## Type Safety

Your data models are shared across:
- Database schemas
- API request/response types
- Stream message formats
- Workflow parameters

## Modular Design

Each MooseStack module is independent and can be used on its own:

- **Moose OLAP**: Database and analytics
- **Moose Streaming**: Real-time data pipelines
- **Moose Workflows**: ETL and orchestration
- **Moose APIs**: REST endpoints

[Explore Modules →](../)

## Local Development

Run your entire analytical backend on your laptop with hot reloading:

```bash
moose dev
```

## Key Benefits

1. **No Boilerplate**: Infrastructure is defined in code
2. **Type Safety**: Compile-time error checking
3. **Hot Reload**: Instant feedback during development
4. **Production Ready**: Same code runs in production
5. **Modular**: Use only what you need

