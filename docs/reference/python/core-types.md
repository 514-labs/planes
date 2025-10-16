# Python Core Types

Essential types and classes for MooseStack Python development.

## Basic Types

### Key Types

```python
from moose_lib import Key
from typing import TypeVar

# Primary key type
UserId = Key[str]
EventId = Key[str]

# Usage in models
class User(BaseModel):
    id: Key[str]
    name: str
    email: str
```

### Data Model Types

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class BaseEntity(BaseModel):
    id: Key[str]
    created_at: datetime
    updated_at: datetime

class User(BaseEntity):
    name: str
    email: str
    is_active: bool = True

class Event(BaseEntity):
    user_id: Key[str]
    event_type: str
    data: Dict[str, Any]
```

## OLAP Types

### Table Types

```python
from moose_lib import OlapTable

# Basic table
users_table = OlapTable[User]("users")

# Table with configuration
events_table = OlapTable[Event]("events")
```

### Materialized View Types

```python
from moose_lib import MaterializedView

class EventSummary(BaseModel):
    event_type: str
    count: int
    total_value: float

event_summary = MaterializedView[EventSummary](
    select_statement="""
    SELECT 
        event_type,
        count(*) as count,
        sum(value) as total_value
    FROM events
    GROUP BY event_type
    """,
    select_tables=[events_table],
    table_name="events",
    materialized_view_name="event_summary"
)
```

## Streaming Types

### Stream Types

```python
from moose_lib import Stream, StreamConfig

# Basic stream
events_stream = Stream[Event]("events", StreamConfig(
    destination=events_table
))

# Stream with configuration
events_stream = Stream[Event]("events", StreamConfig(
    destination=events_table,
    partitions=3,
    replication_factor=1
))
```

### Consumer Types

```python
from typing import Callable, Dict, Any

# Consumer function type
ConsumerFunction = Callable[[Any, Dict[str, Any]], None]

# Consumer context
class ConsumerContext:
    def __init__(self, client, sql, metrics):
        self.client = client
        self.sql = sql
        self.metrics = metrics
```

## Workflow Types

### Workflow Types

```python
from moose_lib import Workflow
from typing import Callable, Dict, Any

# Workflow task type
WorkflowTask = Callable[[Dict[str, Any], Any], Any]

# Workflow context
class WorkflowContext:
    def __init__(self, client, sql, metrics, logger):
        self.client = client
        self.sql = sql
        self.metrics = metrics
        self.logger = logger

# Workflow configuration
class WorkflowConfig:
    def __init__(self, starting_task, schedule=None, retries=None, timeout=None):
        self.starting_task = starting_task
        self.schedule = schedule
        self.retries = retries
        self.timeout = timeout
```

## API Types

### Ingest API Types

```python
from moose_lib import IngestApi, IngestApiConfig

# Ingest API configuration
class IngestApiConfig:
    def __init__(self, destination, method="POST", path=None, validation=None, rate_limit=None):
        self.destination = destination
        self.method = method
        self.path = path
        self.validation = validation
        self.rate_limit = rate_limit

# Ingest API
post_event = IngestApi[Event]("post-event", IngestApiConfig(
    destination=events_stream
))
```

### Query API Types

```python
from moose_lib import Api
from typing import Callable, Dict, Any, List

# Query API handler type
QueryHandler = Callable[[Any, Dict[str, Any]], Any]

# Query context
class QueryContext:
    def __init__(self, client, sql, metrics):
        self.client = client
        self.sql = sql
        self.metrics = metrics

# Query API
def get_events_handler(client, params: Dict[str, Any]) -> List[Event]:
    limit = params.get('limit', 10)
    return client.query.execute(
        "SELECT * FROM events LIMIT {limit: Int32}",
        {"limit": limit}
    )

get_events = Api[Dict[str, Any], List[Event]]("get-events", query_function=get_events_handler)
```

## Configuration Types

### Database Configuration

```python
from pydantic import BaseModel
from typing import Optional

class DatabaseConfig(BaseModel):
    host: str
    port: int
    database: str
    username: Optional[str] = None
    password: Optional[str] = None
    ssl: bool = False
