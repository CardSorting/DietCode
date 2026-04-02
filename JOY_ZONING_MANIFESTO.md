# 🌸 The JoyZoning Manifesto

JoyZoning is not just a directory structure; it is an automated, self-healing architectural enforcement system for high-sovereignty development.

## 1. The Header Rule (Tag Locality)
Every file MUST declare its layer in a Comment Header within the first 10,000 characters. Tags found in the body are architectural debris and are ignored by the guard.
- **Format**: `[LAYER: TYPE]` (where TYPE is one of `DOMAIN`, `CORE`, `INFRASTRUCTURE`, `UI`, `UTILS`)

## 2. Principle of Geographic Alignment (PGA)
A file's layer tag MUST align with its physical filesystem location (Misplaced File Detection).
- `[LAYER: DOMAIN]` → `src/domain/`
- `[LAYER: CORE]` → `src/core/`
- `[LAYER: INFRASTRUCTURE]` → `src/infrastructure/`

## 3. The Import Depth Limit
Excessive relative navigation (`../../../../`) bypasses geographic isolation and is flagged as a JoyZoning violation. 
- **Limit**: 3 levels of relative depth.

## 4. Automated Healing (Refactoring)
Architectural drift is corrected using the `RefactorTools` engine.
- **Feature**: Perfect Import Resolution - handles multiline, type-only, and backtick-delimited imports.
- **Feature**: Atomic Directory Alignment - moves entire folders while maintaining project-wide integrity.

## 5. Post-Execution Enforcement
The `JoyZoningGuard` hook runs after every tool call. If an architectural violation is introduced, the system will immediately "nudge" the agent with a healing recommendation.

---
*Architecture is a celebration of order. Doubling down on JoyZoning ensures the codebase remains a joy to build upon.*
