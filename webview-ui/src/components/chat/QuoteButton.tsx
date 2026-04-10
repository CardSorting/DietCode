import { Button } from "@/components/ui/button";
import { QuoteIcon } from "lucide-react";
import type React from "react";

interface QuoteButtonProps {
  top: number;
  left: number;
  onClick: () => void;
}

const QuoteButton: React.FC<QuoteButtonProps> = ({ top, left, onClick }) => {
  return (
    <div 
      className="absolute z-10" 
      style={{ top: `${top}px`, left: `${left}px` }}
    >
      <Button
        aria-label="Quote selection"
        className="p-3 h-auto min-w-auto rounded-md shadow-sm transition-transform hover:scale-105"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        size="sm"
        title="Quote selection in reply"
      >
        <QuoteIcon className="size-2 fill-button-foreground rotate-180 stroke-1" />
      </Button>
    </div>
  );
};

export default QuoteButton;
