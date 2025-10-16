# Define Workflows

Create and configure workflows for ETL pipelines and task orchestration.

## Basic Workflow

### TypeScript

```typescript
import { Workflow } from "@514labs/moose-lib";

const etlWorkflow = new Workflow("my-etl", {
  startingTask: startEtl,
  schedule: "@every 1h",
  retries: 3
});

async function startEtl(context) {
  console.log("Starting ETL process");
  
  // Extract data
  const data = await extractData();
  
  // Transform data
  const transformedData = await transformData(data);
  
  // Load data
  await loadData(transformedData);
  
  console.log("ETL process completed");
}
```

### Python

```python
from moose_lib import Workflow
import asyncio

async def start_etl(context):
    print("Starting ETL process")
    
    # Extract data
    data = await extract_data()
    
    # Transform data
    transformed_data = await transform_data(data)
    
    # Load data
    await load_data(transformed_data)
    
    print("ETL process completed")

etl_workflow = Workflow("my-etl", {
    "starting_task": start_etl,
    "schedule": "@every 1h",
    "retries": 3
})
```

## Workflow Configuration

### Basic Configuration

```typescript
const workflow = new Workflow("my-workflow", {
  startingTask: myTask,
  schedule: "@daily",
  retries: 3,
  timeout: "30m"
});
```

### Advanced Configuration

```typescript
const workflow = new Workflow("my-workflow", {
  startingTask: myTask,
  schedule: "0 0 * * *",  // Cron expression
  retries: 5,
  timeout: "1h",
  concurrency: 3,
  maxConcurrency: 10
});
```

## Task Definitions

### Simple Task

```typescript
async function processData(context) {
  const { client, sql } = context;
  
  // Process data
  const result = await client.query.execute(sql`
    SELECT * FROM events 
    WHERE processed = false
  `);
  
  return result;
}
```

### Task with Parameters

```typescript
async function processUserData(context, userId: string) {
  const { client, sql } = context;
  
  const result = await client.query.execute(sql`
    SELECT * FROM events 
    WHERE userId = ${userId}
  `);
  
  return result;
}
```

### Task with Dependencies

```typescript
async function extractData(context) {
  // Extract data from source
  return await fetchFromAPI();
}

async function transformData(context, data) {
  // Transform the data
  return data.map(item => ({
    ...item,
    processed: true
  }));
}

async function loadData(context, data) {
  // Load data to destination
  await context.client.query.execute(sql`
    INSERT INTO processed_events VALUES ${data}
  `);
}

const workflow = new Workflow("etl", {
  startingTask: extractData,
  tasks: {
    extract: extractData,
    transform: transformData,
    load: loadData
  }
});
```

## Workflow Patterns

### Sequential Tasks

```typescript
const sequentialWorkflow = new Workflow("sequential", {
  startingTask: task1,
  tasks: {
    task1: async (context) => {
      console.log("Task 1");
      return "result1";
    },
    task2: async (context, result1) => {
      console.log("Task 2 with result:", result1);
      return "result2";
    },
    task3: async (context, result2) => {
      console.log("Task 3 with result:", result2);
    }
  }
});
```

### Parallel Tasks

```typescript
const parallelWorkflow = new Workflow("parallel", {
  startingTask: async (context) => {
    // Run tasks in parallel
    const [result1, result2, result3] = await Promise.all([
      task1(context),
      task2(context),
      task3(context)
    ]);
    
    return { result1, result2, result3 };
  }
});
```

### Conditional Tasks

```typescript
const conditionalWorkflow = new Workflow("conditional", {
  startingTask: async (context) => {
    const data = await fetchData();
    
    if (data.length > 1000) {
      return await processLargeDataset(context, data);
    } else {
      return await processSmallDataset(context, data);
    }
  }
});
```

## Error Handling

### Retry Configuration

```typescript
const workflow = new Workflow("retry-example", {
  startingTask: unreliableTask,
  retries: 3,
  retryDelay: "5s",
  maxRetryDelay: "1m"
});

async function unreliableTask(context) {
  // This task might fail
  const success = Math.random() > 0.5;
  
  if (!success) {
    throw new Error("Task failed");
  }
  
  return "success";
}
```

### Error Handling Tasks

```typescript
const workflow = new Workflow("error-handling", {
  startingTask: mainTask,
  errorHandler: async (error, context) => {
    console.error("Workflow failed:", error);
    
    // Send notification
    await sendAlert("Workflow failed", error.message);
    
    // Log to monitoring system
    await logError(error, context);
  }
});
```

## Workflow Lifecycle

### Starting Workflows

```typescript
// Start workflow manually
await workflow.start();

// Start with parameters
await workflow.start({ userId: "123" });
```

### Stopping Workflows

```typescript
// Stop workflow
await workflow.stop();

// Cancel running workflow
await workflow.cancel();
```

### Workflow Status

```typescript
const status = await workflow.getStatus();
console.log("Workflow status:", status);

// Check if running
if (workflow.isRunning()) {
  console.log("Workflow is running");
}
```

## Monitoring and Observability

### Workflow Metrics

```typescript
const workflow = new Workflow("monitored", {
  startingTask: myTask,
  monitoring: {
    enabled: true,
    metrics: ['duration', 'success-rate', 'error-rate']
  }
});
```

### Custom Metrics

```typescript
async function monitoredTask(context) {
  const startTime = Date.now();
  
  try {
    // Do work
    const result = await doWork();
    
    // Record success metric
    await context.metrics.record('task.success', 1);
    
    return result;
  } catch (error) {
    // Record error metric
    await context.metrics.record('task.error', 1);
    throw error;
  } finally {
    // Record duration
    const duration = Date.now() - startTime;
    await context.metrics.record('task.duration', duration);
  }
}
```

## Best Practices

1. **Use meaningful workflow names**
2. **Handle errors gracefully**
3. **Set appropriate timeouts**
4. **Monitor workflow execution**
5. **Use idempotent tasks**
6. **Log important events**

## Common Patterns

### ETL Pipeline

```typescript
const etlWorkflow = new Workflow("etl-pipeline", {
  startingTask: extract,
  tasks: {
    extract: async (context) => {
      return await extractFromSource();
    },
    transform: async (context, data) => {
      return await transformData(data);
    },
    load: async (context, data) => {
      return await loadToDestination(data);
    }
  }
});
```

### Data Validation

```typescript
const validationWorkflow = new Workflow("data-validation", {
  startingTask: validateData,
  schedule: "@hourly"
});

async function validateData(context) {
  const data = await fetchData();
  
  for (const record of data) {
    if (!isValid(record)) {
      await sendAlert("Invalid data found", record);
    }
  }
}
```

### Notification Workflow

```typescript
const notificationWorkflow = new Workflow("notifications", {
  startingTask: sendNotifications,
  schedule: "@daily"
});

async function sendNotifications(context) {
  const users = await getUsersToNotify();
  
  for (const user of users) {
    await sendEmail(user.email, "Daily summary");
  }
}
```

## Next Steps

- [Scheduling](./scheduling.md)
- [Triggers](./triggers.md)
- [Retries and Timeouts](./retries-timeouts.md)

