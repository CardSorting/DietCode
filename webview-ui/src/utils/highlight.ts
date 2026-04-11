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
 * Utility to highlight search matches by splitting strings into parts
 */
export function highlight<T extends { matches?: ReadonlyArray<{ indices: ReadonlyArray<Readonly<[number, number]>> }>; [key: string]: any }>(
  results: T[]
): Array<Omit<T, "matches"> & { parts: Array<{ text: string; highlighted: boolean }> }> {
  return results.map((result) => {
    const item = result as any;
    const baseItem = item.item || item;
    const textToHighlight = baseItem.id || baseItem.label || item.id || item.label || "";

    
    if (!item.matches || item.matches.length === 0) {
      return { 
        ...item, 
        parts: [{ text: textToHighlight, highlighted: false }] 
      };
    }

    // Extract all match indices from all matches
    const allIndices = new Set<number>();
    if (item.matches) {
      for (const match of item.matches) {
        if (match.indices) {
          for (const [start, end] of match.indices) {
            for (let i = start; i <= end; i++) {
              allIndices.add(i);
            }
          }
        }
      }
    }

    // Build parts with highlights
    const parts: Array<{ text: string; highlighted: boolean }> = [];
    const chars = textToHighlight.split("");
    
    let currentPart = "";
    let isCurrentHighlighted = allIndices.has(0);

    chars.forEach((char: string, index: number) => {
      const isHighlighted = allIndices.has(index);
      
      if (isHighlighted !== isCurrentHighlighted) {
        if (currentPart) {
          parts.push({ text: currentPart, highlighted: isCurrentHighlighted });
        }
        currentPart = char;
        isCurrentHighlighted = isHighlighted;
      } else {
        currentPart += char;
      }
    });

    if (currentPart) {
      parts.push({ text: currentPart, highlighted: isCurrentHighlighted });
    }

    // Strictly flatten: Use properties from baseItem, then overlay highlight parts
    const { matches, ...rest } = item;
    // By spreading baseItem last, we ensure its properties (id, label) are at the top level
    return { ...rest, ...baseItem, parts };
  });
}