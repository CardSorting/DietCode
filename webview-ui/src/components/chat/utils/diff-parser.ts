export interface Patch {
  action: string;
  path: string;
  lines: string[];
  additions: number;
  deletions: number;
}

export const MARKERS = {
  SEARCH_BLOCK: "------- SEARCH",
  SEARCH_SEPARATOR: "=======",
  REPLACE_BLOCK: "+++++++ REPLACE",
  NEW_BEGIN: "*** Begin Patch",
  NEW_END: "*** End Patch",
  FILE_PATTERN: /^\*\*\* (Add|Update|Delete) File: (.+)$/m,
} as const;

export interface ParseResult {
  parsedFiles: Patch[];
  isStreaming: boolean;
}

/**
 * Main parsing function that detects format and delegates to appropriate parser
 */
export function parsePatch(patch: string, path: string): ParseResult {
  if (patch.includes(MARKERS.SEARCH_BLOCK)) {
    const results = parseAllSearchReplaceBlocks(patch, path);
    if (results.length > 0) {
      const replaceCount = (patch.match(/\+{7,} REPLACE/g) || []).length;
      const searchCount = (patch.match(/-{7,} SEARCH/g) || []).length;
      return {
        parsedFiles: results,
        isStreaming: replaceCount < searchCount,
      };
    }
  }

  if (patch.includes(MARKERS.NEW_BEGIN)) {
    const endIndex = patch.indexOf(MARKERS.NEW_END);
    const isComplete = endIndex !== -1;
    const beginIndex = patch.indexOf(MARKERS.NEW_BEGIN);
    const contentStart = beginIndex + MARKERS.NEW_BEGIN.length;
    const contentEnd = isComplete ? endIndex : patch.length;
    const patchContent = patch.substring(contentStart, contentEnd).trim();
    const parsed = parseNewFormat(patchContent);
    if (parsed.length > 0) return { parsedFiles: parsed, isStreaming: !isComplete };
  }

  if (path && patch) {
    const lines = patch.split("\n");
    return {
      parsedFiles: [
        {
          action: "Add",
          path,
          lines: lines.map((line) => `+ ${line}`),
          additions: lines.length,
          deletions: 0,
        },
      ],
      isStreaming: true,
    };
  }

  return { parsedFiles: [], isStreaming: true };
}

function parseNewFormat(content: string): Patch[] {
  const files: Patch[] = [];
  const lines = content.split("\n");
  let currentFile: { action: string; path: string } | null = null;
  let currentChunk: Patch | null = null;

  const pushCurrentChunk = () => {
    if (currentChunk && currentChunk.lines.length > 0) files.push(currentChunk);
  };

  for (const line of lines) {
    const fileMatch = line.match(/^\*\*\* (Add|Update|Delete) File: (.+)$/);
    if (fileMatch) {
      pushCurrentChunk();
      currentFile = { action: fileMatch[1], path: fileMatch[2].trim() };
      currentChunk = null;
    } else if (line.trim() === "@@") {
      if (!currentFile) continue;
      pushCurrentChunk();
      currentChunk = { action: currentFile.action, path: currentFile.path, lines: [], additions: 0, deletions: 0 };
    } else if (currentFile && line.trim()) {
      if (!currentChunk) currentChunk = { action: currentFile.action, path: currentFile.path, lines: [], additions: 0, deletions: 0 };
      currentChunk.lines.push(line);
      if (line[0] === "+") currentChunk.additions++;
      else if (line[0] === "-") currentChunk.deletions++;
    }
  }
  pushCurrentChunk();
  return files;
}

function parseAllSearchReplaceBlocks(patch: string, path: string): Patch[] {
  const results: Patch[] = [];
  const searchRegex = /-{7,} SEARCH/g;
  let match: RegExpExecArray | null;
  const searchPositions: number[] = [];
  while ((match = searchRegex.exec(patch)) !== null) searchPositions.push(match.index);

  for (let i = 0; i < searchPositions.length; i++) {
    const start = searchPositions[i];
    const end = i < searchPositions.length - 1 ? searchPositions[i + 1] : patch.length;
    const blockContent = patch.substring(start, end);
    const parsed = parseSearchReplaceFormat(blockContent, path);
    if (parsed) results.push(parsed);
  }
  return results;
}

function parseSearchReplaceFormat(patch: string, path: string): Patch | undefined {
  const searchIndex = patch.indexOf(MARKERS.SEARCH_BLOCK);
  if (searchIndex === -1) return undefined;
  const fileMatch = patch.match(MARKERS.FILE_PATTERN);
  const result: Patch = {
    action: fileMatch?.[1] ?? "Update",
    path: fileMatch?.[2]?.trim() ?? path ?? "",
    lines: [],
    additions: 0,
    deletions: 0,
  };
  const afterSearch = patch.substring(searchIndex + MARKERS.SEARCH_BLOCK.length).replace(/^\r?\n/, "");
  const separatorIndex = afterSearch.indexOf(MARKERS.SEARCH_SEPARATOR);
  if (separatorIndex === -1) {
    addLinesToPatch(result, afterSearch.trimEnd(), "-");
    return result;
  }
  addLinesToPatch(result, afterSearch.substring(0, separatorIndex).replace(/\r?\n$/, ""), "-");
  const afterSeparator = afterSearch.substring(separatorIndex + MARKERS.SEARCH_SEPARATOR.length).replace(/^\r?\n/, "");
  const replaceEndIndex = afterSeparator.indexOf(MARKERS.REPLACE_BLOCK);
  const replaceContent = replaceEndIndex !== -1 ? afterSeparator.substring(0, replaceEndIndex).replace(/\r?\n$/, "") : afterSeparator.trimEnd();
  addLinesToPatch(result, replaceContent, "+");
  return result;
}

function addLinesToPatch(patch: Patch, content: string, prefix: "+" | "-"): void {
  const lines = content.split("\n");
  for (const line of lines) {
    patch.lines.push(`${prefix} ${line}`);
    if (prefix === "+") patch.additions++;
    else patch.deletions++;
  }
}
