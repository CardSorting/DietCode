# Context Optimization System - Implementation Guide

## Overview

The Context Optimization System implements a **two-finger pattern** strategy for managing file reads in DietCode. When a file is read multiple times within a short time window (default: 30 seconds), subsequent reads are replaced with a compact notice placeholder, reducing context size while maintaining reasoning capabilities.

---

## Architecture

The system follows **Joy-Zoning layers**:

### Domain Layer (`src/domain/context/`)
- **FileOperation.ts**: Core types and interfaces
- **FileMetadata.ts**: Optimization metadata and helpers
- **ContextOptimizationPolicy.ts**: Configuration and optimization logic

### Core Layer (`src/core/capabilities/`)
- **FileContextTracker**: Tracks file reads and detects duplicates
- **ContextOptimizationService**: Orchestrates optimization decisions
- **OptimizationMetrics**: Calculates and reports optimization statistics

### Core Layer (`src/core/orchestration/`)
- **ContextOptimizationServiceOrchestrator**: Main integration point for all components

### Infrastructure Layer (`src/infrastructure/context/`)
- **VimFileReader**: File reading adapter with optimization integration
- **SignatureDatabase**: Storage for optimized file signatures

---

## How It Works

### The Two-Finger Pattern

1. **First Read**: Full file content is kept in context
2. **Subsequent Reads** (within window): Replace with:
   ```
   Duplicate file read notice
   ```
3. **After Window**: Original read is restored/checkpointed

### Optimization Trigger

Optimization is triggered when:
- **Max file reads reached**: 10 total reads per session
- **Context size threshold**: 80% of 512KB limit reached

---

## Usage Guide

### Basic Usage

```typescript
import { createDefaultOrchestrator } from '../core/orchestration/ContextOptimizationService'
import { VimFileReader } from '../infrastructure/context/VimFileReader'

// Create orchestration service
const orchestrator = createDefaultOrchestrator()

// Start a session
orchestrator.startSession('session-123')

// Read a file with optimization
const result = await orchestrator.readFileOptimized('/path/to/file.ts')

if (result.wasOptimized) {
  console.log(`Optimized: ${result.optimizationReason}`)
  // Output: "Optimized: two_finger_pattern" or "reusing_cached_optimization"
}
```

### Advanced Usage

```typescript
import { OptimizationConfig } from '../domain/context/ContextOptimizationPolicy'

// Custom configuration
const config: Partial<OptimizationConfig> = {
  maxFileReadsPerSession: 15,
  duplicateWindowMs: 60000, // 60 seconds
  savingsThreshold: 40, // 40% savings threshold
  enableTwoFinger: true,
  enableRos: false,
  maxContextSize: 1024 * 1024, // 1MB
  optimizationTrigger: 85,
  enableOnTheFly: true
}

const orchestrator = createDefaultOrchestrator(
  undefined, // Signature database (optional)
  config
)
```

### Getting Optimization Reports

```typescript
// Generate comprehensive report
const report = await orchestrator.generateReport()

console.log(`Optimization Score: ${report.metrics.optimizationScore.toFixed(1)}`)
console.log(`Potential Savings: ${report.metrics.percentageSaved.toFixed(1)}%`)
console.log(`Context Truncated: ${report.contextTruncated}`)
console.log(`Total Optimized Files: ${report.signatureCount}`)
```

### Checking Context Summary

```typescript
const summary = orchestrator.getContextSummary()

console.log(`Total Reads: ${summary.totalReads}`)
console.log(`Optimized Files: ${summary.optimizedFiles}`)
console.log(`Potential Savings: ${summary.potentialSavings.toFixed(1)}%`)
console.log(`Context Saturation: ${(summary.saturation * 100).toFixed(0)}%`)
```

### Using VimFileReader Directly

```typescript
import { VimFileReader } from '../infrastructure/context/VimFileReader'

// Create reader with optimization
const reader = new VimFileReader()

// Read file
const result = await reader.readFile('/path/to/file.ts', 10, 100)

// Check if file was recently read
const recentlyRead = await reader.hasRecentRead('/path/to/file.ts')

// Read multiple files
const files = ['file1.ts', 'file2.ts', 'file3.ts']
const results = await reader.readMultipleFiles(files)
```

### Using Signature Database

```typescript
import { SignatureDatabase } from '../infrastructure/context/SignatureDatabase'

// Create database
const db = new SignatureDatabase()

// Start session
db.startSession('session-123')

// Record file signature
const signature = db.recordSignature('/path/to/file.ts', optimizedResult)

// Check optimization status
const optimized = db.isOptimized('/path/to/file.ts')

// Get signature details
const sig = db.getSignature('/path/to/file.ts')

// List all optimized files
const signatures = db.listSignatures(50, 0)
```

---

## Configuration Reference

