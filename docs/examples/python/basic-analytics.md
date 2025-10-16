# Basic Analytics Backend (Python)

A complete analytics backend with data ingestion, storage, and querying using Python.

## Overview

This example demonstrates:
- Creating a ClickHouse table
- Setting up a Redpanda stream
- Building ingest and query APIs
- Real-time data processing

## Complete Implementation

```python
from moose_lib import Key, OlapTable, Stream, StreamConfig, IngestApi, IngestApiConfig, Api
from pydantic import BaseModel
from datetime import datetime
from typing import Dict, Any, List, Optional

# Data model
class Event(BaseModel):
    id: Key[str]
    timestamp: datetime
    user_id: str
    event_type: str
    value: float
    metadata: Dict[str, Any]

# Create ClickHouse table
events_table = OlapTable[Event]("events")

# Create Redpanda stream
events_stream = Stream[Event]("events", StreamConfig(
    destination=events_table,
    partitions=3
))

# Ingest API
post_event = IngestApi[Event]("post-event", IngestApiConfig(
    destination=events_stream,
    method="POST",
    path="/api/events"
))

# Query APIs
def get_events_handler(client, params: dict):
    limit = params.get('limit', 10)
    return client.query.execute(
        "SELECT * FROM events ORDER BY timestamp DESC LIMIT {limit: Int32}",
        {"limit": limit}
    )

get_events = Api[dict, List[Event]]("get-events", query_function=get_events_handler)

def get_event_stats_handler(client, params: dict):
    return client.query.execute(
        """
        SELECT 
            count(*) as total,
            count(DISTINCT user_id) as unique_users
        FROM events
        """
    )

get_event_stats = Api[dict, dict]("get-event-stats", query_function=get_event_stats_handler)

def get_user_events_handler(client, params: dict):
    user_id = params['user_id']
    limit = params.get('limit', 10)
    return client.query.execute(
        """
        SELECT * FROM events 
        WHERE user_id = {user_id: String}
        ORDER BY timestamp DESC 
        LIMIT {limit: Int32}
        """,
        {"user_id": user_id, "limit": limit}
    )

get_user_events = Api[dict, List[Event]]("get-user-events", query_function=get_user_events_handler)
```

## Usage

### Start the development server

```bash
moose dev
```

### Ingest data

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "id": "event-1",
    "timestamp": "2024-01-01T00:00:00Z",
    "user_id": "user-123",
    "event_type": "click",
    "value": 1.0,
    "metadata": {"page": "/home"}
  }'
```

### Query data

```bash
# Get recent events
curl http://localhost:3000/get-events?limit=5

# Get event statistics
curl http://localhost:3000/get-event-stats

# Get user events
curl http://localhost:3000/get-user-events?user_id=user-123&limit=10
```

## Features Demonstrated

1. **Type Safety**: All APIs are type-safe with Pydantic models
2. **Automatic Schema**: ClickHouse table created from Pydantic model
3. **Stream Processing**: Real-time data ingestion via Redpanda
4. **REST APIs**: Auto-generated REST endpoints
5. **Query Optimization**: Efficient ClickHouse queries
6. **Data Validation**: Input validation on ingest API

## Python-specific Features

### Pydantic Models
```python
class Event(BaseModel):
    id: Key[str]
    timestamp: datetime
    user_id: str
    event_type: str
    value: float
    metadata: Dict[str, Any]
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
```

### Type Hints
```python
from typing import List, Optional, Dict, Any

def get_events_handler(client, params: Dict[str, Any]) -> List[Event]:
    # Implementation
    pass
```

### Error Handling
```python
from pydantic import ValidationError

def validate_event(event_data: dict) -> Event:
    try:
        return Event(**event_data)
    except ValidationError as e:
        raise ValueError(f"Invalid event data: {e}")
```

## Next Steps

- [Real-time Dashboard](./realtime-dashboard.md)
- [ETL Pipeline](./etl-pipeline.md)
- [User Analytics](./user-analytics.md)

