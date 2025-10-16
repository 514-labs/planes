# 5-Minute Quickstart

Get up and running with MooseStack in just 5 minutes.

## Prerequisites

- Node.js 18+ or Python 3.8+
- Docker (for local development)

## Installation

Install MooseStack:

```bash
bash -i <(curl -fsSL https://fiveonefour.com/install.sh) moose
```

## Create Your First Project

### TypeScript

```bash
mkdir my-moose-app
cd my-moose-app
moose init --template typescript
```

### Python

```bash
mkdir my-moose-app
cd my-moose-app
moose init --template python
```

## Complete Analytical Backend in 1 File

### TypeScript Example

Create `app/index.ts`:

```typescript
import { Key, OlapTable, Stream, IngestApi, Api } from "@514labs/moose-lib";

interface DataModel {
  primaryKey: Key<string>;
  name: string;
}

// Create a ClickHouse table
export const clickhouseTable = new OlapTable<DataModel>("TableName");

// Create a Redpanda streaming topic
export const redpandaTopic = new Stream<DataModel>("TopicName", {
  destination: clickhouseTable,
});

// Create an ingest API endpoint
export const ingestApi = new IngestApi<DataModel>("post-api-route", {
  destination: redpandaTopic,
});

// Create analytics API endpoint
interface QueryParams {
  limit?: number;
}

export const analyticsApi = new Api<QueryParams, DataModel[]>("get-api-route", 
  async ({limit = 10}: QueryParams, {client, sql}) => {
    const result = await client.query.execute(sql`SELECT * FROM ${clickhouseTable} LIMIT ${limit}`);
    return await result.json();
  }
);
```

### Python Example

Create `app/main.py`:

```python
from moose_lib import Key, OlapTable, Stream, StreamConfig, IngestApi, IngestApiConfig, Api
from pydantic import BaseModel

class DataModel(BaseModel):
    primary_key: Key[str]
    name: str

# Create a ClickHouse table
clickhouse_table = OlapTable[DataModel]("TableName")

# Create a Redpanda streaming topic
redpanda_topic = Stream[DataModel]("TopicName", StreamConfig(
    destination=clickhouse_table,
))

# Create an ingest API endpoint
ingest_api = IngestApi[DataModel]("post-api-route", IngestConfig(
    destination=redpanda_topic,
))

# Create a analytics API endpoint
class QueryParams(BaseModel):
    limit: int = 10

def handler(client, params: QueryParams):
    return client.query.execute("SELECT * FROM {table: Identifier} LIMIT {limit: Int32}", {
        "table": clickhouse_table.name,
        "limit": params.limit,
    })

analytics_api = Api[RequestParams, DataModel]("get-api-route", query_function=handler)
```

## Start Development Server

```bash
moose dev
```

You should see output like:

```
⡏ Starting local infrastructure
  Successfully started containers
  Validated clickhousedb-1 docker container
  Validated redpanda-1 docker container
  Successfully validated red panda cluster
  Validated temporal docker container
  Successfully ran local infrastructure
```

## Test Your APIs

### Ingest Data

```bash
curl -X POST http://localhost:3000/post-api-route \
  -H "Content-Type: application/json" \
  -d '{"primaryKey": "1", "name": "test"}'
```

### Query Data

```bash
curl http://localhost:3000/get-api-route?limit=10
```

## What Just Happened?

1. **Table Creation**: MooseStack automatically created a ClickHouse table based on your `DataModel`
2. **Stream Setup**: A Redpanda topic was created to handle real-time data ingestion
3. **API Generation**: REST endpoints were automatically generated with OpenAPI documentation
4. **Type Safety**: Your TypeScript/Python types are shared across all components

## Next Steps

- [Learn about Data Modeling](../core-concepts/data-modeling.md)
- [Explore Moose OLAP](../moose-olap/)
- [Build Streaming Pipelines](../moose-streaming/)
- [Create Workflows](../moose-workflows/)

