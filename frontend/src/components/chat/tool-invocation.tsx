import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle,
  AlertCircle,
  Wrench,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

function formatDuration(milliseconds: number): string {
  if (milliseconds < 5000) {
    return `${Math.round(milliseconds)}ms`;
  }
  return `${Math.round(milliseconds / 1000)}s`;
}

type ToolInvocationProps = {
  part: {
    type: `tool-${string}`;
    toolCallId: string;
    state:
      | "input-streaming"
      | "input-available"
      | "output-available"
      | "output-error";
    input?: any;
    output?: any;
    errorText?: string;
    providerExecuted?: boolean;
  };
  timing?: number;
};

export function ToolInvocation({ part, timing }: ToolInvocationProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toolName = part.type.startsWith("tool-")
    ? part.type.slice(5)
    : part.type;

  const isLoading = part.state === "input-streaming";

  const getStatusIcon = () => {
    if (part.state === "input-streaming") {
      return (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600 dark:text-blue-400" />
      );
    }
    if (part.state === "output-error") {
      return <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />;
    }
    if (part.state === "output-available") {
      return (
        <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
      );
    }
    return null;
  };

  // Extract SQL query from input if available
  const sqlQuery = part.input?.query;

  // Extract data from output if available
  const toolOutput = part.output;
  const rows = toolOutput?.rows || [];

  return (
    <div
      className={cn(
        "mt-2 rounded-lg border transition-all duration-200 border-border overflow-hidden",
        isLoading && "opacity-50"
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 p-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors",
              isLoading && "text-muted-foreground"
            )}
          >
            <ChevronRight
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                isOpen && "rotate-90"
              )}
            />
            <Wrench
              className={cn(
                "w-4 h-4",
                isLoading
                  ? "text-muted-foreground"
                  : "text-blue-600 dark:text-blue-400"
              )}
            />
            <span
              className={cn(
                "text-sm font-medium transition-colors",
                isLoading ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {toolName || "Unknown Tool"}
            </span>

            <div className="flex-1" />

            {part.state === "output-available" && timing && (
              <Badge variant="secondary" className="text-xs mr-2">
                {formatDuration(timing)}
              </Badge>
            )}

            {getStatusIcon()}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div
            className={cn(
              "px-3 pb-3 space-y-3 border-t border-border/50 transition-opacity duration-200",
              isLoading && "opacity-60"
            )}
          >
            {/* SQL Query Display */}
            {sqlQuery && (
              <div className="pt-3">
                <div className="text-sm text-muted-foreground mb-2">SQL Query:</div>
                <pre className="text-xs bg-black/5 dark:bg-white/5 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-words font-mono">
                  <code>{sqlQuery}</code>
                </pre>
              </div>
            )}

            {/* Input Display */}
            {part.input && !sqlQuery && (
              <div className="pt-3">
                <div className="text-sm text-muted-foreground mb-2">Input:</div>
                <pre className="text-xs bg-black/5 dark:bg-white/5 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-words font-mono">
                  <code>{JSON.stringify(part.input, null, 2)}</code>
                </pre>
              </div>
            )}

            {/* Data Table Display */}
            {rows.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-muted-foreground">
                    Query Results ({rows.length} row{rows.length !== 1 ? "s" : ""}):
                  </span>
                </div>
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        {Object.keys(rows[0]).map((key) => (
                          <th
                            key={key}
                            className="px-3 py-2 text-left font-medium"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 20).map((row: any, idx: number) => (
                        <tr key={idx} className="border-b">
                          {Object.values(row).map((value: any, cellIdx: number) => (
                            <td key={cellIdx} className="px-3 py-2 font-mono">
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length > 20 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Showing first 20 of {rows.length} rows
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Output Display (fallback if no rows) */}
            {toolOutput && rows.length === 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-muted-foreground">Output:</span>
                </div>
                <pre className="text-xs bg-black/5 dark:bg-white/5 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-words font-mono">
                  <code>
                    {typeof toolOutput === "string"
                      ? toolOutput
                      : JSON.stringify(toolOutput, null, 2)}
                  </code>
                </pre>
              </div>
            )}

            {/* Error Display */}
            {part.errorText && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-red-700 dark:text-red-300">
                    Error:
                  </span>
                </div>
                <div className="text-sm text-red-700 dark:text-red-300 bg-red-50/50 dark:bg-red-950/20 p-3 rounded border border-red-200/50 dark:border-red-800/30">
                  {part.errorText}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}


