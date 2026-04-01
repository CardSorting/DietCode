# JOYZONING: The DietCode Architectural Code

DietCode follows the **Joy-Zoning** architecture to maintain extreme minimalism, clarity, and maintainability. Each layer is a creative zone with strict boundaries.

## 📐 LAYER GUIDE:

### DOMAIN (`src/domain/`)
- **Purpose**: Pure business logic and types.
- **What belongs here**: Models, value objects, business rules, interfaces.
- **What to avoid**: I/O, external imports (`fs`, `http`, SDKs), UI state.
- **Principle**: Zero external dependencies. Fully testable without mocks.

### CORE (`src/core/`)
- **Purpose**: Application orchestration.
- **What belongs here**: Task coordination, tool orchestration, workflow logic.
- **What to avoid**: Direct UI rendering, raw database queries, low-level I/O.
- **Principle**: Orchestrate, don't implement low-level concerns directly.

### INFRASTRUCTURE (`src/infrastructure/`)
- **Purpose**: Adapters and integrations.
- **What belongs here**: API clients, database adapters, file system operations.
- **What to avoid**: Business rules, UI components, domain logic.
- **Principle**: Implement interfaces defined by Domain. Keep domain-agnostic.

### UI (`src/ui/`)
- **Purpose**: Presentation and user interaction.
- **What belongs here**: Input handling, output formatting, visual state.
- **What to avoid**: Business logic, direct I/O, infrastructure imports.
- **Principle**: Render state, dispatch intentions.

### PLUMBING (`src/utils/`)
- **Purpose**: Shared stateless utilities.
- **What belongs here**: String formatters, validators, pure functions.
- **What to avoid**: Dependencies on any other layer.
- **Principle**: Zero context. Fully independent.

---

## 🔄 DEPENDENCY FLOW (Import Rules):
- **Domain** → (nothing external)
- **Core** → Domain, Infrastructure, Plumbing
- **Infrastructure** → Domain, Plumbing
- **UI** → Domain, Plumbing (not Infrastructure directly)
- **Plumbing** → (nothing — fully independent)

---

## ⚖️ RULINGS FOR AGENTS:
- **Rule 1**: Every file MUST start with a `[LAYER]` tag in the first line.
- **Rule 2**: Cross-layer import violations are architectural debt.
- **Rule 3**: Logic in UI is forbidden. Move to Core or Domain.
- **Rule 4**: I/O in Domain is forbidden. Use dependency inversion.