### OptimizationConfig

```typescript
interface OptimizationConfig {
  maxFileReadsPerSession: number    // Max file reads before optimization (default: 10)
  duplicateWindowMs: number         // Window for duplicate detection in ms (default: 30000)
  savingsThreshold: number          // Savings % to keep content (default: 30)
  enableTwoFinger: boolean          // Enable two-finger pattern (default: true)
  enableRos: boolean                // Enable ROS for variant selection (default: false)
  maxContextSize: number            // Max bytes before truncation (default: 512KB)
  optimizationTrigger: number       // Trigger at % of max size (default: 80)
  enableOnTheFly: boolean           // Enable on-the-fly optimization (default: false)
}
```

---

## Metrics Explained

### SessionMetrics

Retrieved via `OptimizationMetricsAggregator.getSessionMetrics()`:

```typescript
interface SessionMetrics {
  totalReads: number                 // Total file reads in session
  duplicateReads: number             // Files with duplicates
  totalSizeKB: number                // Total context size in KB
  bytesSaved: number                 // Total bytes saved
  percentageSaved: number            // Net savings percentage
  duplicateRatio: number             // Duplicate reads / total reads
  optimizationScore: number          // Score 0-100
  contextUsageRatio: number          // Current size / max size
  optimizationTriggerStatus: TriggerStatus
  recommendations: string[]          // Actionable recommendations
}
```

---

## Integration Points

### With File System

The `VimFileReader` can be integrated with your existing file system:

```typescript
// In VimFileReader.ts - readViaVim method
private async readViaVim(filePath: string): Promise<string> {
  const fs = require('fs/promises')
  return await fs.readFile(filePath, 'utf-8')
}
```

### With Context Management System

The orchestration service can be integrated with your context management system:

```typescript
// In ExecutionService or similar
import { createDefaultOrchestrator } from '../core/orchestration/ContextOptimizationService'

class ExecutionService {
  private contextOptimization = createDefaultOrchestrator()
  
  async handleFileRead(filePath: string) {
    this.contextOptimization.startSession(this.currentSessionId)
    result = await this.contextOptimization.readFileOptimized(filePath)
    
    if (result.wasOptimized) {
      // Update context with optimized result
      this.updateContext(result.result)
    }
  }
}
```

---

## Benchmarks

### Testing the Two-Finger Pattern

```typescript
import { createDefaultOrchestrator } from './core/orchestration/ContextOptimizationService'

const orchestrator = createDefaultOrchestrator()

// Repetitive reads
const files = ['/path/to/file1.ts', '/path/to/file2.ts', '/path/to/file3.ts']

for (let i = 0; i < 30; i++) {
  for (const file of files) {
    const result = await orchestrator.readFileOptimized(file)
  }
}

// Generate report
const report = await orchestrator.generateReport()

console.log(`Optimized: ${report.metrics.optimizationScore} points`)
console.log(`Savings: ${report.metrics.percentageSaved}%`)
```

---

## Future Enhancements

Currently planned or optional features:

1. **ROS Integration** (`enableRos: true`): Variant selection through Repository Optimization Systems
2. **Persistent Storage**: Save optimized signatures to database
3. **Analysis Dashboard**: Visual metrics and trends
4. **API Clients**: Git, LLM, and other tool integrations
5. **Granular Controls**: Per-project optimization policies

---

## Troubleshooting

### Issue: No optimization occurring

**Solution**: Check your session configuration
```typescript
const config = {
  maxFileReadsPerSession: 10,  // Increase if too strict
  duplicateWindowMs: 30000,   // Increase if too short
  enableTwoFinger: true        // Ensure this is true
}
```

### Issue: Too many optimizations

**Solution**: Adjust thresholds
```typescript
const config = {
  savingsThreshold: 50,  // Raise threshold
  optimizationTrigger: 90  // Raise trigger percentage
}
```

### Issue: Performance degradation

**Solution**: Optimize hash computation and cache performance

---

## Performance Considerations

1. **Hash Function**: Currently uses a simple sum-based hash. For production, use SHA-256 or xxHash
2. **Memory Usage**: Cache has a limit (1000 signatures). Consider disk-based storage
3. **Lookup Time**: O(1) for in-memory lookups, O(n) for signature queries

---

## References

- **Joy-Zoning Architecture**: See `JOYZONING.md`
- **Prework Protocol**: See `.cursor/rules/prework.mdc`
- **Cline Inspiration**: `/Users/bozoegg/Downloads/cline-main` research phase

---

## Status

- ✅ Domain Layer Complete
- ✅ Core Layer Complete
- ✅ Infrastructure Layer Complete
- ✅ Orchestration Service Complete
- ⏳ Documentation Complete
- ⏳ Integration with ExecutionService (pending)

**Last Updated**: April 2, 2026