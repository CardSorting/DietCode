# Cline Fourth Pass - Deep Context Tracking & Instructions Analysis
**Date**: April 2, 2026  
**Task**: Investigation of context tracking, instructions, and memory persistence patterns  
**Source**: cline-main/src/core/context (tracking + instructions systems)

---

## 📋 Executive Summary

Fourth pass investigation reveals Cline's **real-time monitoring and adaptive behavior system**:

### Key Patterns Discovered

1. **Three-Pronged Context Tracking** (Production Hardening)
   - **FileContextTracker**: Real-time file watching + state tracking
   - **ModelContextTracker**: Usage logging (provider, model, mode)
   - **EnvironmentContextTracker**: Environment change detection

2. **Smart Rule Evaluation** (Adaptive Behavior)
   - **RuleContextBuilder**: Extracts live path context from multiple sources
   - **Four data sources**: User messages, visible tabs, completed tools, pending tools
   - **Patch header parsing**: Handles apply_patch with dynamic path extraction

3. **Deduplication Safety Nets** (Error Prevention)
   - **File watchers**: Prevents stale context from external edits
   - **Duplicate prevention**: Ignores recent edits by self
   - **Orphan cleanup**: Startup cleanup of stale task warnings

These patterns make Cline **production-grade** by handling:
- **Concurrent file editing** (user edits while Codemarie thinks)
- **Cross-model switching** (tracking which provider/model used)
- **Environment drift** (OS changes, host name changes)
- **Rule misfires** (wrong files triggered for wrong operations)

---

## 🔍 Context Tracking Architecture

### 1. FileContextTracker (The Guardian)

**Purpose**: Prevent stale context from external file modifications

**How It Works**:
```typescript
// Setup watcher for each tracked file
async setupFileWatcher(filePath: string) {
  const watcher = chokidar.watch(resolvedFilePath, {
    persistent: true,
    ignoreInitial: true,
    atomic: true,
    awaitWriteFinish: {
      stabilityThreshold: 100, // Wait 100ms
      pollInterval: 100, // Check every 100ms
    },
  })

  watcher.on("change", () => {
    if (recentlyEditedByCodemarie.has(filePath)) {
      // This was us, ignore
    } else {
      // User edit detected: flag for reload
      recentlyModifiedFiles.add(filePath)
    }
  })
}
```

**State Tracking**:
```typescript
interface FileMetadataEntry {
  path: string
  record_state: "active" | "stale"
  record_source: "read_tool" | "user_edited" | "codemarie_edited" | "file_mentioned"
  codemarie_read_date: number | null
  codemarie_edit_date: number | null
  user_edit_date?: number | null
}
```

**Pattern Workflow**:
1. **On File Read/Edit**: Mark file as active with current timestamp
2. **On File Change via Watcher**: Detect external modification
3. **State Cleanup**: Mark old entries as "stale", keep newest
4. **Checkpoint Recovery**: Detect files edited between checkpoint and now

**Joy-Zoning Pattern**:
- **Domain**: `FileOperationEvent`, `FileState`, `FileSignature` (pure)
- **Core**: `FileContextTracker` (orchestrates watching + tracking)
- **Infrastructure**: File watcher adapter (chokidar configuration)
- **Persistence**: `TaskMetadata` (JSON state, Version 1)

**Why This Matters**:
- **Diff editing fix**: LLM edits file (editsExistingFile) → user saves → diff edit fails
- **Solution**: Detect external modify → reload before making changes
- **Example**: User edits `package.json` → Codemarie edits it → Context stale → Fix

---

### 2. ModelContextTracker (The Witness)

**Purpose**: Track which model/provider was used for each turn

**How It Works**:
```typescript
async recordModelUsage(apiProviderId: string, modelId: string, mode: string) {
  const metadata = await getTaskMetadata(this.taskId)

  // Prevent duplicate consecutive entries
  const lastEntry = metadata.model_usage[metadata.model_usage.length - 1]
  if (
    lastEntry &&
    lastEntry.model_id === modelId &&
    lastEntry.model_provider_id === apiProviderId &&
    lastEntry.mode === mode
  ) {
    return
  }

  metadata.model_usage.push({
    ts: Date.now(),
    model_id: modelId,
    model_provider_id: apiProviderId,
    mode: mode,
  })

  await saveTaskMetadata(this.taskId, metadata)
}
```

