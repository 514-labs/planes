# Local Development Environment

MooseStack provides a complete local development environment that runs on your laptop with hot reloading.

## Starting the Development Server

```bash
moose dev
```

This command will:

1. **Start Infrastructure Containers**:
   - ClickHouse database
   - Redpanda streaming platform
   - Temporal workflow orchestration
   - Redis for state management

2. **Validate Services**: Ensure all services are running and accessible

3. **Hot Reload**: Watch for code changes and automatically reload

## Development Server Output

When you run `moose dev`, you'll see output like:

```
⡏ Starting local infrastructure
  Successfully started containers
  Validated clickhousedb-1 docker container
  Validated redpanda-1 docker container
  Successfully validated red panda cluster
  Validated temporal docker container
  Successfully ran local infrastructure
```

## What's Running

### ClickHouse Database
- **Port**: 8123 (HTTP), 9000 (Native)
- **Database**: `default`
- **Access**: Direct connection for queries and schema management

### Redpanda Streaming
- **Port**: 29092 (Kafka API)
- **Admin UI**: http://localhost:9644
- **Topics**: Automatically created based on your Stream definitions

### Temporal Workflows
- **Port**: 7233 (gRPC)
- **Web UI**: http://localhost:8080
- **Workflows**: Your defined workflows are registered and ready

### Redis
- **Port**: 6379
- **Usage**: Internal state management and caching

## Hot Reloading

MooseStack automatically detects changes to your code and:

- **Schema Changes**: Automatically applies table migrations
- **API Changes**: Updates endpoint definitions
- **Stream Changes**: Reconfigures streaming topics
- **Workflow Changes**: Updates workflow definitions

## Development Workflow

1. **Make Changes**: Edit your TypeScript/Python code
2. **Auto Reload**: MooseStack detects changes and reloads
3. **Test APIs**: Use the generated endpoints immediately
4. **Debug**: Use the built-in debugging tools

## Debugging

### ClickHouse Queries
```bash
# Connect to ClickHouse directly
clickhouse-client --host localhost --port 9000
```

### Redpanda Topics
```bash
# List topics
rpk topic list

# Consume from a topic
rpk topic consume my-topic
```

### Temporal Workflows
- Visit http://localhost:8080 for the Temporal Web UI
- View workflow executions and history

## Configuration

### Environment Variables
```bash
# ClickHouse
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123

# Redpanda
REDPANDA_BROKERS=localhost:29092

# Temporal
TEMPORAL_HOST=localhost:7233
```

### Custom Ports
You can customize ports in your `moose.config.toml`:

```toml
[infrastructure]
clickhouse_port = 8123
redpanda_port = 29092
temporal_port = 7233
redis_port = 6379
```

## Troubleshooting

### Port Conflicts
If you get port conflicts, stop conflicting services or change ports in config.

### Container Issues
```bash
# Reset all containers
moose dev --reset

# View container logs
docker logs moose-clickhouse
docker logs moose-redpanda
```

### Database Connection Issues
```bash
# Test ClickHouse connection
curl http://localhost:8123/ping

# Test Redpanda connection
rpk cluster info
```

## Production vs Development

| Feature | Development | Production |
|---------|-------------|------------|
| Database | Local ClickHouse | Managed ClickHouse |
| Streaming | Local Redpanda | Managed Kafka/Redpanda |
| Workflows | Local Temporal | Managed Temporal |
| APIs | Local server | Load balanced |
| Monitoring | Basic logs | Full observability |

## Next Steps

- [Learn about Data Modeling](../core-concepts/data-modeling.md)
- [Explore Moose OLAP](../moose-olap/)
- [Build Streaming Pipelines](../moose-streaming/)

