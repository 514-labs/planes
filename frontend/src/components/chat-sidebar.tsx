/**
 * Chat Sidebar Component
 *
 * AI-powered chat interface for natural language queries to ClickHouse aircraft data.
 *
 * Features:
 * - Slide-out sidebar (810px wide) triggered from parent component
 * - Natural language input with auto-growing textarea
 * - Streaming responses with tool call visualization
 * - Collapsible SQL query display for transparency
 * - Formatted data tables with horizontal scrolling
 * - Real-time loading states with animated dots
 * - Message history with AI SDK's useChat hook
 *
 * Backend Integration:
 * - Uses Next.js API route at /api/chat
 * - Streaming responses via Vercel AI SDK
 * - Integrates with MCP server for ClickHouse queries
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
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageSquare, X, AlertTriangle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatOutputArea } from "./chat/chat-output-area";
import { ChatInput } from "./chat/chat-input";
import { SuggestedPrompt } from "./chat/suggested-prompt";
import { useAnthropicStatus } from "@/hooks/use-anthropic-status";
import { useState } from "react";

function MissingKeyMessage() {
  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border rounded-lg p-6 max-w-md mx-4 text-center shadow-lg">
        <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Anthropic Key Missing</h3>
        <p className="text-muted-foreground mb-4">
          Please add your ANTHROPIC_API_KEY to your .env.local file to use the chat feature.
        </p>
      </div>
    </div>
  );
}

interface ChatSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatSidebar({ open, onOpenChange }: ChatSidebarProps) {
  const { data: anthropicStatus, isLoading: isStatusLoading } =
    useAnthropicStatus();

  const [toolTimings, setToolTimings] = useState<Record<string, number>>({});
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    onData: (data: any) => {
      if (data.type === "data-tool-timing") {
        const { toolCallId, duration } = data.data as {
          toolCallId: string;
          duration: number;
        };
        setToolTimings((prev) => ({
          ...prev,
          [toolCallId]: duration,
        }));
      }
    },
  });

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
  }, [messages, status]);

  const handleSuggestedPromptClick = (prompt: string) => {
    sendMessage({ text: prompt });
  };

  const handleSendMessage = (text: string) => {
    sendMessage({ text });
  };

  const isEmptyState = messages.length === 0;
  const showKeyMissingOverlay =
    !isStatusLoading &&
    anthropicStatus &&
    !anthropicStatus.anthropicKeyAvailable;

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
            <ChatOutputArea
              messages={messages}
              status={status}
              toolTimings={toolTimings}
            />
          </div>
        </ScrollArea>

        {isEmptyState && (
          <SuggestedPrompt onPromptClick={handleSuggestedPromptClick} />
        )}

        <ChatInput sendMessage={handleSendMessage} status={status} />

        {/* Overlay when Anthropic key is missing */}
        {showKeyMissingOverlay && <MissingKeyMessage />}
      </SheetContent>
    </Sheet>
  );
}