**Why This Matters**:
- **Multi-model switching**: Know which model handled which request
- **Cost tracking**: Calculate token usage by provider
- **Debugging**: Identify model failures vs. provider failures

**Joy-Zoning Pattern**:
- **Domain**: `ModelUsageEvent`, `ProviderContract` (pure)
- **Core**: `ModelContextTracker` (orchestrates tracking)
- **Infrastructure**: `TaskMetadataAdapter` (save/load JSON)
- **No Persistence Needed**: In-memory tracking is sufficient

---

### 3. EnvironmentContextTracker (The Sentinel)

**Purpose**: Detect when environment changed (OS, host, version)

**How It Works**:
```typescript
async recordEnvironment() {
  const metadata = await getTaskMetadata(this.taskId)

  const currentEnv = await collectEnvironmentMetadata()
  const currentEnvWithTs: EnvironmentMetadataEntry = {
    ts: Date.now(),
    ...currentEnv,
  }

  // Deduplicate: only add if environment actually changed
  const lastEntry = metadata.environment_history[metadata.environment_history.length - 1]
  if (lastEntry && this.isSameEnvironment(lastEntry, currentEnvWithTs)) {
    return
  }

  metadata.environment_history.push(currentEnvWithTs)
  await saveTaskMetadata(this.taskId, metadata)
}

private isSameEnvironment(a, b): boolean {
  return (
    a.os_name === b.os_name &&
    a.os_version === b.os_version &&
    a.os_arch === b.os_arch &&
    a.host_name === b.host_name &&
    a.host_version === b.host_version
  )
}
```

**Why This Matters**:
- **Autoscaling detection**: Host name changes on Docker/K8s
- **User trust**: User knows Codemarie doesn't collect unnecessary data
- **Audit trail**: Tracking when model switched (connection resets)

**Joy-Zoning Pattern**:
- **Domain**: `EnvironmentSnapshot`, `EnvironmentChangeDetector` (pure)
- **Core**: `EnvironmentContextTracker` (orchestrates tracking)
- **Infrastructure**: `SystemMetadataAdapter` (collect OS/version info)
- **No Dependencies**: Pure data collection

---

## 🔮 Rule Context Builder (Adaptive Behavior)

### Purpose: Build live path context for rule activation

**How It Works**:
```typescript
static async buildEvaluationContext(deps: RuleContextBuilderDeps): Promise<RuleEvaluationContext> {
  return {
    paths: await RuleContextBuilder.getRulePathContext(deps),
  }
}
```

**Four Path Data Sources**:

#### 1. User Messages (Evidence from Conversation)
```typescript
// Use latest user_feedback OR original task
const lastUserMsg = codemarieMessages
  .reverse()
  .find((m) => m.ask === "user_feedback" || m.ask === "task" && typeof m.text === "string")

if (lastUserMsg?.text) {
  candidates.push(...extractPathLikeStrings(lastUserMsg.text))
}
```

#### 2. Visible + Open Tabs (IDE State)
```typescript
const roots = deps.workspaceManager?.getRoots().map((r) => r.path) ?? [deps.cwd]
const rawVisiblePaths = (await HostProvider.window.getVisibleTabs({}))?.paths ?? []
const rawOpenTabPaths = (await HostProvider.window.getOpenTabs({}))?.paths ?? []

for (const abs of [...rawVisiblePaths, ...rawOpenTabPaths]) {
  for (const root of roots) {
    const rel = toWorkspaceRelativePosixPath(abs, root)
    if (rel) {
      candidates.push(rel)
    }
  }
}
```

#### 3. Completed Tool Operations (Post-Execution)
```typescript
for (const msg of codemarieMessages) {
  if (msg.say === "tool" && msg.text) {
    const tool = JSON.parse(msg.text) as { tool?: string; path?: string }
    if ((tool.tool === "editedExistingFile" || tool.tool === "newFileCreated") && tool.path) {
      candidates.push(tool.path)
    }
  }
}
```

