# 🏛 State Management & Schema

DietCode uses a centralized, schema-driven state management system to ensure consistency across the extension host and the user interface.

## State Definitions

The single source of truth for state keys, types, and defaults is located at:
[src/shared/storage/state-keys.ts](file:///Users/bozoegg/Downloads/DietCode/src/shared/storage/state-keys.ts)

### Primary State Categories

| Category | Key Example | Description |
| :--- | :--- | :--- |
| **Global State** | `userInfo`, `workspaceRoots` | Persistent data stored across VS Code sessions. |
| **User Settings** | `autoApprovalSettings`, `mode` | Configurable preferences that determine behavior. |
| **Process State** | `executionStatus`, `currentlyExecutingTool` | Transient state representing active background work. |
| **Component State** | `mcpServers`, `taskHistorySummary` | Mirrored status from backend services (MCP, History). |

## The State Lifecycle

1. **Mutation**: A service calls `StateOrchestrator.applyChange()`.
2. **Persistence**: The change is debounced and saved to `VsCodeStateRepository`.
3. **Observation**: Registered `StateObservers` (like `StateSyncService`) are notified of the change.
4. **Synchronization**: `StateSyncService` broadcasts the new state snapshot to the UI via gRPC.

## Key Components

### StateOrchestrator
The main entry point for state changes. It ensures atomicity and handles high-level orchestration logic (like notifying global observers).

### Dynamic State Assembler
Located in `SovereignWebViewProvider.ts`, this logic dynamically constructs the full `ExtensionState` interface by merging:
- Orchestrated state snapshots.
- Static extension settings.
- Live provider discovery data (models and health).

## Adding a New State Key

1. Define the key and its `FieldDefinition` in `src/shared/storage/state-keys.ts`.
2. Update the `ExtensionState` interface in `src/shared/ExtensionMessage.ts` if the state needs to be sent to the UI.
3. Update the `_getStateSnapshot()` method in `SovereignWebViewProvider.ts` to include the new key in the outgoing gRPC payload.
4. (Optional) Register a service as a `StateObserver` if it needs to react to changes in that key.

## Security & Sovereignty
- **Masking**: Sensitive data (API keys) is masked during state reconciliation.
- **Local-First**: Process state is kept entirely in-memory or in the local Sovereign database, never leaked to external telemetry.
