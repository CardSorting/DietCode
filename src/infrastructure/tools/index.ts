/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Barrel export for the tools subsystem.
 * Provides clean import paths for consumers.
 */

// Registry
export { ToolRegistryImpl } from './ToolRegistry';

// Tool Factories — File Operations
export {
  createReadFileTool,
  createWriteFileTool,
  createReadRangeTool,
  createListFilesTool,
} from './fileTools';

// Tool Factories — Search
export { createGrepTool, grepToolFactory } from './grep';

// Tool Factories — Directory
export { createMkdirTool } from './mkdir';

// Path Validation (shared utility)
export {
  validatePath,
  shellEscape,
  isSafeExtension,
  isSkippedDirectory,
  normalizePath,
  PathValidationError,
  MAX_FILE_SIZE_BYTES,
  MAX_RECURSION_DEPTH,
  MAX_RESULT_LINES,
  SAFE_EXTENSIONS,
  SKIP_DIRECTORIES,
} from './PathValidator';
// Refactoring and Integrity Tools
export { RefactorTools } from './RefactorTools';