#### 4. Pending Tool Operations (Pre-Execution) ← **Critical**
```typescript
for (const msg of codemarieMessages) {
  if (msg.ask === "tool" && msg.text) {
    const tool = JSON.parse(msg.text) as { tool?: string; path?: string }

    // Standard tools
    if (tool.path) {
      candidates.push(tool.path)
    }

    // apply_patch special handling: parse patch headers
    if (tool.tool === "applyPatch" && tool.content) {
      candidates.push(...RuleContextBuilder.extractPathsFromApplyPatch(tool.content))
    }
  }
}
```

**Patch Header Parsing**:
```typescript
private static extractPathsFromApplyPatch(input: string): string[] {
  const paths: string[] = []
  const fileHeaderRegex = /^\*\*\* (?:Add|Update|Delete) File: (.+?)(?:\n|$)/gm
  let m: RegExpExecArray | null
  while ((m = fileHeaderRegex.exec(input))) {
    paths.push((m[1] || "").trim())
  }
  return paths
}
```

**Normalization**:
```typescript
// Convert backslashes → forward slashes, remove leading slash
const posix = c.replace(/\\/g, "/").replace(/^\//, "")

// Deduplicate with Set
const seen = new Set<string>()
const normalized: string[] = []
for (const c of candidates) {
  if (!seen.has(posix)) {
    seen.add(posix)
    normalized.push(posix)
  }
}

// Cap at 100 to prevent performance degradation
if (normalized.length >= MAX_RULE_PATH_CANDIDATES) break

return normalized.sort()
```

**Why This Matters**:
- **Rule activation on delay**: Rule fires when `paths.indexOf(filePath) >= 0`
- **Intent capture**: Tool requests before execution
- **Diff parsing**: Reads patch headers to find target files dynamically
- **Example**: LLM drafts patch → apply_patch tool executes → Rule triggers on patch file

**Joy-Zoning Pattern**:
- **Domain**: `LivePathContext`, `ToolIntent`, `PatchParser` (pure)
- **Core**: `RuleContextBuilder` (orchestrates extraction)
- **Infrastructure**: `IDEAdapter` (HostProvider window tabs)
- **Persistence**: No (transient memory only)

---

## 🏗️ Proposed Integration Plan (Phase 4)

### Priority 1: File Context Tracker

**Files to Create**:
1. Domain: `FileOperationEvent`, `FileState`, `FileSignature` (pure)
2. Core: `FileContextTracker`
3. Infrastructure: `FileWatcherAdapter` (chokidar configuration)
4. Persistence: `TaskMetadataService` (JSON + SQLite)

**Key Features**:
- File watching with atomic writes + stability threshold
- State tracking (active vs. stale, all sources: read/user/codemarie/mention)
- Checkpoint recovery (detect files edited between messages)
- Deduplication (ignore recent self-edits)

**Investment**: **EXTREME** (fixes common bug: diff editing fails)

---

### Priority 2: Rule Context Builder

**Files to Create**:
1. Domain: `LivePathContext`, `ToolIntent`, `PatchParser` (pure)
2. Core: `RuleContextBuilder`
3. Infrastructure: `IDEAdapter` (HostProvider window tabs)
4. Validation: `PathValidator` (normalize + sanitize)

**Key Features**:
- Four data source integration (messages, tabs, completed, pending)
- Patch header parsing (`*** Add File: path/to/file.ts`)
- Path deduplication (Set, normalize to POSIX, max 100 candidates)
- Workspace-relative path conversion

**Investment**: **HIGH** (enables adaptive rule system)

---

### Priority 3: Model + Environment Trackers

**Files to Create**:
1. Domain: `ModelUsageEvent`, `EnvironmentSnapshot` (pure)
2. Core: `ModelContextTracker`, `EnvironmentContextTracker`
3. Infrastructure: `ProductivityLogger` (telemetry upload)

**Key Features**:
- Record provider/model/mode for each turn
- Prevent duplicate consecutive entries
- Export usage metrics (CSV/JSON) for debugging
- Rate limiting (upload to Feeds hourly)

**Investment**: **MEDIUM** (debugging + cost tracking)

---

## 🎓 Production Patterns Learned

### 1. **Dual-Phase Intent Capture** (Tool Requests)

**Cline Pattern**:
```typescript
// When LLM calls tool, message happens BEFORE tool execution
if (msg.ask === "tool") {
  // Extract path from INTENT (not result)
  candidates.push(tool.path)
}
```

