import styled from "styled-components";
import type React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Mode } from "@shared/storage/types.ts";

const PLAN_MODE_COLOR = "var(--vscode-activityWarningBadge-background)";
const ACT_MODE_COLOR = "var(--vscode-focusBorder)";

const SwitchContainer = styled.div<{ disabled: boolean }>`
	display: flex;
	align-items: center;
	background-color: transparent;
	border: 1px solid var(--vscode-input-border);
	border-radius: 12px;
	overflow: hidden;
	cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
	opacity: ${(props) => (props.disabled ? 0.5 : 1)};
	transform: scale(1);
	transform-origin: right center;
	margin-left: 0;
	user-select: none;
`;

const Slider = styled.div.withConfig({
  shouldForwardProp: (prop) => !["isAct", "isPlan"].includes(prop),
})<{ isAct: boolean; isPlan?: boolean }>`
	position: absolute;
	height: 100%;
	width: 50%;
	background-color: ${(props) => (props.isPlan ? PLAN_MODE_COLOR : ACT_MODE_COLOR)};
	transition: transform 0.2s ease;
	transform: translateX(${(props) => (props.isAct ? "100%" : "0%")});
`;

interface ChatInputModeSwitchProps {
  mode: Mode;
  onModeToggle: () => void;
  togglePlanKeys: string;
}

export const ChatInputModeSwitch: React.FC<ChatInputModeSwitchProps> = ({
  mode,
  onModeToggle,
  togglePlanKeys,
}) => {
  return (
    <div className="flex flex-col gap-1">
      <Tooltip>
        <TooltipContent
          className="text-xs px-2 flex flex-col gap-1"
          side="top"
        >
          {`In ${mode === "act" ? "Act" : "Plan"} mode, DietCode will ${mode === "act" ? "complete the task immediately" : "gather information to architect a plan"}`}
          <p className="text-description/80 text-xs mb-0">
            Hold <kbd>{togglePlanKeys}</kbd> to toggle
          </p>
        </TooltipContent>
        <TooltipTrigger>
          <SwitchContainer
            data-testid="mode-switch"
            disabled={false}
            onClick={onModeToggle}
          >
            <div className="relative flex items-center h-6 w-20">
              <Slider isAct={mode === "act"} isPlan={mode === "plan"} />
              <div
                className={`flex-1 text-center text-[9.5px] font-bold z-10 transition-colors duration-200 ${
                  mode === "plan" ? "text-white" : "text-description"
                }`}
              >
                PLAN
              </div>
              <div
                className={`flex-1 text-center text-[9.5px] font-bold z-10 transition-colors duration-200 ${
                  mode === "act" ? "text-white" : "text-description"
                }`}
              >
                ACT
              </div>
            </div>
          </SwitchContainer>
        </TooltipTrigger>
      </Tooltip>
    </div>
  );
};
