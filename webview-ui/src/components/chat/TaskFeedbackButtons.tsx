import { cn } from "@/lib/utils";
import { TaskServiceClient } from "@/services/grpc-client";
import type { TaskFeedbackType } from "@shared/WebviewMessage.ts";
import { StringRequest } from "@shared/nice-grpc/cline/common.ts";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import type React from "react";
import { useEffect, useState } from "react";

interface TaskFeedbackButtonsProps {
  messageTs: number;
  isFromHistory?: boolean;
  classNames?: string;
}

const TaskFeedbackButtons: React.FC<TaskFeedbackButtonsProps> = ({
  messageTs,
  isFromHistory = false,
  classNames,
}) => {
  const [feedback, setFeedback] = useState<TaskFeedbackType | null>(null);
  const [shouldShow, setShouldShow] = useState<boolean>(true);

  // Check localStorage on mount to see if feedback was already given for this message
  useEffect(() => {
    try {
      const feedbackHistory = localStorage.getItem("taskFeedbackHistory") || "{}";
      const history = JSON.parse(feedbackHistory);
      if (history[messageTs]) setShouldShow(false);
    } catch (e) {
      console.error("Error checking feedback history:", e);
    }
  }, [messageTs]);

  if (isFromHistory || !shouldShow) return null;

  const handleFeedback = async (type: TaskFeedbackType) => {
    if (feedback !== null) return;
    setFeedback(type);
    try {
      await TaskServiceClient.taskFeedback(StringRequest.create({ value: type }));
      const feedbackHistory = localStorage.getItem("taskFeedbackHistory") || "{}";
      const history = JSON.parse(feedbackHistory);
      history[messageTs] = true;
      localStorage.setItem("taskFeedbackHistory", JSON.stringify(history));
    } catch (error) {
      console.error("Error sending task feedback:", error);
    }
  };

  return (
    <div className={cn("flex items-center justify-end shrink-0", classNames)}>
      <div className="flex gap-0 opacity-50 hover:opacity-100 transition-opacity">
        <div className="scale-[0.85]">
          <VSCodeButton
            appearance="icon"
            aria-label="This was helpful"
            disabled={feedback !== null}
            onClick={() => handleFeedback("thumbs_up")}
            title="This was helpful"
          >
            <span className="text-description">
              <span className={cn("codicon", feedback === "thumbs_up" ? "codicon-thumbsup-filled" : "codicon-thumbsup")} />
            </span>
          </VSCodeButton>
        </div>
        <div className="scale-[0.85]">
          <VSCodeButton
            appearance="icon"
            aria-label="This wasn't helpful"
            disabled={feedback !== null && feedback !== "thumbs_down"}
            onClick={() => handleFeedback("thumbs_down")}
            title="This wasn't helpful"
          >
            <span className="text-description">
              <span className={cn("codicon", feedback === "thumbs_down" ? "codicon-thumbsdown-filled" : "codicon-thumbsdown")} />
            </span>
          </VSCodeButton>
        </div>
      </div>
    </div>
  );
};

export default TaskFeedbackButtons;

export default TaskFeedbackButtons;
