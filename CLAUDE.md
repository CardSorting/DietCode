# CLAUDE.md: Agent Architectural Implementation Guide for DietCode

This project strictly enforces **Joy-Zoning** architecture. As an agent, you MUST follow these guidelines for every change.

## 🏗️ ARCHITECTURAL COMPLIANCE

1.  **Placement of Files**:
    - **Models & Types**: Always place in `src/domain/`.
    - **Business Logic**: Always place in `src/domain/` or `src/core/`.
    - **External Integrations**: Always place in `src/infrastructure/`.
    - **Terminal I/O**: Always place in `src/ui/`.
    - **Helpers**: Always place in `src/utils/`.

2.  **Strict Dependency Flow**:
    - **NEVER** import Infrastructure or UI from Domain.
    - **NEVER** import Infrastructure from UI.
    - **PREFER** using interfaces in Domain and implementing them in Infrastructure (Dependency Inversion).

3.  **Mandatory Layer Headers**:
    Each file MUST have a Joy-Zoning header in the following format:
    ```typescript
    /**
     * [LAYER: <LAYER_NAME>]
     * Principle: <Core Principle of that Layer>
     * Violations: <List of known temporary violations or 'None'>
     */
    ```

## 🛠️ TOOLING
- Run `bun run scripts/validate-joyzoning.ts` before every commit or completion to ensure architectural purity.
