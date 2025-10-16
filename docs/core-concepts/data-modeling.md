# Data Modeling

Model all of your infrastructure in native TypeScript or Python. Share the same types across all components.

## Basic Data Models

### TypeScript

```typescript
import { Key } from "@514labs/moose-lib";

interface Event {
  id: Key<string>;
  name: string;
  createdAt: Date;
  userId: string;
  metadata: Record<string, any>;
}

interface AggregatedEvent {
  count: number;
  name: string;
  lastSeen: Date;
}
```

### Python

```python
from moose_lib import Key
from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime

class Event(BaseModel):
    id: Key[str]
    name: str
    created_at: datetime
    user_id: str
    metadata: Dict[str, Any]

class AggregatedEvent(BaseModel):
    count: int
    name: str
    last_seen: datetime
```

## Supported Types

### Primitive Types

| TypeScript | Python | ClickHouse | Description |
|------------|--------|------------|-------------|
| `string` | `str` | `String` | Text data |
| `number` | `int`, `float` | `Int32`, `Float64` | Numeric data |
| `boolean` | `bool` | `UInt8` | Boolean values |
| `Date` | `datetime` | `DateTime` | Date/time data |

### Complex Types

| TypeScript | Python | ClickHouse | Description |
|------------|--------|------------|-------------|
| `Key<T>` | `Key[T]` | Primary key | Unique identifier |
| `Record<string, T>` | `Dict[str, T]` | `Map(String, T)` | Key-value pairs |
| `T[]` | `List[T]` | `Array(T)` | Arrays |
| `Optional<T>` | `Optional[T]` | `Nullable(T)` | Nullable fields |

## Key Fields

Use `Key<T>` for primary keys:

```typescript
interface User {
  id: Key<string>;        // Primary key
  email: string;
  name: string;
}
```

```python
class User(BaseModel):
    id: Key[str]          # Primary key
    email: str
    name: str
```

## Nested Objects

```typescript
interface Address {
  street: string;
  city: string;
  country: string;
}

interface User {
  id: Key<string>;
  name: string;
  address: Address;
}
```

```python
class Address(BaseModel):
    street: str
    city: str
    country: str

class User(BaseModel):
    id: Key[str]
    name: str
    address: Address
```

## Arrays and Collections

```typescript
interface Product {
  id: Key<string>;
  name: string;
  tags: string[];
  prices: Record<string, number>;
}
```

```python
class Product(BaseModel):
    id: Key[str]
    name: str
    tags: List[str]
    prices: Dict[str, float]
```

## Type Inheritance

### TypeScript

```typescript
interface BaseEntity {
  id: Key<string>;
  createdAt: Date;
  updatedAt: Date;
}

interface User extends BaseEntity {
  email: string;
  name: string;
}
```

### Python

```python
class BaseEntity(BaseModel):
    id: Key[str]
    created_at: datetime
    updated_at: datetime

class User(BaseEntity):
    email: str
    name: str
```

## Schema Optimization

### Column Ordering
ClickHouse performance is affected by column order. Place frequently queried columns first:

```typescript
interface Event {
  // Frequently queried columns first
  timestamp: Date;
  userId: string;
  eventType: string;
  
  // Less frequently queried columns last
  metadata: Record<string, any>;
  rawData: string;
}
```

### Data Types
Choose appropriate data types for performance:

```typescript
interface Metrics {
  // Use specific integer types
  userId: number;        // Int32
  count: number;         // Int64
  score: number;         // Float64
  
  // Use String for text, not FixedString unless fixed length
  description: string;  // String
  code: string;          // String
}
```

## Validation

### TypeScript
Use TypeScript's type system for compile-time validation:

```typescript
interface User {
  id: Key<string>;
  email: string;  // Add email validation
  age: number;    // Add range validation
}
```

### Python
Use Pydantic for runtime validation:

```python
from pydantic import BaseModel, EmailStr, Field

class User(BaseModel):
    id: Key[str]
    email: EmailStr
    age: int = Field(ge=0, le=120)
```

## Best Practices

1. **Use Key<T> for primary keys**
2. **Choose appropriate data types**
3. **Order columns by query frequency**
4. **Use nullable types sparingly**
5. **Validate data at boundaries**
6. **Document complex schemas**

## Next Steps

- [Moose OLAP](../moose-olap/) - Using your models with databases
- [Moose Streaming](../moose-streaming/) - Using your models with streams
- [Moose APIs](../moose-apis/) - Using your models with APIs

