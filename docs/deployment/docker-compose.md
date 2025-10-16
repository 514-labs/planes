# Docker Compose Deployment

Deploy MooseStack applications using Docker Compose for simple container orchestration.

## Overview

Docker Compose provides a simple way to deploy MooseStack applications with all required services:
- ClickHouse database
- Redpanda streaming
- Temporal workflows
- Redis cache
- Your application

## Basic Deployment

### 1. Build Your Application

```bash
# Build the application
moose build

# This creates a Docker image with your application
```

### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  # ClickHouse Database
  clickhouse:
    image: clickhouse/clickhouse-server:latest
    ports:
      - "8123:8123"
      - "9000:9000"
    environment:
      CLICKHOUSE_DB: default
    volumes:
      - clickhouse_data:/var/lib/clickhouse
    networks:
      - moose-network

  # Redpanda Streaming
  redpanda:
    image: redpandadata/redpanda:latest
    ports:
      - "29092:29092"
      - "9644:9644"
    command:
      - redpanda
      - start
      - --kafka-addr
      - internal://0.0.0.0:9092,external://0.0.0.0:29092
      - --advertise-kafka-addr
      - internal://redpanda:9092,external://localhost:29092
      - --pandaproxy-addr
      - internal://0.0.0.0:8082,external://0.0.0.0:29080
      - --advertise-pandaproxy-addr
      - internal://redpanda:8082,external://localhost:29080
      - --schema-registry-addr
      - internal://0.0.0.0:8081,external://0.0.0.0:29081
      - --rpc-addr
      - redpanda:33145
      - --advertise-rpc-addr
      - redpanda:33145
      - --smp
      - '1'
      - --memory
      - 1G
      - --mode
      - dev-container
    volumes:
      - redpanda_data:/var/lib/redpanda/data
    networks:
      - moose-network

  # Temporal Server
  temporal:
    image: temporalio/auto-setup:latest
    ports:
      - "7233:7233"
      - "8080:8080"
    environment:
      - DB=postgresql
      - DB_PORT=5432
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=temporal
      - POSTGRES_SEEDS=postgresql
      - DYNAMIC_CONFIG_FILE_PATH=config/dynamicconfig/development-sql.yaml
    depends_on:
      - postgresql
    networks:
      - moose-network

  # PostgreSQL for Temporal
  postgresql:
    image: postgres:13
    environment:
      POSTGRES_DB: temporal
      POSTGRES_USER: temporal
      POSTGRES_PASSWORD: temporal
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - moose-network

  # Redis Cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - moose-network

  # Your MooseStack Application
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - CLICKHOUSE_HOST=clickhouse
      - CLICKHOUSE_PORT=8123
      - REDPANDA_BROKERS=redpanda:29092
      - TEMPORAL_HOST=temporal:7233
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - clickhouse
      - redpanda
      - temporal
      - redis
    networks:
      - moose-network

volumes:
  clickhouse_data:
  redpanda_data:
  postgres_data:
  redis_data:

networks:
  moose-network:
    driver: bridge
```

### 3. Deploy

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## Production Configuration

### Environment Variables

```yaml
services:
  app:
    build: .
    environment:
      # Database
      - CLICKHOUSE_HOST=${CLICKHOUSE_HOST:-clickhouse}
      - CLICKHOUSE_PORT=${CLICKHOUSE_PORT:-8123}
      - CLICKHOUSE_USER=${CLICKHOUSE_USER:-default}
      - CLICKHOUSE_PASSWORD=${CLICKHOUSE_PASSWORD:-}
      
      # Streaming
      - REDPANDA_BROKERS=${REDPANDA_BROKERS:-redpanda:29092}
      
      # Workflows
      - TEMPORAL_HOST=${TEMPORAL_HOST:-temporal:7233}
      - TEMPORAL_NAMESPACE=${TEMPORAL_NAMESPACE:-default}
      
      # Cache
      - REDIS_HOST=${REDIS_HOST:-redis}
      - REDIS_PORT=${REDIS_PORT:-6379}
      - REDIS_PASSWORD=${REDIS_PASSWORD:-}
      
      # Application
      - NODE_ENV=${NODE_ENV:-production}
      - PORT=${PORT:-3000}
```

### Resource Limits

```yaml
services:
  app:
    build: .
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
    restart: unless-stopped
```

### Health Checks

```yaml
services:
  app:
    build: .
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Scaling

### Horizontal Scaling

```yaml
services:
  app:
    build: .
    deploy:
      replicas: 3
    environment:
      - INSTANCE_ID=${HOSTNAME}
```

### Load Balancing

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app

  app:
    build: .
    expose:
      - "3000"
```

## Monitoring

### Logging

```yaml
services:
  app:
    build: .
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Metrics

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## Security

### Network Security

```yaml
services:
  app:
    build: .
    networks:
      - moose-internal
    # No external ports exposed

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    networks:
      - moose-internal
      - moose-external
```

### Secrets Management

```yaml
services:
  app:
    build: .
    environment:
      - DATABASE_PASSWORD_FILE=/run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    external: true
```

## Backup and Recovery

### Database Backup

```yaml
services:
  backup:
    image: clickhouse/clickhouse-server:latest
    command: >
      sh -c "
        clickhouse-client --host clickhouse --query 'BACKUP DATABASE default TO Disk('backups', 'backup_$(date +%Y%m%d_%H%M%S)')'
      "
    volumes:
      - ./backups:/var/lib/clickhouse/backups
    depends_on:
      - clickhouse
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure ports are not in use
2. **Memory Issues**: Increase Docker memory limits
3. **Network Issues**: Check network connectivity
4. **Volume Issues**: Ensure volumes are properly mounted

### Debugging

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f app

# Execute commands in container
docker-compose exec app sh

# Check resource usage
docker stats
```

## Best Practices

1. **Use environment variables** for configuration
2. **Set resource limits** to prevent resource exhaustion
3. **Use health checks** for service monitoring
4. **Implement logging** for debugging
5. **Use secrets** for sensitive data
6. **Regular backups** of persistent data

## Next Steps

- [Kubernetes Deployment](./kubernetes.md)
- [AWS ECS Deployment](./aws-ecs.md)
- [Monitoring Setup](./monitoring-setup.md)

