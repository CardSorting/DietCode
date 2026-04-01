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
export type { PathValidationErrorCode } from './PathValidator';
