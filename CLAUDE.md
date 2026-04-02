# DietCode Development Guide

## Build & Run Commands
- `bun install`: Install dependencies.
- `bun run index.ts`: Start the application in interactive mode.

## Project Structure (Joy-Zoning)
- **src/domain/**: Pure business logic and interfaces.
- **src/core/**: Orchestration and dependency injection.
- **src/infrastructure/**: Concrete adapters and tools.
- **src/ui/**: Terminal-based presentation.
- **src/utils/**: Stateless plumbing.

## Architectural Enforcement
- All files MUST include a `[LAYER: TYPE]` tag (e.g., `[LAYER: CORE]`).
- Strictly adhere to the dependency flow defined in `JOYZONING.md`.
- No direct I/O in the Domain layer.
- No business logic in the UI layer.
- **Verification**:- Mandate: Every file MUST have a `[LAYER: TYPE]` tag in the header. (See [JOY_ZONING_MANIFESTO.md](file:///Users/bozoegg/Downloads/DietCode/JOY_ZONING_MANIFESTO.md))
- Enforcement: Use `verify_joyzoning.ts` after any file modification.
- Healing: Use `RefactorTools.moveAndFixImports` for atomic relocation and perfect import resolution.
- Guard: Automated `JoyZoningGuard` hook executes after tool use to prevent architectural drift.
