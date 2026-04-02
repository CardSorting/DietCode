# 🏙️ JOYZONING AUDIT REPORT: Organizational Debt

This report identifies all files currently residing in layer roots and proposes a **Functional Cluster Mapping** for remediation. Joy-Zoning mandates that files be grouped into clusters to avoid clutter and improve discoverability.

## 📊 Summary of Debt
- **Total Orphaned Files**: 27
- **Infected Layers**: 5 (`src/domain`, `src/infrastructure`, `src/ui`, `src/utils`, `src/test`)
- **Primary Violation**: Missing Sub-Zoning (Layer Root Dumping).

---

## 🛠️ Infrastructure Layer Audit (`src/infrastructure/`)

| File | Proposed Cluster | Rationale |
|------|------------------|-----------|
| `BinaryFileTypeDetector.ts` | `storage/filesystem` | Low-level file system metadata. |
| `ConsoleLoggerAdapter.ts` | `logging/` | Moves into the already existing `logging` cluster. |
| `EnhancedFileSystemAdapter.ts` | `storage/filesystem` | Primary file system adapter. |
| `FileIntegrityAnalyzer.ts` | `integrity/` | Analysis related to code integrity. |
| `FileSystemAdapter.ts` | `storage/filesystem` | Core file system logic. |
| `FileTypes.ts` | `storage/filesystem` | Type definitions for file system operations. |
| `FuzzySearchRepository.ts` | `database/` | Search is a persistence-layer concern. |
| `IntegrityAdapter.ts` | `integrity/` | Implementation of Domain integrity contracts. |
| `IntegrityVerificationProvider.ts` | `integrity/` | Provider for integrity verification. |
| `NodeSystemAdapter.ts` | `system/` | Low-level Node.js system interaction. |
| `NodeTerminalAdapter.ts` | `terminal/` | Terminal interaction implementation. |
| `PromptLoader.ts` | `prompts/` | Part of the Prompt-engine cluster. |
| `PromptMiddlewareManager.ts` | `prompts/` | Prompt middleware management. |
| `PromptRegistryAdapter.ts` | `prompts/` | Registry for prompts. |
| `SelectedOptionsBuilder.ts` | `prompts/` | Part of prompt selection workflow. |
| `SemanticIntegrityAdapter.ts` | `integrity/` | Semantic analysis for integrity. |
| `TerminalDisplay.ts` | `terminal/` | UI logic for the terminal. |
| `TransactionManager.ts` | `database/` | Transaction handling for persistence. |
| `TypeScriptValidator.ts` | `validation/` | Moves to existing `validation` cluster. |
| `WalkerConfigBuilder.ts` | `storage/filesystem` | Configuration for directory walking. |
| `WorkerIntegrityAdapter.ts` | `workers/` | Multi-threading logic for integrity. |
| `WorkerPoolAdapter.ts` | `workers/` | Infrastructure for worker pools. |

---

## 🏛️ Domain Layer Audit (`src/domain/`)

| File | Proposed Cluster | Rationale |
|------|------------------|-----------|
| `Validation.ts` | `validation/` | Moves to existing `validation` cluster. |
| `Errors.ts` | `common/errors/` | Shared domain error types. |
| `LLMProvider.ts` | `llm/` | LLM service interfaces. |
| `Event.ts` | `events/` | Moves to existing `events` cluster. |

---

## 🔆 Other Layers Audit

| File | Proposed Cluster | Rationale |
|------|------------------|-----------|
| `src/ui/VitalsDashboard.ts` | `src/ui/dashboard/` | Specific UI component grouping. |
| `src/ui/terminal.ts` | `src/ui/terminal/` | UI concern for terminal handling. |
| `src/utils/stringUtils.ts` | `src/utils/text/` | Grouping stateless converters. |

---

## ⚖️ Cluster Purity Assessment
- **Cross-Cluster Leaks**: High. `FileSystemAdapter` is currently imported by almost everything.
- **Remediation Priority**: **CRITICAL**. The flat structure makes it difficult to distinguish between "Adapters" and "Services".

> [!TIP]
> **Organizational Debt Detection**: The updated `ArchitecturalGuardian` now flags any *new* files added to these locations. Use this report as a guide for correcting the current structure when refactoring is scheduled.

---
**End of Audit Report**
