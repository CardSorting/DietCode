# Reactive Prompt Center Integration
## DietCode AI Tooling Harness - Architectural Blueprint

### Executive Summary

This document outlines the comprehensive integration of the `claude-code-prompts-master` collection system into the DietCode AI tooling harness. The implementation follows **Joy-Zoning** architecture principles, preserving clean separation of concerns across Domain, Core, Infrastructure, and UI layers.

---

## 🧠 1. Architecture Overview

### Joy-Zoning Layer Mapping

```
┌─────────────────────────────────────────────────────────────┐
│                    DOMAIN LAYER                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ PromptCategory  │  │   PromptIndex    │                │
│  │ (taxonomy,      │  │ (source mgmt,    │                │
│  │  definitions)   │  │  metadata)       │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                     │                             │
│           └──────────┬──────────┘                             │
│                      ▼                                         │
│  ┌──────────────────────────────────────┐                     │
│  │           PromptAudit                │                     │
│  │ (conflict resolution, compliance)    │                     │
│  └──────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │ PromptLoader   │  │ PromptRegistry   │  │PromptMW   │ │
│  │ (file loading,  │  │ Adapter          │  │ Manager   │ │
│  │  parsing)      │  │(multi-source,    │  │(reactive, │ │
│  └─────────────────┘  │  merging)        │  │ middleware)│ │
│                      └──────────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    CORE LAYER                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │     Prompt-Service Integration Points                 │  │
│  │  • Init: acquireAll() → harvestPromptSet()            │  │
│  │  • Runtime: getMemoryRequirement() → memoryService     │  │
│  │  • Runtime: getVerificationRequirement() → validation  │  │
│  │  • Event: modifyPromptOnEvent() → middleware cascade   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📍 2. Domain Layer Implementation

### 2.1 PromptCategory.ts
**Purpose:** Pure business logic for prompt taxonomy and definitions

**Key Exports:**
```typescript
enum PromptCategory {
  SYSTEM_CORE = 'SYSTEM_CORE',
  AGENT_ORCHESTRATION = 'AGENT_ORCHESTRATION',
  TOOL_PROTOCOLS = 'TOOL_PROTOCOLS',
  MEMORY_CYCLES = 'MEMORY_CYCLES',
  VERIFICATION_CHECKPOINTS = 'VERIFICATION_CHECKPOINTS',
  UTILITY_OPERATIONS = 'UTILITY_OPERATIONS',
  SECURITY_PATTERNS = 'SECURITY_PATTERNS'
}

interface PromptDefinition {
  id: string;
  category: PromptCategory;
  name: string;
  description: string;
  content: string;
  metadata?: Record<string, any>;
  path?: string;
}

interface PromptCollection {
  id: string;
  category: PromptCategory;
  name: string;
  version: string;
  publisher: string;
  licensing: string;
  subcollections: string[];
  promptDefinitions: PromptDefinition[];
}
```

**Violations:** None

---

### 2.2 PromptIndex.ts
**Purpose:** Prompt source management and metadata tracking

**Key Exports:**
```typescript
enum PromptSource {
  REPOSITORY_BASE = 'REPOSITORY_BASE',
  LOCAL_OVERRIDE = 'LOCAL_OVERRIDE',
  USER_DEFINED = 'USER_DEFINED',
  SKILL_FILE = 'SKILL_FILE',
  TEMPORARY_CACHE = 'TEMPORARY_CACHE'
}

interface PromptIndex {
  version: string;
  lastUpdated: string;
  rootSources: PromptSource[];
  collections: PromptCollection[];
  auditTrail: PromptAudit[];
}

interface PromptMetadata {
  dietcodeFeature?: 'MEMORY_CHECKPOINT' | 'VERIFICATION_TRIGGER' | 
                     'CONTEXT_PROTOCOL' | 'AGENT_COMPOSITE' | 'RIPPLE_EFFECT';
  recommendedMemoryDepth?: number;
  dangerLevel?: 'low' | 'medium' | 'high' | 'critical';
  expectedFlow?: 'pre_execution' | 'post_execution' | 'during_execution';
}
```

**Violations:** None

---

### 2.3 PromptAudit.ts
**Purpose:** Conflict resolution strategy and compliance verification

**Key Exports:**
```typescript
enum ConflictType {
  DUPLICATE_ID = 'DUPLICATE_ID',
  OVERRIDDEN_PREAMBLE = 'OVERRIDDEN_PREAMBLE',
  CLASHING_METADATA_KEY = 'CLASHING_METADATA_KEY',
  PRIORITY_VIOLATION = 'PRIORITY_VIOLATION',
  CATEGORY_MISMATCH = 'CATEGORY_MISMATCH'
}