```

### Stream Configuration

```python
class StreamConfig(BaseModel):
    partitions: int
    replication_factor: int
    retention: Optional[str] = None
    compression: Optional[str] = None
    cleanup_policy: Optional[str] = None
```

### Workflow Configuration

```python
class WorkflowConfig(BaseModel):
    starting_task: WorkflowTask
    schedule: Optional[str] = None
    retries: Optional[int] = None
    timeout: Optional[str] = None
    concurrency: Optional[int] = None
    max_concurrency: Optional[int] = None
```

## Error Types

### Validation Errors

```python
class ValidationError(Exception):
    def __init__(self, message: str, field: str, value: Any):
        super().__init__(message)
        self.field = field
        self.value = value
        self.name = 'ValidationError'
```

### Database Errors

```python
class DatabaseError(Exception):
    def __init__(self, message: str, query: str, code: str):
        super().__init__(message)
        self.query = query
        self.code = code
        self.name = 'DatabaseError'
```

### Stream Errors

```python
class StreamError(Exception):
    def __init__(self, message: str, topic: str, partition: int):
        super().__init__(message)
        self.topic = topic
        self.partition = partition
        self.name = 'StreamError'
```

## Utility Types

### Generic Types

```python
from typing import TypeVar, Generic, Optional, List, Dict, Any

T = TypeVar('T')

class OptionalFields(Generic[T]):
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

class RequiredFields(Generic[T]):
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            if value is None:
                raise ValueError(f"Field {key} is required")
            setattr(self, key, value)
```

### MooseStack Specific Types

```python
from datetime import datetime
from typing import Optional, List, Dict, Any

class TimestampedEntity(BaseModel):
    created_at: datetime
    updated_at: datetime

class SoftDeleteEntity(BaseModel):
    deleted_at: Optional[datetime] = None
    is_deleted: bool = False

class PaginatedResult(BaseModel):
    data: List[Any]
    total: int
    page: int
    limit: int
    has_next: bool
    has_prev: bool
```

## Type Guards

### Runtime Type Checking

```python
from typing import Any

def is_event(obj: Any) -> bool:
    return (obj and 
            isinstance(obj, dict) and
            'id' in obj and
            'timestamp' in obj and
            'user_id' in obj and
            'event_type' in obj)

def is_user(obj: Any) -> bool:
    return (obj and
            isinstance(obj, dict) and
            'id' in obj and
            'name' in obj and
            'email' in obj)
```

### Validation Functions

```python
def validate_event(data: Any) -> Event:
    if not is_event(data):
        raise ValidationError('Invalid event data', 'event', data)
    return Event(**data)

def validate_user(data: Any) -> User:
    if not is_user(data):
        raise ValidationError('Invalid user data', 'user', data)
    return User(**data)
```

## Pydantic Models

### Base Models

```python
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime

class BaseModel(BaseModel):
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class User(BaseModel):
    id: Key[str]
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., regex=r'^[^@]+@[^@]+\.[^@]+$')
    is_active: bool = True
    
    @validator('email')
    def validate_email(cls, v):
        if not v or '@' not in v:
            raise ValueError('Invalid email format')
        return v.lower()
```

### Validation

```python
from pydantic import BaseModel, validator, Field
from typing import Optional

class Event(BaseModel):
    id: Key[str]
    timestamp: datetime
    user_id: Key[str]
    event_type: str = Field(..., regex=r'^[a-z_]+$')
    value: Optional[float] = None
    
    @validator('timestamp')
    def validate_timestamp(cls, v):
        if v > datetime.now():
            raise ValueError('Timestamp cannot be in the future')
        return v
    
    @validator('value')
    def validate_value(cls, v, values):
        if values.get('event_type') == 'purchase' and v is None:
            raise ValueError('Purchase events must have a value')
        return v
```

## Best Practices

1. **Use Key[T] for primary keys**
2. **Extend BaseModel for common fields**
3. **Use Pydantic validators for data validation**
4. **Define clear models for APIs**
5. **Use type hints for better IDE support**
6. **Handle errors with specific exception types**
7. **Use dataclasses for simple data structures**
8. **Leverage Pydantic's serialization features**

