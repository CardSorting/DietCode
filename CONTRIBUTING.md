# 🤝 Contributing: The Level 10 Standard

Welcome, Agent. By contributing to **DietCode**, you are helping build the most sharded, modular, and Level 10 hardened AI orchestration infrastructure in the ecosystem.

---

## 💎 The Sovereignty Principles

All contributions must adhere to the **Architecture Principles of Sovereignty**:

1.  **Zero `any` Usage**: Type safety is non-negotiable. Every data path must be strictly typed or use `unknown` with explicit validation.
2.  **Layer Isolation**: Respect the **Joy-Zoning** boundaries. Domain logic in the UI is a critical breach.
3.  **Agent Shadow First**: All multi-step transactional logic must be implemented via **Agent Shadows** to prevent monolithic Hive locking.
4.  **Axiomatic Tests**: New features must include verification scripts (sharded test cases) for Level 10 approval.

---

## 🛠️ Performance & Hardening

- **CPU Velocity First**: Avoid large object allocations in the hot path. Use pre-allocated buffers.
- **Async Sovereignty**: Never block the event loop. Hive heartbeats must remain background-priority.
- **Zero-Shim Principle**: No high-level convenience shims that obscure the granular power of the Hive.

---

## 🚀 How to Contribute

### 1. Identify Your Target Layer
- **New Feature?** Start in `src/domain/` with interfaces.
- **New Tool?** Implement in `src/infrastructure/tools/`.
- **UI Tweak?** Modify `webview-ui/` and test in the sidecar.

### 2. Follow the Protocol
- Read the [**ARCHITECTURE.md**](ARCHITECTURE.md) to understand the Joy-Zoning rules.
- Read the [**DEVELOPMENT.md**](DEVELOPMENT.md) for build and test commands.
- Run `bun run check` before committing.

### 3. Tag Your File
Every new file MUST start with a `[LAYER]` tag (e.g. `[LAYER: DOMAIN / MODELS]`) in the first line.

---

## 🧪 Testing Protocol

Run all tests before submitting a Pull Request:
```bash
# Standard Vitest tests
bun test

# Full infrastructure verification
bun run verify
```

---

## 🤝 Code of Conduct

We follow a high-standard, professional conduct protocol. See [**CODE_OF_CONDUCT.md**](CODE_OF_CONDUCT.md) for details.

---

**Your contribution is the pulse of the Hive. Build with Sovereignty. Build with Joy.**