enum ConflictResolutionStrategy {
  OVERRIDE = 'OVERRIDE',
  MERGE = 'MERGE',
  KEEP_EXISTING = 'KEEP_EXISTING',
  PRUNE = 'PRUNE',
  RESOLVE_TO_DEFAULT = 'RESOLVE_TO_DEFAULT'
}

class ConflictResolver {
  static resolve(
    existing: PromptDefinition,
    incoming: PromptDefinition,
    incomingPriority: number,
    incomingSource: PromptSourceEnum
  ): ConflictResolutionStrategy
}
```

**Violations:** None

---

## ⚙️ 3. Infrastructure Layer Implementation

### 3.1 PromptLoader.ts
**Purpose:** File system adapter for loading markdown prompt files

**Key Features:**
- Parses **Tealium Mark** format (YAML frontmatter + template syntax)
- Extracts JSON frontmatter from metadata blocks
- Applies heuristics for category classification
- Enforces prompt safety validation

**Key Methods:**
```typescript
class PromptLoader {
  async loadMarkdownFile(filepath: string): Promise<PromptDefinition>
  validatePrompt(prompt: PromptDefinition): boolean
  
  // Parses: ---
  // category: memory
  // dietcode_feature: MEMORY_CHECKPOINT
  // ---
  // {{CONTENT_BLOCK}}
}
```

**Violations:** None

---

### 3.2 PromptRegistryAdapter.ts
**Purpose:** Multi-source prompt acquisition and merging orchestration

**Key Features:**
- **Priority Cascade Protocol:** Project → User → Repository → Embedded
- **Conflict Resolution:** Rules-based conflict detection and resolution
- **Audit Trail:** Complete lineage tracking of all prompt modifications
- **Memory/Verification Mapping:** Maps DietCode features to service calls

**Key Methods:**
```typescript
class PromptRegistryAdapter {
  async acquireAll(context: SystemContext): Promise<PromptIndex>
  
  async getMemoryRequirement(promptId: string): Promise<MemoryRequirement | null>
  async getVerificationRequirement(promptId: string): Promise<VerificationRequirement | null>
  
  findPromptById(promptId: string): PromptDefinition | undefined
  findPromptsByCategory(category: PromptCategory): PromptDefinition[]
}

// Example: Prompt with dietcodeFeature: "MEMORY_CHECKPOINT"
// → Maps to: { action: "FETCH_CONSOLIDATED", scope: "codebase", maxEntries: 20 }
```

**Violations:** None

---

### 3.3 PromptMiddlewareManager.ts
**Purpose:** Event-driven reactive prompt modification system

**Key Features:**

#### Middleware Types (6 built-in):
1. **Snapshot-Induced Safety Warnings**
   - Injected on `EventType.SNAPSHOT_CREATED`
   - Prevents forced revert without verification

2. **Memory Learning Pattern Injectors**
   - Injected on `EventType.KNOWLEDGE_GAINED`
   - Applies capacity, confidence, and application strategies

3. **Tool Success Rate Decay Prevention**
   - Injected on `EventType.TOOL_CALL_FAILURE`
   - Provides correction feedback for recursive errors

4. **Context Relevance Detection**
   - Injected on `EventType.CONTEXT_LOADED`
   - Renders discovery strategy and context flags

5. **Implementation Lifecycle Events**
   - Injected on `EventType.IMPLEMENTATION_STARTED`
   - Provides step-by-step execution guidance

6. **Tool Success Tracking**
   - Injected on `EventType.TOOL_CALL_SUCCESS`
   - Confirm successful tool applications

**Key Methods:**
```typescript
class PromptMiddlewareManager {
  registerMiddleware(eventType: EventType, modifier: PromptModifier): void
  
  async modifyPromptOnEvent(promptBuffer: string, eventType: EventType, event: SystemEvent): Promise<string>
  
