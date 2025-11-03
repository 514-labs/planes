/**
 * Chat Sidebar Component
 *
 * AI-powered chat interface for natural language queries to ClickHouse aircraft data.
 *
 * Features:
 * - Slide-out sidebar (810px wide) triggered from parent component
 * - Natural language input with auto-growing textarea
 * - Multi-iteration display showing Claude's reasoning process
 * - Collapsible SQL query display for transparency
 * - Formatted data tables with horizontal scrolling
 * - Real-time loading states with animated ellipsis
 * - Message history stored in-memory (resets on page reload)
 *
 * Backend Integration:
 * - POST to /chat/api/sendMessage
 * - Receives: { iterations: [{ text, sql, data }], response, sql, data }
 * - Each iteration displayed as separate message bubble
 * - Supports multi-step agentic reasoning (up to 5 iterations)
 *
 * User Experience:
 * - Enter: Send message
 * - Shift+Enter: New line in input
 * - Auto-scroll to latest message
 * - Empty state with example questions
 * - Error handling with user-friendly messages
 *
 * Props:
 * - open: boolean - Controls sidebar visibility
 * - onOpenChange: (open: boolean) => void - Callback when sidebar opens/closes
 */

"use client";

import * as React from "react";
import { SendIcon, BotIcon, UserIcon, ChevronDownIcon, DatabaseIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Message type definition
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sql?: string; // SQL query that was executed
  data?: Record<string, any>[]; // Query results
}

interface ChatSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatSidebar({ open, onOpenChange }: ChatSidebarProps) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  // Auto-resize textarea as user types
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px"; // Reset to min height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Call the backend chat API
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await fetch(`${baseUrl}/chat/api/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();

      // If we have iterations, add each as a separate message
      if (result.iterations && result.iterations.length > 0) {
        const newMessages: Message[] = result.iterations.map((iteration: any, index: number) => ({
          id: `${Date.now() + index + 1}`,
          role: "assistant" as const,
          content: iteration.text || "",
          timestamp: new Date(),
          sql: iteration.sql,
          data: iteration.data,
        }));

        setMessages((prev) => [...prev, ...newMessages]);
      } else {
        // Fallback to single message if no iterations
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.response || "I received your message but couldn't generate a response.",
          timestamp: new Date(),
          sql: result.sql,
          data: result.data,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Error calling chat API:", error);

      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. Please make sure the backend is running.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[810px] sm:!max-w-[810px] flex flex-col overflow-hidden p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>Chat with your data</SheetTitle>
          <SheetDescription>
            Ask questions about aircraft tracking data in natural language
          </SheetDescription>
        </SheetHeader>

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
          <div className="space-y-4 py-4 px-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                <BotIcon className="size-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground max-w-sm">
                  Start a conversation by asking questions about your aircraft
                  tracking data. For example:
                </p>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <p>"How many aircraft are being tracked?"</p>
                  <p>"Show me the highest flying aircraft"</p>
                  <p>"Which flights are on autopilot?"</p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {isLoading && <LoadingSkeleton />}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t bg-background shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your data..."
              disabled={isLoading}
              className="flex-1 min-h-[40px] max-h-[200px] resize-none overflow-y-auto"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e as any);
                }
              }}
            />
            <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
              <SendIcon className="size-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Message bubble component
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className="flex gap-3 flex-col w-full">
      <div
        className={cn(
          "flex gap-3",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        <Avatar className="size-8 shrink-0">
          <AvatarFallback
            className={cn(
              isUser ? "bg-primary text-primary-foreground" : "bg-muted"
            )}
          >
            {isUser ? (
              <UserIcon className="size-4" />
            ) : (
              <BotIcon className="size-4" />
            )}
          </AvatarFallback>
        </Avatar>

        <div
          className={cn(
            "rounded-lg px-4 py-2 max-w-[80%]",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
          <p className={cn("text-xs mt-1 opacity-70")}>
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* SQL and Data Display (only for assistant messages) */}
      {!isUser && (message.sql || message.data) && (
        <div className="ml-11 space-y-3 max-w-[calc(100%-3rem)]">
          {/* SQL Display */}
          {message.sql && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="sql" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-2 hover:no-underline">
                  <div className="flex items-center gap-2 text-sm">
                    <DatabaseIcon className="size-4" />
                    <span>View SQL Query</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3">
                  <pre className="text-xs bg-black/5 dark:bg-white/5 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-words">
                    <code>{message.sql}</code>
                  </pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* Data Display */}
          {message.data && message.data.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  Query Results
                  <Badge variant="secondary">
                    {message.data.length} row{message.data.length !== 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Data returned from ClickHouse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(message.data[0]).map((key) => (
                          <TableHead key={key} className="font-medium">
                            {key}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {message.data.map((row, idx) => (
                        <TableRow key={idx}>
                          {Object.values(row).map((value, cellIdx) => (
                            <TableCell key={cellIdx} className="font-mono text-xs">
                              {String(value)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Loading skeleton for when AI is thinking
function LoadingSkeleton() {
  return (
    <div className="flex gap-3">
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className="bg-muted">
          <BotIcon className="size-4" />
        </AvatarFallback>
      </Avatar>

      <div className="rounded-lg px-4 py-3 bg-muted max-w-[80%]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
}
