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
- All files MUST include a `[LAYER]` tag.
- Strictly adhere to the dependency flow defined in `JOYZONING.md`.
- No direct I/O in the Domain layer.
- No business logic in the UI layer.
