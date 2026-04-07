# ⚒️ Development Guide

Welcome, Agent. This guide outlines the technical protocols for contributing to the **Sovereign Hive**.

---

## 💎 Prerequisites

- **Bun (v1.2.18+)**: The primary runtime and package manager.
- **VS Code**: Required for extension development and debugging.
- **Node.js**: Required for certain legacy scripts (e.g. `npx tsx`).

---

## 🚀 Setup & Launch

### 1. Install Dependencies
```bash
bun install
```

### 2. Build the Extension
This command builds both the webview UI (React) and the core extension (TypeScript).
```bash
bun run build
```

### 3. Launch the Extension Host
1. Open the project in VS Code.
2. Press `F5` or go to the "Run and Debug" view and select "Run DietCode Extension".
3. A new VS Code window will open with the DietCode Sovereign Hive extension activated.

---

## 🧪 Testing Protocol

The Hive requires **Axiomatic Consistency**. Always test before sharding your code.

- **Vitest Unit Tests**:
  ```bash
  bun test
  ```

- **Full Verification Suite**: 
  The project includes multiple verification scripts (`verify_*.ts`) that simulate real-world AI orchestration.
  ```bash
  # Core infrastructure verification
  npx tsx verify_advanced_infrastructure.ts
  
  # Cinematic UI verification
  npx tsx verify_metabolic_ui.ts
  ```

---

## 🧼 Code Quality & Linting

We enforce the **Level 10 Standard** using **Biome** and **ESLint**.

- **Check & Apply (Auto-fix)**:
  ```bash
  bun run check
  ```
- **Linting Only**:
  ```bash
  bun run lint
  ```
- **Formatting**:
  ```bash
  bun run format
  ```

---

## 📐 Extension Structure

- `src/extension.ts`: Entries and VS Code API integration.
- `src/ui/provider/SovereignWebViewProvider.ts`: Webview lifecycle management.
- `webview-ui/`: A React-based UI that runs inside the VS Code webview. Uses **Vite** and **Bun**.

---

## 🤝 Branching & PRs

1.  **Tag Your Work**: Ensure all new files start with the mandatory `[LAYER]` tag.
2.  **Modular PRs**: Only modify one layer per Pull Request if possible.
3.  **No `any` Policy**: PRs with `any` types will be rejected by the Hive Guardrails.

---

Build with Sovereignty. Build with Joy.
