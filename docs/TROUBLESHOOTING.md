# 🚨 Troubleshooting Guide

If the **Sovereign Hive** is experiencing technical drift, follow these protocols to restore **Axiomatic Consistency**.

---

## 🔑 Common Configuration Issues

### 1. API Key Not Found
**Symptom**: "Error: No API key provided for provider 'anthropic'."  
**Solution**: Ensure your environment variables are correctly set in the shell where you launched VS Code.
- **MacOS/Linux**: `export ANTHROPIC_API_KEY='your-key'`
- **VS Code Settings**: You can also configure keys directly in the DietCode webview settings panel.

### 2. SQLite Database Locking
**Symptom**: "Database is locked" or BroccoliQ time-outs.  
**Solution**: This usually happens if multiple instances of the Hive are accessing the same `broccoliq.db`.
- Close any other running VS Code sessions.
- Run `rm broccoliq.db-shm broccoliq.db-wal` (be careful, this will clear temporary write-ahead logs, but not your main data).

---

## ⚒️ Build & Launch Failures

### 1. Bun Version Mismatch
**Symptom**: "Unsupported engine" or syntax errors in build scripts.  
**Solution**: DietCode requires **Bun v1.2.18+**.
- Run `bun -v` to check your version.
- Run `bun upgrade` to get the latest.

### 2. Webview Not Loading
**Symptom**: The "DietCode" sidebar view is blank or stuck on "Loading...".  
**Solution**:
- Ensure the build command completed: `bun run build`.
- Check the VS Code Developer Tools (Help > Toggle Developer Tools) for "Refused to load" or IPC errors.
- Restart the Extension Host (`Cmd + Shift + P` > `Developer: Reload Window`).

---

## 🧪 Testing Failures

### 1. Verification Scripts Failing
**Symptom**: `verify_advanced_infrastructure.ts` or others failing during a shard scan.  
**Solution**: 
- Re-install dependencies: `bun install`.
- Ensure you have the latest **BroccoliQ** version: `bun add @noorm/broccoliq@latest`.

---

## 🚨 Final Recourse: The Nuclear Patch

If all else fails and the Hive is severely corrupted:
1.  **Clear Build Artifacts**: `rm -rf dist node_modules webview-ui/dist`.
2.  **Clear Persistence**: `rm *.db *.db-shm *.db-wal`.
3.  **Fresh Rebuild**: `bun install && bun run build`.

---

Build with Sovereignty. Build with Joy.
