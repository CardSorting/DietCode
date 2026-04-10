import type React from "react";
import { useState } from "react";
import { CheckCheckIcon, CopyIcon } from "lucide-react";

export const CODE_BLOCK_BG_COLOR = "var(--vscode-textCodeBlock-background, rgba(0,0,0,0.1))";

interface CodeBlockProps {
	source?: string;
	code?: string;
	lang?: string;
	forceWrap?: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ source, code, lang, forceWrap }) => {
	const [copied, setCopied] = useState(false);
	const displayCode = code || source?.replace(/```\w*\n?/, "").replace(/```$/, "") || "";
	const displayLang = lang || source?.match(/```(\w*)/)?.[1] || "code";

	const handleCopy = () => {
		navigator.clipboard.writeText(displayCode);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="relative group/code my-3 rounded-md overflow-hidden border border-panel-border/50 bg-code">
			<div className="flex items-center justify-between px-3 py-1.5 bg-black/20 border-b border-panel-border/30">
				<span className="text-[10px] font-bold uppercase tracking-widest opacity-40">{displayLang.replace("language-", "")}</span>
				<button type="button" onClick={handleCopy} className="text-description hover:text-foreground transition-colors p-1">
					{copied ? <CheckCheckIcon size={12} className="text-success" /> : <CopyIcon size={12} />}
				</button>
			</div>
			<pre className={`p-3 overflow-x-auto scrollbar-none text-[11px] font-mono leading-normal ${forceWrap ? "whitespace-pre-wrap break-all" : ""}`}>
				<code>{displayCode}</code>
			</pre>
		</div>
	);
};

export default CodeBlock;
