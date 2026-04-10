/**
 * [LAYER: UI]
 * [SUB-ZONE: common]
 * Principle: Presentation layer - reusable UI components
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 */

import React from "react";

interface ChecklistRendererProps {
  items: Array<{ text: string; completed: boolean }>;
}

function ChecklistRenderer({ items }: ChecklistRendererProps) {
  return (
    <div className="checklist">
      {items.map((item, index) => (
        <div key={index} className={`checklist-item ${item.completed ? 'completed' : ''}`}>
          <input type="checkbox" checked={item.completed} readOnly />
          <span className="text-sm">{item.text}</span>
        </div>
      ))}
    </div>
  );
}

export default ChecklistRenderer;
