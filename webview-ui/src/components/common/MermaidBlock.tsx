import { FileServiceClient } from "@/services/grpc-client";
import { StringRequest } from "@shared/nice-grpc/cline/common.ts";
import mermaid from "mermaid";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyIcon, DownloadIcon } from "lucide-react";

mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "loose",
    themeVariables: { 
        fontSize: "14px", 
        fontFamily: "monospace",
        background: "#1e1e1e"
    }
});

export default function MermaidBlock({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const render = async () => {
        if (!containerRef.current) return;
        try {
            containerRef.current.innerHTML = "";
            const id = `m-${Math.random().toString(36).slice(2)}`;
            const { svg } = await mermaid.render(id, code);
            containerRef.current.innerHTML = svg;
            setError(null);
        } catch (e) {
            console.warn("Mermaid error:", e);
            setError("Failed to render diagram");
        }
    };
    render();
  }, [code]);

  const handleExport = async () => {
      const svg = containerRef.current?.querySelector("svg");
      if (!svg) return;
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const base64 = btoa(unescape(encodeURIComponent(svgString)));
      const dataUrl = `data:image/svg+xml;base64,${base64}`;
      // In a real app, we'd convert to PNG, but for lean code we'll just open the SVG URL if supported
      FileServiceClient.openImage(StringRequest.create({ value: dataUrl }));
  };

  return (
    <div className="relative group/mermaid my-4 p-4 bg-black/20 rounded-lg border border-panel-border/30 overflow-hidden">
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/mermaid:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigator.clipboard.writeText(code)}><CopyIcon size={12}/></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleExport}><DownloadIcon size={12}/></Button>
        </div>
        {error ? <pre className="text-[10px] opacity-30 whitespace-pre-wrap">{code}</pre> : <div ref={containerRef} className="flex justify-center" />}
    </div>
  );
}