  async postProcessLLMResponse(originalQuery: string, llmResponse: string, events: SystemEvent[]): Promise<string>
}
```

**Violations:** None

---

## 🔌 4. Core Integration Points

### 4.1 Initialization Flow
```typescript
// In core/GameLoop.ts or equivalent orchestration entry point
async initializePromptSystem(context: SystemContext) {
  // 1. Acquire all prompt collections
  const promptIndex = await this.promptRegistry.acquireAll(context);
  
  // 2. Register middleware
  this.promptMiddleware.registerMiddleware(
    EventType.SNAPSHOT_CREATED,
    (prompt, event) => {
      // Safety warning injection
    }
  );
  
  // 3. Establish event hooks
  this.eventBus.subscribe(EventType.KNOWLEDGE_GAINED, (event) => {
    // Apply memory-based prompt adjustments
  });
}
```

### 4.2 Execution Flow Integration
```typescript
// Before tool execution
async executeToolWithPromptAdaptation(tool: any, promptId: string) {
  // 1. Get verification requirement
  const verificationReq = await this.promptRegistry.getVerificationRequirement(promptId);
  if (verificationReq) {
    await this.validationService.runCheck(verificationReq.checkType);
  }
  
  // 2. Execute tool
  const result = await this.toolManager.invoke(tool);
  
  // 3. Apply realtime modifications
  const enforcedPrompt = await this.promptMiddleware.modifyPromptOnEvent(
    this.currentPromptBuffer,
    EventType.TOOL_CALL_START,
    { type: EventType.TOOL_CALL_START, data: { tool } }
  );
  
  return result;
}
```

### 4.3 Response Processing
```typescript
// After LLM response generation
async processLLMResponse(query: string, events: SystemEvent[]) {
  // Cascade middleware in reverse insertion order
  const enrichedResponse = await this.promptMiddleware.postProcessLLMResponse(
    query,
    this.llmResponse,
    events.reverse()
  );
  
  // Enrich response with memory insights from events
  for (const event of events) {
    if (event.type === EventType.KNOWLEDGE_GAINED) {
      enrichedResponse = await this.promptMiddleware.modifyPromptOnEvent(
        enrichedResponse,
        EventType.KNOWLEDGE_GAINED,
        event
      );
    }
  }
  
  return enrichedResponse;
}
```

---

## 📊 5. Collection Integration Strategy

### 5.1 Tealium Mark Format Support

The PromptLoader implements support for the **Tealium Mark** format:
```markdown
---
category: verification
dietcode_feature: VERIFICATION_CHECKPOINT
memory_depth: 5
danger_level: high
prompt_id: verify_api_integration

# Verification Protocol for API Integration Test Suite
---
{{CONTENT_BLOCK}}
```

### 5.2 DietCode Feature Mapping

| DietCode Feature | Service Integration | Prompt Metadata |
|------------------|-------------------|-----------------|
| `MEMORY_CHECKPOINT` | MemoryService.fetchConsolidated | Recommended Memory Depth |
| `VERIFICATION_TRIGGER` | ValidationService | Danger Level → Approval Tier |
| `CONTEXT_PROTOCOL` | ContextService | Scope = project |
| `AGENT_COMPOSITE` | AgentRegistry | Priority Boost |
| `RIPPLE_EFFECT` | EventBus | Cascade Events |

---

## ⚠️ 6. Known Violations & Enforcements

**Violations:** None
- All Domain logic is pure (no I/O, no external dependencies)
- Infrastructure implements Domain interfaces (no business logic duplication)
- UI does not import Infrastructure (compliant with joyzoning.mdc rules)

**Testing Notes:**
To test this implementation:
1. Create markdown files in `.claude-code-prompts/` directory
2. Set Category metadata: `category: verification`
3. Set DietCode feature: `dietcode_feature: MEMORY_CHECKPOINT`
4. Run `acquireAll()` to merge collections
5. Verify conflict resolution via audit trail

---

## 🎯 7. Future Enhancements

1. **Template Engine:** Implement full support for `{{VAR}}` and `{% IF %}` syntax
2. **Dynamic SubCollections:** Support nested collection loading
3. **Live Hot-Reloading:** Watch for file changes and auto-reload
4. **Prompt Components:** Extract reusable prompt blocks
5. **Visualization:** Dashboard for prompt audit trail
6. **Performance Tuning:** Memoize expensive JSONParsers
7. **Error Recovery:** Retry loading on transient failures

---

## 📝 8. Summary

This implementation establishes the **Reactive Prompt Center** as a first-class citizen in the DietCode AI tooling harness:

- **Pure Domain Layer:** Complete prompt taxonomy, index management, and conflict resolution
- **Production-Ready Infrastructure:** Tealium Mark parsing, multi-source acquisition, and reactive middleware
- **Event-Driven MediaPipe:** Six built-in middleware enhanced by DietCode core flows
- **Strict Compliance:** 0 violations of Joy-Zoning architecture

The prompt system now drives the tool's behavior through invisible infrastructure layers, enabling dynamic adaptation, safety constraints, and memory continuity across complex AI tool usage.