import type React from "react";
import CodeAccordian from "../common/CodeAccordian";

interface ExpandableCodeSectionProps {
  content: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  path?: string;
  language?: string;
}

export const ExpandableCodeSection: React.FC<ExpandableCodeSectionProps> = ({
  content,
  isExpanded,
  onToggleExpand,
  path,
  language,
}) => {
  return (
    <CodeAccordian
      code={content}
      isExpanded={isExpanded}
      language={language}
      onToggleExpand={onToggleExpand}
      path={path}
    />
  );
};
