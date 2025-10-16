# Moose Workflows

Build ETL pipelines and task orchestration with in-memory workflow code.

## Overview

Moose Workflows provides:
- **ETL Pipelines**: Extract, transform, and load data
- **Task Orchestration**: Coordinate complex workflows
- **Scheduling**: Run workflows on schedules
- **Retries**: Handle failures gracefully
- **Monitoring**: Track workflow execution

## Quick Start

```typescript
import { Workflow } from "@514labs/moose-lib";

const etlWorkflow = new Workflow("my-etl", {
  startingTask: startEtl,
  schedule: "@every 1h",
  retries: 3
});
```

## Core Concepts

- [Define Workflows](./define-workflows.md) - Creating workflow definitions
- [Scheduling](./scheduling.md) - Running workflows on schedules
- [Triggers](./triggers.md) - Event-based workflow triggers
- [Retries and Timeouts](./retries-timeouts.md) - Error handling
- [Cancelling Workflows](./cancelling-workflows.md) - Workflow lifecycle management

## Workflow Types

- [ETL Pipelines](./etl-pipelines.md) - Data processing workflows
- [Data Validation](./data-validation.md) - Quality assurance workflows
- [Notifications](./notifications.md) - Alert and notification workflows
- [Data Aggregation](./data-aggregation.md) - Analytics workflows

## Examples

- [Basic ETL](./examples/basic-etl.md)
- [Data Pipeline](./examples/data-pipeline.md)
- [Scheduled Job](./examples/scheduled-job.md)
- [Complex Workflow](./examples/complex-workflow.md)

## Advanced Topics

- [Workflow Patterns](./workflow-patterns.md)
- [Performance Optimization](./performance-optimization.md)
- [Monitoring and Alerting](./monitoring-alerting.md)

