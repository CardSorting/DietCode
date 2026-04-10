/**
 * [LAYER: PLUMBING]
 * [SUB-ZONE: utilities]
 * Principle: Zero-dependency stateless helpers
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 */

/**
 * Utility to highlight search matches in HTML strings
 */
export function highlight<T extends { matches?: Array<{ indices: number[][] }>; [key: string]: any }>(
  results: T[],
  className: string
): Array<T & { html: string }> {
  return results.map((item) => {
    if (!item.matches || item.matches.length === 0) {
      return item;
    }

    // Extract all match indices from all matches
    const allIndices = new Set<number>();
    item.matches.forEach((match: any) => {
      if (match.indices) {
        match.indices.forEach(([start, end]) => {
          for (let i = start; i <= end; i++) {
            allIndices.add(i);
          }
        });
      }
    });

    // Build HTML with highlights
    const items = item.original?.split("") || [];
    const highlighted = items.map((char: string, index: number) => {
      return allIndices.has(index) ? `<span class="${className}">${char}</span>` : char;
    }).join("");

    // Preserve the original matched item reference
    const { original, matches, ...rest } = item;
    return { ...rest, html: highlighted };
  });
}