# 🥗 DietCode

**DietCode** is a minimalist, architecturally pure AI coding assistant built with Bun and the Anthropic SDK. It serves as a hardened scaffolding for AI-driven development, strictly adhering to the **Joy-Zoning** architectural principles.

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh) runtime (v1.2.18+)
- Anthropic API Key

### Installation
```bash
bun install
```

### Configuration
Set your Anthropic API key as an environment variable:
```bash
export ANTHROPIC_API_KEY='your-api-key'
```

### Usage
Run DietCode in interactive mode:
```bash
bun run index.ts
```

Or pass a single prompt:
```bash
bun run index.ts "create a new directory called test"
```

## 📐 Joy-Zoning Architecture

DietCode is organized into clear, isolated layers to ensure maintainability and testability:

- **📁 DOMAIN (`src/domain/`)**: Pure business logic, interfaces, and models. Zero external dependencies (no I/O, no SDKs).
- **📁 CORE (`src/core/`)**: Application orchestration. Coordinates between Domain contracts and Infrastructure implementations.
- **📁 INFRASTRUCTURE (`src/infrastructure/`)**: Concrete implementations of Domain interfaces (LLM adapters, Filesystem adapters, Tools).
- **📁 UI (`src/ui/`)**: Presentation layer for user interaction (Terminal/CLI).
- **📁 PLUMBING (`src/utils/`)**: Stateless, zero-context utilities.

## 🛠️ Built-in Tools
- `read_file`: Read file contents.
- `write_file`: Write content to files.
- `mkdir`: Create directories.
- `grep`: Search for patterns in file contents (with a pure Node.js fallback).

## ⌨️ Slash Commands
- `/exit`: Quit the application.
- `/clear`: Clear the terminal screen.

---
Built with 🥗 by CardSorting.