**Why**:
- Captures async tool execution (tool = codegen → compile → fail → try again)
- Enables rule activation before execution
- User sees intent immediately → relevant rules fire

**Example**:
1. LLM drafts `apply_patch` → message enters history
2. `RuleContextBuilder` reads intent → finds patch file
3. Rule triggers immediately (even though patch hasn't been made yet)
4. Patch file created → Rule confirms activation

---

### 2. **Atomic Write Handling** (File Watcher Stability)

**Cline Pattern**:
```typescript
awaitWriteFinish: {
  stabilityThreshold: 100, // 100ms wait
  pollInterval: 100,       // Check every 100ms
}
```

**Why**:
- Editors use temp files + atomic renaming
- Without stability wait: trigger fires 50 times during one save
- Without polling: input buffer not flushed yet → failed triggers
- **Result**: Single reliable trigger per file change

**Example**:
1. User edits `file.ts` in VSCode
2. VSCode writes to `file.ts.tmp17b4` (atomic temp file)
3. Rename happens → standard watcher fires
4. `awaitWriteFinish`: Triggers after 100ms of stability

---

### 3. **Mark-and-Sweep Cleanup** (Stale State)

**Cline Pattern**:
```typescript
async addFileToFileContextTracker(filePath, source) {
  // Mark old entries as stale
  metadata.files_in_context.forEach((entry) => {
    if (entry.path === filePath && entry.record_state === "active") {
      entry.record_state = "stale"
    }
  })

  // Keep newest entry
  const newestEntry = getLatestDateForField(filePath, codemarie_read_date)
  newEntry.codemarie_read_date = newestEntry
}
```

**Why**:
- Multiple sources can read same file (tool + mention)
- Need to keep most recent state (ignore re-reads)
- Prevents memory bloat (infinitely many read entries)
- **Result**: One active entry per file, timestamped

**Example**:
1. LLM reads `package.json` (codemarie_read_date: 10:00)
2. User edits file manually (user_edit_date: 10:05)
3. LLM edits file (codemarie_edit_date: 10:10)
4. Tracker: Active entry, timestamp 10:10, source codemarie_edited
5. Next reload: Uses latest active entry (not stale ones)

---

### 4. **Priority-Based Path Extraction Order** (Evidence Ranking)

**Cline Pattern**:
```typescript
const candidates: string[] = []

// Priority 1: Latest user message (most relevant)
candidates.push(...extractPathLikeStrings(lastUserMsg))
candidates.push(...getVisibleTabs())
candidates.push(...getCompletedTools())
candidates.push(...getPendingTools())

// Then: Deduplicate + sort
return normalized.sort()
```

**Why**:
- User message is highest confidence (intent expressed)
- Visible tabs = current focus (what user sees)
- Completed tools = recent history (what just happened)
- Pending tools = future intent (what Codemarie plans)
- **Result**: Default rule list sorted by relevance

**Example**:
1. User edits `fileA.ts` manually
2. User types: "Fix bugs in fileB.ts"
3. RuleContextBuilder extracts:
   - Path: fileA.ts (from manual edit - low confidence)
   - Path: fileB.ts (from user message - high confidence)
4. Rule checks `paths.includes("fileB.ts")` → TRUE (rules fire on most relevant file)

---

### 5. **Orphan Cleanup on Startup** (Resource Management)

**Cline Pattern**:
```typescript
static async cleanupOrphanedWarnings(stateManager: StateManager) {
  // Remove pendingFileContextWarning tasks for non-existent tasks
  const taskHistory = await readTaskHistoryFromState()
  const existingTaskIds = new Set(taskHistory.map(task => task.id))
  const allStateKeys = Object.keys(stateManager.getAllWorkspaceStateEntries())
  const pendingWarningKeys = allStateKeys.filter(key => key.startsWith("pendingFileContextWarning_"))

  for (const key of pendingWarningKeys) {
    const taskId = key.replace("pendingFileContextWarning_", "")
    if (!existingTaskIds.has(taskId)) {
      await stateManager.setWorkspaceState(key, undefined) // Delete orphan
    }
  }
}
```

**Why**:
- Task history persists in VSCode state
- Pending file warnings persist across restarts
- Orphan warnings (task deleted from history but not from state) linger
- **Result**: Clean startup, no memory leaks on previous work

**Example**:
1. Session 1: Task X created, warning stored → Session ends
2. Task X deleted manually (VSCode history updated)
3. Session 2: Warning still exists (from stale session state)
4. Cleanup runs: Detect warning's taskId not in history → delete warning

---

## 📊 Complete Cline Integration Summary

**Four Pass Deep Dive Completed**:

| Feature | First Pass | Second Pass | Third Pass | Fourth Pass | Priority | Status |
|---------|-----------|-------------|------------|-------------|----------|--------|
| **Pre-Tool Hooks** | ✅ | ✅ | ✅ | ✅ | Must Have | Complete |
| **Distributed Locks** | ✅ | ✅ | ✅ | ✅ | Must Have | Complete |
| **State Subscription** | ✅ | ✅ | ✅ | ✅ | Must Have | Complete |
| **File Watching** | ✅ | ✅ | ✅ | ✅ | Must Have | Complete |
| **Context Optimization** | ❌ | ❌ | ✅ | ✅ | EXTREME | **Implement** |
| **Context Truncation** | ❌ | ❌ | ✅ | ✅ | EXTREME | **Implement** |
| **Tool Result Validation** | ⏳ | ⏳ | ✅ | ✅ | EXTREME | **Implement** |
| **Efficiency Metrics** | ❌ | ❌ | ✅ | ✅ | EXTREME | **Implement** |
| **File Context Tracker** | ❌ | ❌ | ❌ | ✅ | EXTREME | **Implement** |
| **Rule Context Builder** | ❌ | ❌ | ❌ | ✅ | HIGH | **Implement** |
| **Model Context Tracker** | ❌ | ❌ | ❌ | ✅ | MEDIUM | **Implement** |
| **Environment Context Tracker** | ❌ | ❌ | ❌ | ✅ | LOW | **Implement** |

---

## 🚀 Recommended Implementation Roadmap

### Phase 3A (This Week): Context Optimization
1. **Domain**: `FileReadPattern`, `FileFingerprint` (pure)
2. **Infra**: `FileSignatureService.ts` (hash files: SHA-256)
3. **Core**: `ContextOptimizationService.ts`
4. **Integration**: Enable in `ContextService.getContextMessages()`

### Phase 3B (Next Week): File Context Tracker
1. **Domain**: `FileOperationEvent`, `FileState` (pure)
2. **Infra**: `FileWatcherAdapter` (chokidar)
3. **Core**: `FileContextTracker`
4. **Persistence**: `TaskMetadataService.ts`

### Phase 3C (After That): Rule Context Builder
1. **Domain**: `LivePathContext`, `ToolIntent` (pure)
2. **Infra**: `IDEAdapter` (HostProvider)
3. **Core**: `RuleContextBuilder`
4. **Validation**: `PathValidator`

### Phase 3D (After That): Context Truncation + Efficiency

---

## 🎯 Conclusion

**Fourth pass reveals flagship production patterns**:

### What Makes Cline Production-Ready

1. **Real-time Monitoring** (File/Model/Environment trackers)
   - Catches concurrent file edits
   - Tracks cross-model switching
   - Detects environment drift

2. **Intent-First Rules** (RuleContextBuilder)
   - Captures tool requests before execution
   - Parses patch headers dynamically
   - Rank candidates by relevance

3. **Atomic Safety Nets** (watchers, dedup, orphan cleanup)
   - No false positives from self-edit
   - No memory leaks on stale tasks
   - Reliable triggers on file changes

**Investment Impact**:
- **File Context Tracker**: Fixes diff editing bug (critical production issue)
- **Rule Context Builder**: Enables adaptive behavior (future value)
- **Models**: Multi-provider tracking + cost awareness
- **Environment**: Trust indicator + debugging tool

**Final Assessment**: Cline is **trajectory competitive** with Claude 3.5 Sonnet's context management after implementing these features. Invest in order of impact (diff fix → optimization → rules → trackers).

---

*Generated by Codemarie - DietCode Architect - Fourth Pass Analysis*
*Source: Cline Context Tracking + Instructions*
*Date: April 2, 2026*