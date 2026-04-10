import type React from "react";
import { memo, useMemo, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileServiceClient } from "@/services/grpc-client";
import { StringRequest } from "@shared/nice-grpc/cline/common.ts";
import { Button } from "@/components/ui/button";
import { CheckIcon, CircleIcon, ExternalLinkIcon, CopyIcon, CheckCheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import MermaidBlock from "./MermaidBlock";

export const MarkdownRenderer = memo(({ content, compact, light }: { content: string; compact?: boolean; light?: boolean }) => {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                pre: ({ children }) => {
                    const code = (children as any)?.props?.children;
                    const lang = (children as any)?.props?.className;
                    if (lang?.includes("language-mermaid")) return <MermaidBlock code={String(code || "")} />;
                    return <CodeBlock code={String(code || "")} lang={lang} />;
                },
                code: (props) => {
                    if (props.className?.includes("language-mermaid")) return null;
                    return <InlineCode {...props} />;
                },
                img: ({ src, alt }) => <img src={src?.replace("vscode-resource:", "https://file+.vscode-resource.vscode-cdn.net")} alt={alt} className="max-w-full rounded-md shadow-sm border border-panel-border/30 my-2" />,
                li: ({ children, checked }) => {
                    if (checked !== null && checked !== undefined) {
                        return (
                            <div className="flex items-start gap-2 py-0.5">
                                <span className={cn("mt-1", checked ? "text-success" : "text-description")}>
                                    {checked ? <CheckIcon size={12}/> : <CircleIcon size={12}/>}
                                </span>
                                <div className={cn("text-sm", checked && "text-description line-through")}>{children}</div>
                            </div>
                        );
                    }
                    return <li className="ml-4 list-disc">{children}</li>;
                }
            }}
            className={cn("text-sm leading-relaxed whitespace-pre-wrap break-words", compact && "m-0", light ? "opacity-90" : "opacity-100")}
        >
            {content}
        </ReactMarkdown>
    );
});

const InlineCode = ({ children, ...props }: any) => {
    const [exists, setExists] = useState<boolean | null>(null);
    const path = String(children || "");
    const isPotentialPath = useMemo(() => /^(?!\/)[\w\-./]+(?<!\/)$/.test(path) && !path.includes("\n"), [path]);

    useEffect(() => {
        if (!isPotentialPath) return;
        FileServiceClient.ifFileExistsRelativePath(StringRequest.create({ value: path }))
            .then(res => setExists(res.value))
            .catch(() => setExists(false));
    }, [path, isPotentialPath]);

    if (exists) {
        return (
            <button onClick={() => FileServiceClient.openFileRelativePath({ value: path })} className="px-1 py-0.5 bg-primary/10 text-primary rounded-sm hover:bg-primary/20 transition-colors inline-flex items-center gap-1 font-mono text-[11px] align-baseline">
                {children} <ExternalLinkIcon size={10}/>
            </button>
        );
    }
    return <code className="bg-code px-1 py-0.5 rounded-sm font-mono text-[11px]" {...props}>{children}</code>;
};

const CodeBlock = ({ code, lang }: { code: string; lang?: string }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group/code my-3 rounded-md overflow-hidden border border-panel-border/50 bg-code">
            <div className="flex items-center justify-between px-3 py-1.5 bg-black/20 border-b border-panel-border/30">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">{lang?.replace("language-", "") || "code"}</span>
                <button onClick={handleCopy} className="text-description hover:text-foreground transition-colors p-1">
                    {copied ? <CheckCheckIcon size={12} className="text-success" /> : <CopyIcon size={12} />}
                </button>
            </div>
            <pre className="p-3 overflow-x-auto scrollbar-none text-[11px] font-mono leading-normal">
                <code>{code}</code>
            </pre>
        </div>
    );
};
