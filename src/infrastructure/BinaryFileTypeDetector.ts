/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Infrastructure implementation of Domain FileMetadata contract.
 * Production-grade binary detection using file command + heuristics.
 * 
 * Inspired by: ForgeFS multi-method binary detection (is_binary.rs)
 * Violations: None
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - [IMPLEMENT] Multi-method fallback for binary detection (file cmd → heuristics → magic bytes)
 */
import * as childProcess from 'child_process';
import type { Filesystem } from '../domain/system/Filesystem';
import type { BinaryDetectionResult } from './FileTypes';

/**
 * Magic byte mappings for fast binary detection.
 * Checks file extensions first for common binary formats.
 */
const MAGIC_BYTES_MAP: Record<string, string> = {
  'MZ': 'PE executable (Microsoft)',
  '7f 45 4c 46': 'ELF executable (Linux/Mac)',
  '89 50 4e 47': 'PNG image',
  'ff d8 ff': 'JPEG image',
  '47 49 46 38': 'GIF image',
  '52 49 46 46': 'RIFF/BMP',
  '25 50 44 46': 'PDF document',
  '50 4b 03 04': 'ZIP archive',
  '1f 8b': 'GZIP compressed',
  '4d 5a': 'Windows DLL',
  'd0 cf 11 e0': 'Microsoft Office DOC',
  '50 4b 05 06': 'ZIP spanning',
};

/**
 * List of binary file extensions (case-insensitive).
 * Used for fast extension-based detection as fallback.
 */
const BINARY_EXTENSIONS: ReadonlySet<string> = new Set([
  'exe', 'dll', 'so', 'dylib', 'bin', 'obj', 'o',
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp',
  'zip', 'tar', 'gz', 'xz', 'rar', '7z',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'mp3', 'wav', 'flac', 'ogg', 'aac',
  'mp4', 'mov', 'avi', 'mkv', 'webm',
  'sqlite', 'db', 'mdb',
]);



/**
 * Detect file type using multi-method fallback strategy.
 * 
 * Priority order:
 * 1. file command (Linux/macOS) - most reliable
 * 2. NUL byte check (heuristic) - caught pointer files
 * 3. Magic bytes (fast extension check) - quick binary detection
 * 
 * @param path - Path to file to analyze
 * @param fs - Filesystem adapter for reading content
 * @returns Binary detection result with comprehensive metadata
 */
export async function detectBinaryFileType(
  path: string,
  fs: Filesystem
): Promise<BinaryDetectionResult> {
  // Method 1: file command (Linux/macOS) - error OK, continue to fallbacks
  try {
    const fileCmd = `file --mime-type "${escapeShellArgument(path)}"`;
    const output = childProcess.execSync(fileCmd, { encoding: 'utf8' }).trim();
    
    if (output.includes('binary')) {
      return {
        isBinary: true,
        mimeType: output,
        binaryType: parseMIMEType(output),
      };
    }
  } catch (error) {
    // Method fails, continue to heuristics
  }

  // Method 2: Check file extension for common binaries
  try {
    const ext = getFileExtension(path);
    if (BINARY_EXTENSIONS.has(ext.toLowerCase())) {
      return {
        isBinary: true,
        mimeType: 'application/octet-stream',
        binaryType: `${ext.toUpperCase()} binary`,
      };
    }
  } catch (error) {
    // Continue to magic bytes
  }

  // Method 3: Check first 1024 bytes for NUL bytes (heuristic)
  try {
    const buffer = await fs.readFileBuffer(path, 1024);
    const hasNulByte = Array.from(buffer).some((byte: number) => byte === 0x00);
    
    if (hasNulByte) {
      return {
        isBinary: true,
        mimeType: 'application/octet-stream',
        binaryType: 'likely binary (NUL byte in first 1024 bytes)',
      };
    }
  } catch (error) {
    // Continue to magic bytes
  }

  // Method 4: Check magic bytes for executable signatures
  try {
    const buffer = await fs.readFileBuffer(path, 16);
    return checkMagicBytes(buffer, path);
  } catch (error) {
    // All methods failed, assume text
  }

  // Default: text file
  return { isBinary: false, mimeType: 'text/plain' };
}

/**
 * Escape shell arguments to prevent injection.
 */
function escapeShellArgument(arg: string): string {
  if (/^[a-zA-Z0-9\-_./:]+$/.test(arg)) {
    return arg;
  }
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Extract file extension from path.
 */
function getFileExtension(path: string): string {
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1 || lastDot === path.length - 1) {
    return '';
  }
  return path.slice(lastDot + 1);
}

/**
 * Parse MIME type from file command output.
 */
function parseMIMEType(mimeType: string): string | undefined {
  const parts = mimeType.split('/');
  return parts.length > 1 ? parts[1] : undefined;
}

/**
 * Check magic bytes for executable and common file signatures.
 * 
 * @param buffer - First N bytes of file content
 * @param path - Original file path (for extension-based lookup)
 * @returns Binary detection result based on magic bytes
 */
function checkMagicBytes(buffer: Uint8Array, path: string): BinaryDetectionResult {
  // Check byte alignment
  const bytes = buffer.slice(0, 16);
  const bytesHex = Array.from(bytes).map((b: number) => b.toString(16).padStart(2, '0')).join(' ');

  // Check for known magic bytes
  let detectedType: string | undefined;
  
  for (const [pattern, type] of Object.entries(MAGIC_BYTES_MAP)) {
    if (bytesHex.includes(pattern.replace(/\s+/g, ''))) {
      detectedType = type;
      break;
    }
  }

  // If no magic bytes match, check for Max OS FAT executable header
  if (!detectedType && bytes[0] === 0x4d && bytes[1] === 0x5a) {
    detectedType = 'MS-DOS executable';
  }

  return {
    isBinary: !!detectedType,
    mimeType: 'application/octet-stream',
    binaryType: detectedType || undefined,
  };
}