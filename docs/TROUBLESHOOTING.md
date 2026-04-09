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

### 3. Extension Activation: better-sqlite3 Module Not Found
**Symptom**: "Activating extension 'dietcode.dietcode' failed: Cannot find package 'better-sqlite3' imported from .../dist/extension.js"  
**Cause**: The `.vsix` file was built with `--external better-sqlite3` which caused Node.js's ES Module loader to attempt a dynamic import of a non-existent local package.  
**Solution**:
- Ensure the `build` script in `package.json` **does not** contain `--external better-sqlite3`. 
- `better-sqlite3` must be bundled directly into `dist/extension.js`.
- Rebuild the `.vsix` package: `bun run build && bun run package:vsix`.
- Reinstall the extension using `code --install-extension dietcode-x.x.x.vsix --force`.

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
